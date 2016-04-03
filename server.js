var http = require('http');
var express = require('express');
var socketio = require('socket.io');
var async = require('async');
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var winston = require('winston');

// Setup the logger
winston.addColors({
    debug: 'green',
    info: 'cyan',
    silly: 'magenta',
    warn:  'yellow',
    error: 'red'
});

winston.add(winston.transports.File, { 
    name: 'info', 
    filename: './logs/info.log', 
    level: 'info',
    colorize: true
});

winston.add(winston.transports.File, { 
    name: 'error', 
    filename: './logs/error.log', 
    level: 'error',
    colorize: true 
});

var youtubeApi = require('./api/youtube-api');
var twitchApi = require('./api/twitch-api');

var chatMessageId = 0;
var chatMessages = [];
var systemMessages = [];

function run(config) {
    // Initialize all APIs
    if (config.live_data.youtube.enabled)
        youtubeApi.initialize(config);

    if (config.live_data.twitch.enabled)
        twitchApi.initialize(config);

    var app = express();
    app.use(express.static('public'));

    var server = http.Server(app);
    var io = socketio(server);

    io.on('connection', function(socket) {
        winston.info('Someone has connected to the chat');
        socket.emit('connected');

        // Send only the last 10 messages
        chatMessagesToSend = chatMessages.slice(Math.max(chatMessages.length - 10, 0));
        chatMessagesToSend.forEach(function(elt) {
            io.emit('newChatMessage', elt);                
        });

        // Send system messages
        systemMessages.forEach(function(elt) {
            io.emit('newSystemMessage', elt);                
        });
    });

    app.get('/', function(req, res) {
        res.sendFile(path.join(__dirname, '/public/chat.html'));
    });

    config.live_data.youtube.redirect_uris.forEach(function(elt) {
        var endpoint = elt.replace(config.host + ':' + config.port, '');
        app.get(endpoint, function(req, res){
          youtubeApi.getToken(req.query.code);
          res.redirect('/');
        });
    });

    server.listen(config.port, function() {
        winston.info('listening on *: ' + config.port);
    });

    // Retrieve new messages
    var newMessages = [];
    async.forever(
        function(next) {

            if (config.live_data.youtube.enabled) {
                youtubeApi.getNewMessages().forEach(function(elt) { 
                    newMessages.push(elt); 
                });
            }

            if (config.live_data.twitch.enabled && twitchApi.isReady()) {
                twitchApi.getNewMessages().forEach(function(elt) { 
                    newMessages.push(elt); 
                });
            }

            if (newMessages.length > 0)
            {
                winston.info(newMessages);

                newMessages.forEach(function(elt) {
                    if (elt.type == 'chat') {
                        // Affect a unique id to each message
                        elt.id = chatMessageId;
                        chatMessageId++;

                        chatMessages.push(elt);

                        io.emit('newChatMessage', elt);
                    }
                    else if (elt.type == 'system') {
                        systemMessages.push(elt);

                        io.emit('newSystemMessage', elt);
                    }        
                });

                newMessages = [];
            }

            setTimeout(next, 1000);
        },
        function(err) {
            winston.error('Error retrieving new messages: ' + err);
        }
    );

}

// Create a new directory for log files
mkdirp('./logs', function(err) {
    if (err) 
        winston.error('Unable to create the log folder', err);
});

// Load config file
fs.readFile('config.json', function (err, config) {
    if (err) {
        winston.error('Error loading config file: ' + err);
        return;
    }

    config = JSON.parse(config);

    if (!config.host || !config.port) {
        winston.error('Error loading config file: host or port is missing!');
        return;
    }

    run(config);
});