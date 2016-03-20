var http = require('http');
var youtubeApi = require('./youtube-api');
var express = require('express');
var socketio = require('socket.io');
var async = require('async');
var fs = require('fs');

function run(config) {
    // Initialize all APIs
    if (config.live_data.youtube.enabled)
        youtubeApi.initialize();

    var app = express();
    var server = http.Server(app);

    var io = socketio(server);

    app.get('/', function(req, res) {
        res.sendFile('chat.html');
    });

    config.live_data.youtube.redirect_uris.forEach(function(elt) {
        var endpoint = elt.replace(config.host + ':' + config.port, '');
        app.get(endpoint, function(req, res){
          youtubeApi.getToken(req.query.code);
          res.send('<h1>New Youtube token successfully retrieved.</h1>');
        });
    });

    server.listen(config.port, function() {
        console.log('listening on *: ' + config.port);
    });

    // Retrieve new messages
    var newMessages = [];
    async.forever(
        function(next) {

            if (config.live_data.youtube.enabled && youtubeApi.isReady())
            {
                youtubeApi.getNewMessages(function(data) { 
                    data.forEach(function(elt) { newMessages.push(elt); });
                });
            }

            // TODO: Push new messages from twitch API
            // newMessages.push(twitchApi.getNewMessages());

            if (newMessages.length > 0)
            {
                console.log(newMessages);

                newMessages.forEach(function(elt, index, array) {
                    io.emit('message', elt);                
                });

                newMessages = [];
            }

            setTimeout(next, 1000);
        },
        function(err) {
            console.log('Error retrieving new messages: ' + err);
        }
    );

}

// Load config file
fs.readFile('config.json', function (err, config) {
    if (err) {
        console.log('Error loading config file: ' + err);
        return;
    }

    config = JSON.parse(config);

    if (!config.host || !config.port) {
        console.log('Error loading config file: host or port is missing!');
        return;
    }

    run(config);
});