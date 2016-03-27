var fs = require('fs');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var opener = require('opener');
var async = require('async');

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
    console.log('Youtube API is ready to use');
    _isReady = true;
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
            console.log('Get stored token');
            
            getLiveBroadcast();
        }
    });
}

function getNewToken() {
    var authUrl = _auth.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        approval_prompt: 'force'
    });

    console.log('Please select your Youtube account to get a token and use the API.');
    opener(authUrl);
}

function refreshToken() {
    console.log('Refresh token');

    _auth.refreshAccessToken(function(err, token){
        if (err) {
            console.log('Error trying to get a refreshed token: ' + err)
        } else {
            _auth.credentials = token; 
            storeToken(token);

            getLiveBroadcast();
        }
    })
}

function getToken(code) {
    _auth.getToken(code, function(err, token) {
        if (err) {
            console.log('Error while trying to retrieve access token', err);
            return;
        }

        console.log(token);
        _auth.credentials = token;
        storeToken(token);

        getLiveBroadcast();
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
  console.log('Token stored to ' + TOKEN_PATH);
}

function getLiveBroadcast() {
    var isLive = false;
    var apiError = false;

    async.whilst(
    function () { return !isLive && !apiError; },
    function (callback) {
        _youtube.liveBroadcasts.list({
            auth: _auth,
            part: 'snippet',
            broadcastStatus: 'active',
            broadcastType: 'all'
        }, function(error, response) {
            if (error) {
                console.log('The API returned an error: ' + error);
                getNewToken();
                apiError = true;
            } else {
                var liveBroadcasts = response.items;
                if (liveBroadcasts.length > 0) {
                    var liveBroadcast = liveBroadcasts[0];
                    console.log('Live broadcast found');
                    console.log('Title: ' + liveBroadcast.snippet.title);
                    console.log('Description: ' + liveBroadcast.snippet.description);

                    _liveChatId = liveBroadcast.snippet.liveChatId;
                    isLive = true;
                }
            }
        });

        setTimeout(callback, 1000);
    },
    function () {
        if (!apiError)
            ready();
    });
}

function getNewMessages(callback) {
    _youtube.liveChatMessages.list({
        auth: _auth,
        part: 'snippet,authorDetails',
        liveChatId: _liveChatId
    }, function(error, response) {
        if (error) {
            console.log('The API returned an error: ' + error);
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
                _lastCheckTime = chatMessages[chatMessages.length - 1].date;

            callback(chatMessages);
        }
    });
}

exports.initialize = initialize;
exports.isReady = isReady;
exports.getToken = getToken;
exports.getNewMessages = getNewMessages;