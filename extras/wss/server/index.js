
var WSS = require('websocket').server;
var http = require('http');
var net = require('net');

var httpServer = http.createServer(function(request, response) {});
var tcpServer = net.createServer(function(socket) {
  socket.on('data', function(data) {
    socket.pipe(wss);
  });
});

httpServer.listen(8990, function() {});

var wss = new WSS({
  httpServer: httpServer
});

wss.on('request', function(request) {

  var connection = request.accept(null, request.origin);

  connection.on('message', function(message) {

    if (message.type === 'utf8') {
      // process WebSocket messages
    }
  });

  connection.on('close', function(connection) {});
});