// Taken from http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

Youtube = {
    parseEmoji: function(text) {
        return jEmoji.unifiedToHTML(message);
    }
};

Twitch = {
    emoteTemplate: function(id) {
        return '<img class="emoticon ttv-emo-' + id + '" src="//static-cdn.jtvnw.net/emoticons/v1/' + id + '/1.0" srcset="//static-cdn.jtvnw.net/emoticons/v1/' + id + '/2.0 2x" />';
    },

    formatEmotes: function(text, emotes) {
        var splitText = text.split('');
        for(var i in emotes) {
            var e = emotes[i];
            for(var j in e) {
                var mote = e[j];
                if(typeof mote == 'string') {
                    mote = mote.split('-');
                    mote = [parseInt(mote[0]), parseInt(mote[1])];
                    var length =  mote[1] - mote[0],
                        empty = Array.apply(null, new Array(length + 1)).map(function() { return '' });
                    splitText = splitText.slice(0, mote[0]).concat(empty).concat(splitText.slice(mote[1] + 1, splitText.length));
                    splitText.splice(mote[0], 1, Twitch.emoteTemplate(i));
                }
            }
        }
        return splitText.join('');
    }
};

System = {
  handleMessage: function(data) {
    var message = data.message.split('|');
    var type = message[0];
    var value = message[1];

    switch (data.source) {
      case 'youtube':
        var youtubeStatus = $('#youtube-status');
        
        if (youtubeStatus.parent().is('a'))
          youtubeStatus.unwrap();

        youtubeStatus.removeAttr('title');

        switch(type) {
          case 'auth-url':
            console.log('You need to generate a new auth Token with this link: ' + value);
            youtubeStatus.wrap('<a href="' + value + '"></a>');
            break;
          case 'error':
            console.log('Youtube API error: ' + value);
            youtubeStatus.attr('title', value);
            break
          case 'ready':
            value = (value === 'true');
            // console.log(value + ' == true', value == true);
            // console.log(isTrueSet);
            if (value)
            {
              console.log('Youtube API is ready');
              youtubeStatus.addClass('ready');
            }
            else
            {
              console.log('Youtube API is not ready');
              youtubeStatus.removeClass('ready');
            }
            break;
        }
        break;
      case 'twitch':
        switch(type) {
          case 'ready':
            console.log('Twitch API is ready');
            $('#twitch-status').addClass('ready');
            break;
        }
        break;
      case 'hitbox':
        switch(type) {
          case 'ready':
            console.log('Hitbox API is ready');
          $('#hitbox-status').addClass('ready');
            break;
        }
        break;
      case 'beam':
        switch(type) {
          case 'ready':
            console.log('Beam API is ready');
            $('#beam-status').addClass('ready');
            break;
        }
        break;
      case 'dailymotion':
        switch(type) {
          case 'ready':
            console.log('Dailymotion API is ready');
            $('#dailymotion-status').addClass('ready');
            break;
        }
        break;
    }
  }
};

Chat = {
  initialize: function (url) {
      var socket = io(url);

      window.noxalus = {
        socket: socket
      };

      console.log('Trying to connect to: ' + url);

      socket.on('connected', function()
      {
          console.log('Connected to: ' + url);
      });

      socket.on('oldChatMessages', function(data) {
          if (!Chat.vars.gotOldChatMessages) {
            Chat.vars.gotOldChatMessages = true;

            data.forEach(function(elt) {
                if (Chat.vars.startTime - elt.date < Chat.vars.displayTime)
                  Chat.insert(elt)
            });
          }
      });

      socket.on('oldSystemMessages', function(data) {
          if (!Chat.vars.gotOldSystemMessages) {
              Chat.vars.gotOldSystemMessages = true;

              data.forEach(function(elt) {
                console.log('New system message', elt);
                System.handleMessage(elt);
              });
          }
      });

      socket.on('newChatMessage', function(data) {
          console.log('New message', data);
          Chat.insert(data)
      });

      socket.on('newSystemMessage', function(data) {
          System.handleMessage(data);
      });

      console.log('Display time: ' + Chat.vars.displayTime);
      console.log('Max messages: ' + Chat.vars.maxMessages);
  },
  insert: function(data) {
      var $newLine = $('<div></div>');
      $newLine.addClass('chat-line');

      $newLine.attr('data-timestamp', data.date);

      var $formattedSource = $('<span></span>');
      $formattedSource.addClass('source_icon');
      $formattedSource.html('<img src="img/' + data.source + '.png" alt="' + data.source + '" />');
      $newLine.append($formattedSource);

      var $formattedUser = $('<span></span>');
      $formattedUser.addClass('author');

      if (data.color)
        $formattedUser.css('color', data.color);
      
      $formattedUser.html(data.author);
      $newLine.append($formattedUser);
      $newLine.append('<span class="colon">:</span>&nbsp;');

      message = data.message;

      // Replace emotes/emojis by their corresponding images
      switch (data.source) {
        case 'twitch':
            if(data.emotes)
              message = Twitch.formatEmotes(message, data.emotes);
            break;
        case 'youtube':
            message = Youtube.parseEmoji(message);
            break;
      }

      var $formattedMessage = $('<span></span>');
      $formattedMessage.addClass('message');
      $formattedMessage.html(message);
      $newLine.append($formattedMessage);

      Chat.vars.queue.push($newLine.wrap('<div>').parent().html());
  },
  vars: {
      startTime: Date.now(),
      gotOldChatMessages: false,
      gotOldSystemMessages: false,
      queue: [],
      queueTimer: setInterval(function() {
          if(Chat.vars.queue.length > 0) {
              // Add new pending messages
              var newLines = Chat.vars.queue.join('');
              Chat.vars.queue = [];
              $('#chat-box').append(newLines);

              $('#chat-box')[0].scrollTop = $('#chat-box')[0].scrollHeight;

              // There are more messages than the maximum allowed
              if (Chat.vars.maxMessages > 0) {
                  var linesToDelete = $('#chat-box .chat-line').length - Chat.vars.maxMessages;

                  if(linesToDelete > 0) {
                      for(var i=0; i<linesToDelete; i++) {
                          $('#chat-box .chat-line').eq(0).remove();
                      }
                  }
              }
          } else {
              // Fade out messages that are shown during too long
              if (Chat.vars.displayTime > 0) {
                  var messagePosted = $('#chat-box .chat-line').eq(0).data('timestamp');

                  if((Date.now() - messagePosted) / 1000 >= Chat.vars.displayTime) {
                      $('#chat-box .chat-line').eq(0).addClass('on_out').fadeOut(function() {
                          $(this).remove();
                      });
                  }
              }
          }
      }, 250),
      displayTime: getParameterByName('display_time') || 60,
      maxMessages: getParameterByName('max_messages') || 10
  }
};

$(document).ready(function() {
    Chat.initialize(window.location.origin);

    // Hide API status?
    if (getParameterByName('hide_api_status')) {
      $('#api-status').remove();
    }
});