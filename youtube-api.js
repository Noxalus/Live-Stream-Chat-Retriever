var fs = require('fs');
var readline = require('readline');
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

function initialize() {
    // Load client secrets from a local file.
    fs.readFile('config.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }

        // Authorize a client with the loaded credentials, then call the Youtube API.
        authorize(JSON.parse(content));
    });
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
        scope: SCOPES
    });

    console.log('Please select your Youtube account to get a token and use the API.');
    opener(authUrl);
}

function getToken(code) {
    _auth.getToken(code, function(err, token) {
        if (err) {
            console.log('Error while trying to retrieve access token', err);
            return;
        }

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
                if (liveBroadcasts.length == 0) {
                    console.log('No live broadcast found.');
                } else {
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
            return;
        }

        var messages = response.items;
        var youtubeMessages = [];

        if (messages.length > 0) {
            for (var i = 0; i < messages.length; i++) {
                var message = messages[i];
                var messageTimestamp = new Date(message.snippet.publishedAt).getTime();

                if (_lastCheckTime < messageTimestamp)
                {
                    var youtubeMessage = {
                        author: message.authorDetails.displayName,
                        message: message.snippet.textMessageDetails.messageText,
                        source: 'youtube',
                        date: messageTimestamp
                    };

                    youtubeMessages.push(youtubeMessage);
                }
            }

            if (youtubeMessages.length > 0)
                _lastCheckTime = youtubeMessages[youtubeMessages.length - 1].date;

            callback(youtubeMessages);
        }
    });
}

exports.initialize = initialize;
exports.isReady = isReady;
exports.getToken = getToken;
exports.getNewMessages = getNewMessages;