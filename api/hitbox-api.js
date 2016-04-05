var fs = require('fs');
var readline = require('readline');
var hitbox = require('hitbox-chat');
var winston = require('winston');

var _config = null;
var _isReady = false;
var _newMessages = [];

function initialize(config) {
    _config = config.live_data.hitbox;

    var client = new hitbox();

    client.on("connect", function () {

        var channel = client.joinChannel(_config.channel);
        channel.on("login", function(name, role) {
            ready();
        });

        channel.on("chat", function (author, message, role) {
            var chatMessage = {
                type: 'chat',
                author: author,
                message: message,
                source: 'hitbox',
                date: new Date().getTime()
            };

            _newMessages.push(chatMessage);
        });
    });

    // hitbox-chat lib can throw exceptions into asynchronous functions
    // we don't want that the server crashes, so we handle them here
    process.on('uncaughtException', function(err) {
        winston.error(err, { source: 'hitbox' });
    })
}

function ready() {
    winston.info('Hitbox API is ready to use (connected to ' + _config.channel + ')', { source: 'hitbox' });
    _isReady = true;

    _newMessages.push({
        type: 'system',
        source: 'hitbox',
        date: new Date().getTime(),
        message: 'ready'
    });
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