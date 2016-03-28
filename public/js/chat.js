Chat = {
  initialize: function (url) {
    var socket = io(url);

    socket.on('message', function(data) {
      console.log('New message', data);
      Chat.insert(data)
    });
  },
  insert: function(data) {
    var $newLine = $('<div></div>');
    $newLine.addClass('chat_line');

    $newLine.attr('data-timestamp', data.date);

    var $formattedSource = $('<span></span>');
    $formattedSource.addClass('source_icon');
    $formattedSource.html('<img src="img/' + data.source + '.png" />');
    $newLine.append($formattedSource);

    var $formattedUser = $('<span></span>');
    $formattedUser.addClass('author');
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

            // If the max height has been reached, we clean all messages
            var totalHeight = Chat.vars.max_height;
            var currentHeight = $('#chat_box').outerHeight(true) + 5;
            var count = 0;
            var $chatLine, lineHeight;

            if (currentHeight > totalHeight) {
              while(currentHeight > totalHeight) {
                  $chatLine = $('.chat_line').eq(count);
                  lineHeight = $chatLine.height();

                  $chatLine.animate(
                      {
                          "margin-top": -lineHeight
                      },
                      100,
                      function() {
                          $(this).remove();
                      }
                  );

                  currentHeight -= lineHeight;
                  count++;
              }

              return;
            }

            $('#chat_box')[0].scrollTop = $('#chat_box')[0].scrollHeight;

            // There are more messages than the maximum allowed
            var linesToDelete = $('#chat_box .chat_line').length - Chat.vars.max_messages;

            if(linesToDelete > 0) {
                for(var i=0; i<linesToDelete; i++) {
                    $('#chat_box .chat_line').eq(0).remove();
                }
            }
        } else {
            // Fade out messages that are shown during too long
            var messagePosted = $('#chat_box .chat_line').eq(0).data('timestamp');

            if((Date.now() - messagePosted) / 1000 >= Chat.vars.maxDisplayTime) {
                $('#chat_box .chat_line').eq(0).addClass('on_out').fadeOut(function() {
                    $(this).remove();
                });
            }
        }
    }, 250),
    maxDisplayTime: 60,
    max_messages: 10,
    max_height: 500,
  }
};

Chat.initialize(window.location.origin + ':4242');