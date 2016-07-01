var irc = require('tmi.js');
var winston = require('winston');

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
            type: 'chat',
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
    winston.info('Twitch API is ready to use (connected to ' + _config.channel + ')', { source: 'twitch' });
    _isReady = true;

    _newMessages.push({
        type: 'system',
        source: 'twitch',
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