// Taken from http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

Twitch = {
    emoteTemplate: function(id) {
        return '<img class="emoticon ttv-emo-' + id + '" src="//static-cdn.jtvnw.net/emoticons/v1/' + id + '/1.0" srcset="//static-cdn.jtvnw.net/emoticons/v1/' + id + '/2.0 2x" />';
    },
    emoticonize: function(message, emotes) {
        if(!emotes) return [message];

        var tokenizedMessage = [];
        var emotesList = Object.keys(emotes);
        var replacements = [];

        emotesList.forEach(function(id) {
            var emote = emotes[id];

            for(var i=emote.length-1; i>=0; i--) {
                indexes = emote[i].split('-');
                replacements.push({ id: id, first: indexes[0], last: indexes[1] });
            }
        });

        replacements.sort(function(a, b) {
            return b.first - a.first;
        });

        // Tokenizes each character into an array
        // punycode deals with unicode symbols on surrogate pairs
        // punycode is used in the replacements loop below as well
        message = punycode.ucs2.decode(message);

        replacements.forEach(function(replacement) {
            // Unshift the end of the message (that doesn't contain the emote)
            tokenizedMessage.unshift(punycode.ucs2.encode(message.slice(replacement.last + 1)));

            // Unshift the emote HTML (but not as a string to allow us to process links and escape html still)
            tokenizedMessage.unshift([ Twitch.emoteTemplate(replacement.id) ]);

            // Splice the unparsed piece of the message
            message = message.slice(0, replacement.first);
        });

        // Unshift the remaining part of the message (that contains no emotes)
        tokenizedMessage.unshift(punycode.ucs2.encode(message));

        return tokenizedMessage;
    }
};

Chat = {
  initialize: function (url) {
      var socket = io(url);

      socket.on('message', function(data) {
          console.log('New message', data);
          Chat.insert(data)
      });

      console.log('Display time: ' + Chat.vars.displayTime);
      console.log('Max messages: ' + Chat.vars.maxMessages);
  },
  insert: function(data) {
      var $newLine = $('<div></div>');
      $newLine.addClass('chat_line');

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

      // Replace emotes by their corresponding images
      if(data.emotes) {

          if (data.source == 'twitch') {
            var tokenizedMessage = Twitch.emoticonize(message, data.emotes);

            for(var i = 0; i < tokenizedMessage.length; i++) {
                if(typeof tokenizedMessage[i] !== 'string') {
                    tokenizedMessage[i] = tokenizedMessage[i][0];
                }
            }

            message = tokenizedMessage.join(' ');
          }
      }

      var $formattedMessage = $('<span></span>');
      $formattedMessage.addClass('message');
      $formattedMessage.html(message);
      $newLine.append($formattedMessage);

      Chat.vars.queue.push($newLine.wrap('<div>').parent().html());
  },
  vars: {
      queue: [],
      queueTimer: setInterval(function() {
          if(Chat.vars.queue.length > 0) {
              // Add new pending messages
              var newLines = Chat.vars.queue.join('');
              Chat.vars.queue = [];
              $('#chat_box').append(newLines);

              $('#chat_box')[0].scrollTop = $('#chat_box')[0].scrollHeight;

              // There are more messages than the maximum allowed
              if (Chat.vars.maxMessages > 0) {
                  var linesToDelete = $('#chat_box .chat_line').length - Chat.vars.maxMessages;

                  if(linesToDelete > 0) {
                      for(var i=0; i<linesToDelete; i++) {
                          $('#chat_box .chat_line').eq(0).remove();
                      }
                  }
              }
          } else {
              // Fade out messages that are shown during too long
              if (Chat.vars.displayTime > 0) {
                  var messagePosted = $('#chat_box .chat_line').eq(0).data('timestamp');

                  if((Date.now() - messagePosted) / 1000 >= Chat.vars.displayTime) {
                      $('#chat_box .chat_line').eq(0).addClass('on_out').fadeOut(function() {
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
    Chat.initialize('http://localhost:4242');
});