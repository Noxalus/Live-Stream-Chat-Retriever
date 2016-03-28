var fs = require('fs');
var readline = require('readline');
var irc = require("tmi.js");

var _config = null;
var _isReady = false;
var _newMessages = [];

function initialize(config) {
    _config = config.live_data.twitch;

    var options = {
        options: {
            debug: false
        },
        connection: {
            cluster: "aws",
            reconnect: true
        },
        channels: [_config.channel]
    };

    var client = new irc.client(options);

    client.on("connected", function (address, port) {
        ready();
    });

    client.on("chat", function (channel, user, message, self) {
        var chatMessage = {
            author: user['display-name'],
            color: user['color'],
            message: message,
            emotes: user['emotes'],
            source: 'twitch',
            date: new Date().getTime()
        };

        _newMessages.push(chatMessage);
    });

    client.connect();
}

function ready() {
    console.log('Twitch API is ready to use');
    _isReady = true;
}

function isReady() {
    return _isReady;
}

function getNewMessages() {
    if (_newMessages.length == 0)
        return [];

    var newMessage = _newMessages;
    _newMessages = [];

    return newMessage;
}

exports.initialize = initialize;
exports.isReady = isReady;
exports.getNewMessages = getNewMessages;