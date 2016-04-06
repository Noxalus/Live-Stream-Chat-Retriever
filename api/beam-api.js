var http = require('https');
var winston = require('winston');
var beam = require('beam-client-node');
var beamsocket = require('beam-client-node/lib/ws');

var _config = null;
var _isReady = false;
var _newMessages = [];
var _userData = null;
var _chatData = null;

function initialize(config) {
    _config = config.live_data.beam;

    // Retrieve channel id/user id/chat endpoints and auth token
    var b = new beam();

    b.use('password', {
        username: _config.username,
        password: _config.password
    }).attempt().then(function (data) {
        winston.info('Beam API is now connected with ' + _config.username + ' account!', { source: 'beam' });
        _userData = data.body;
        return b.chat.join(_userData.channel.id);
    }).then(function (res) {
        winston.info('Joining the chat', { source: 'beam' });
        _chatData = res.body;

        initializeSocket();
    }).catch(function (err) {
        winston.info(err, { source: 'beam' });
    });
}

function initializeSocket() {
    var socket = new beamsocket(_chatData.endpoints).boot();

    // You don't need to wait for the socket to connect before calling methods,
    // we spool them and run them when connected automatically!
    socket.call('auth', [_userData.channel.id, _userData.id, _chatData.authkey]).then(function () {
        ready();
    }).catch(function (err) {
        winston.error('Oh no! An error occurred trying to connect to the chat web socket!', { source: 'beam' });
    });

    socket.on('ChatMessage', function (data) {
        var message = '';
        data.message.message.forEach(function(elt) {
            switch (elt.type) {
                case 'text':
                    message += elt.data;
                break;
                case 'emoticon':
                    message += elt.text;
                break;
            }
        });

        var chatMessage = {
            type: 'chat',
            author: data.user_name,
            message: message,
            source: 'beam',
            date: new Date().getTime()
        };

        _newMessages.push(chatMessage);
    });
}

function ready() {
    winston.info('Beam API is ready to use (connected to ' + _config.channel + ')', { source: 'beam' });
    _isReady = true;

    _newMessages.push({
        type: 'system',
        source: 'beam',
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