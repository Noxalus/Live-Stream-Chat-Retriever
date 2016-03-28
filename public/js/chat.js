// Taken from http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

Twitch = {
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

      var $formattedMessage = $('<span></span>');
      $formattedMessage.addClass('message');
      $formattedMessage.html(data.message);
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