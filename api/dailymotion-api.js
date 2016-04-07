var winston = require('winston');
var eventsource = require('eventsource');

var _config = null;
var _isReady = false;
var _newMessages = [];

function initialize(config) {
    _config = config.live_data.dailymotion;

    var url = _config.grosminet_endpoint + '/rooms/DailymotionAPI-' + _config.channel_id;
    var es = new eventsource(url);

    es.addEventListener('open', function (data) {
        ready();
    });

    es.addEventListener('error', function (data) {
        winston.error(data, { source: 'dailymotion' });
    });

    es.addEventListener('message', function (event) {
        if (event.type == 'message')
        {
            var message = JSON.parse(event.data);
            console.log('New message: ', message);

            var chatMessage = {
                type: 'chat',
                author: message.s,
                message: message.m,
                source: 'dailymotion',
                date: new Date().getTime(),
                color: '#' + message.c
            };

            _newMessages.push(chatMessage);
        }
    });
}

function ready() {
    winston.info('Dailymotion API is ready to use!', { source: 'dailymotion' });
    _isReady = true;

    _newMessages.push({
        type: 'system',
        source: 'dailymotion',
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