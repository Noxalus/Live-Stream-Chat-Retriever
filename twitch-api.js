var fs = require('fs');
var readline = require('readline');
var irc = require("tmi.js");

var _isReady = false;
var _newMessages = [];

function initialize(config) {
    var options = {
        options: {
            debug: false
        },
        connection: {
            cluster: "chat",
            reconnect: true
        },
        channels: [config.live_data.twitch.channel]
    };

    var client = new irc.client(options);

    client.on("connected", function (address, port) {
        ready();
    });

    client.on("chat", function (channel, user, message, self) {
        var chatMessage = {
            author: user.username,
            message: message,
            source: 'youtube',
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