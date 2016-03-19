

var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

var youtube = google.youtube('v3');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/youtube-nodejs-quickstart.json
var SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl'
];

var TOKEN_DIR = '.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'youtube-nodejs-quickstart.json';

// Load client secrets from a local file.
fs.readFile('config.json', function processClientSecrets(err, content) {
    if (err) {
        console.log('Error loading client secret file: ' + err);
        return;
    }

    // Authorize a client with the loaded credentials, then call the
    // Youtube API.
    authorize(JSON.parse(content), listLiveBroadcast);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    var clientSecret = credentials.youtube.client_secret;
    var clientId = credentials.youtube.client_id;
    var redirectUrl = credentials.youtube.redirect_uris[0];
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
            console.log('Ask for a new token => ' + oauth2Client.credentials);
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            console.log('Get stored token:');
            console.log(oauth2Client.credentials);
            callback(oauth2Client);
        }
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });

    console.log('Authorize this app by visiting this url: ', authUrl);

    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Enter the code from that page here: ', function(code) {
        rl.close();
        oauth2Client.getToken(code, function(err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
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

/**
 * Lists the active live broadcasts.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listLiveBroadcast(auth) {
  youtube.liveBroadcasts.list({
        auth: auth,
        part: 'snippet',
        broadcastStatus: 'active',
        broadcastType: 'all'
    }, function(error, response) {
    if (error) {
      console.log('The API returned an error: ' + error);
      return;
    }
    var liveBroadcasts = response.items;
    if (liveBroadcasts.length == 0) {
      console.log('No live broadcast found.');
    } else {
      console.log('Live liveBroadcasts:');
      for (var i = 0; i < liveBroadcasts.length; i++) {
        var liveBroadcast = liveBroadcasts[i];
        console.log('%s (%s)', liveBroadcast.etag, liveBroadcast.id);

        var liveChatId = liveBroadcast.snippet.liveChatId;
        listMessages(auth, liveChatId);
      }
    }
  })
}

/**
 * Lists all messages of a live broadcast
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 * @param {string} liveChatId The ID of the chat.
 */
function listMessages(auth, liveChatId) {
    youtube.liveChatMessages.list({
        auth: auth,
        part: 'snippet,authorDetails',
        liveChatId: liveChatId
    }, function(error, response) {
        if (error) {
            console.log('The API returned an error: ' + error);
            return;
        }

        var messages = response.items;
        if (messages.length == 0) {
          console.log('No message found for this live broadcast.');
        } else {
          console.log('Messages:');
          for (var i = 0; i < messages.length; i++) {
            var message = messages[i];
            console.log('%s: %s', message.authorDetails.displayName, message.snippet.textMessageDetails.messageText);
          }
        }
    });
}