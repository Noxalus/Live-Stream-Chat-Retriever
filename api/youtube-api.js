var fs = require('fs');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var opener = require('opener');
var winston = require('winston');

var SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl'
];
var TOKEN_DIR = '.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'youtube-credentials.json';

var _youtube = google.youtube('v3');
var _liveChatId = '';
var _isReady = false;
var _lastCheckTime = new Date().getTime();
var _auth = null;
var _userColorsMap = {};
var _newMessages = [];
var _liveBroadcastPollingStarted = false;
var _messagePollingStarted = false;
var _noLiveBroadcastFound = false;

function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }

    return color;
}

function initialize(config) {
    authorize(config);
}

function ready() {
    winston.info('Youtube API is ready to use', { source: 'youtube' });
    _isReady = true;

    _newMessages.push({
        type: 'system',
        source: 'youtube',
        date: new Date().getTime(),
        message: 'ready|true'
    });

    startMessagePolling();
}

function isReady() {
    return _isReady;
}

function authorize(credentials) {
    var clientSecret = credentials.live_data.youtube.client_secret;
    var clientId = credentials.live_data.youtube.client_id;
    var redirectUrl = credentials.live_data.youtube.redirect_uris[0];
    var auth = new googleAuth();

    _auth = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
            getNewToken();
        } else {
            _auth.credentials = JSON.parse(token);
            winston.info('Get stored token', { source: 'youtube' });
            
            startLiveBroadcastPolling();
        }
    });
}

function getNewToken() {
    var authUrl = _auth.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        approval_prompt: 'force'
    });

    winston.info('Please select your Youtube account to get a token and use the API.', { source: 'youtube' });
    // opener(authUrl);
    _newMessages.push({
        type: 'system',
        source: 'youtube',
        date: new Date().getTime(),
        message: 'auth-url|' + authUrl
    });
}

function refreshToken() {
    winston.info('Refresh token', { source: 'youtube' });

    _auth.refreshAccessToken(function(err, token){
        if (err) {
            winston.error('Error trying to get a refreshed token: ' + err, { source: 'youtube' })
        } else {
            _auth.credentials = token; 
            storeToken(token);

            startLiveBroadcastPolling();
        }
    })
}

function getToken(code) {
    _auth.getToken(code, function(err, token) {
        if (err) {
            winston.error('Error while trying to retrieve access token', { source: 'youtube' });
            winston.error(err, { source: 'youtube' });
            return;
        }

        winston.info(token, { source: 'youtube' });
        _auth.credentials = token;
        storeToken(token);

        startLiveBroadcastPolling();
    });
}

function storeToken(token) {
    try {
        fs.mkdirSync(TOKEN_DIR);
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err;
        }
    }

  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  winston.info('Token stored to ' + TOKEN_PATH, { source: 'youtube' });
}

function getLiveBroadcast() {
    _youtube.liveBroadcasts.list({
        auth: _auth,
        part: 'snippet',
        broadcastStatus: 'active',
        broadcastType: 'all'
    }, function(error, response) {
        if (error) {
            winston.error('The API returned an error: ' + error, { source: 'youtube' });
            getNewToken();
        } else {
            var liveBroadcasts = response.items;
            if (liveBroadcasts.length > 0) {
                if (_isReady)
                    return;

                _noLiveBroadcastFound = false;
                var liveBroadcast = liveBroadcasts[0];
                winston.info('Live broadcast found', { source: 'youtube' });
                winston.info('Title: ' + liveBroadcast.snippet.title, { source: 'youtube' });
                winston.info('Description: ' + liveBroadcast.snippet.description, { source: 'youtube' });

                _liveChatId = liveBroadcast.snippet.liveChatId;

                ready();
            }
            else if (!_noLiveBroadcastFound)
            {
                if (_isReady)
                {
                    _isReady = false;

                    _newMessages.push({
                        type: 'system',
                        source: 'youtube',
                        date: new Date().getTime(),
                        message: 'ready|false'
                    });
                }

                _noLiveBroadcastFound = true;
                var errorMessage = 'No broadcast live detected';

                winston.error(errorMessage, { source: 'youtube' });

                _newMessages.push({
                    type: 'system',
                    source: 'youtube',
                    date: new Date().getTime(),
                    message: 'error|' + errorMessage
                });
            }
        }
    });
}

function getNewMessages() {
    if (_newMessages.length == 0)
        return [];

    var newMessage = _newMessages;
    _newMessages = [];

    return newMessage;
}

function getChatMessages() {
    if (!_isReady)
        return;

    _youtube.liveChatMessages.list({
        auth: _auth,
        part: 'snippet,authorDetails',
        liveChatId: _liveChatId
    }, function(error, response) {
        if (error) {
            winston.error('The API returned an error: ' + error, { source: 'youtube' });
            refreshToken();
            return;
        }

        var messages = response.items;
        var chatMessages = [];

        if (messages.length > 0) {
            for (var i = 0; i < messages.length; i++) {
                var message = messages[i];

                if (message.snippet.type == 'textMessageEvent') {
                    var messageTimestamp = new Date(message.snippet.publishedAt).getTime();

                    if (_lastCheckTime < messageTimestamp)
                    {
                        var author = message.authorDetails.displayName;

                        if (!(author in _userColorsMap))
                            _userColorsMap[author] = getRandomColor();

                        var chatMessage = {
                            type: 'chat',
                            author: author,
                            message: message.snippet.textMessageDetails.messageText,
                            source: 'youtube',
                            date: messageTimestamp,
                            color: _userColorsMap[author]
                        };

                        chatMessages.push(chatMessage);
                    }
                }
            }

            if (chatMessages.length > 0)
            {
                _newMessages = _newMessages.concat(chatMessages);
                _lastCheckTime = chatMessages[chatMessages.length - 1].date;
            }
        }
    });
}

function startLiveBroadcastPolling() {
    if (!_liveBroadcastPollingStarted) {
        _liveBroadcastPollingStarted = true;
        setInterval(getLiveBroadcast, 1000);
    }
}

function startMessagePolling() {
    if (!_messagePollingStarted) {
        _messagePollingStarted = true;
        setInterval(getChatMessages, 1000);
    }
}

exports.initialize = initialize;
exports.isReady = isReady;
exports.getToken = getToken;
exports.getNewMessages = getNewMessages;