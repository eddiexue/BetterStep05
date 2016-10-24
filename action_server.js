'use strict';

var os = require('os');
var fs = require('fs');
var https = require('https'); //由于浏览器都必须https了，所以这里也要换成https
var nodeStatic = require('node-static');
var socketIO = require('socket.io');


var options = {  
    key: fs.readFileSync('./cert/privatekey.pem'),  
    cert: fs.readFileSync('./cert/certificate.pem')  
};

//为了测试，本地cache尽快更新; 把index.html改个名字试试
var fileHandler = new nodeStatic.Server( {cache: 1, indexFile: 'frontpage.html'} );

//启动简单文件服务器，到这里其实只负责把文件都拉回去
var httpsServer = https.createServer(options, function(request, response){
    request.addListener('end', function () {
        fileHandler.serve(request, response).addListener('error', function (err) {
            console.error("Error serving: " + request.url + " - " + err.message);
        });
    }).resume();
    //console.log('Request: ' + request.url);
}).listen(8888);

//让socket监听httpServer的事件
var io = socketIO.listen(httpsServer);

io.sockets.on('connection', function(socket){

    function log(content) 
    {
        console.log(content);
    }

    function sendObjToBrowser() {
        var array = ['Message from server:'];
        array.push.apply(array, arguments);
        socket.emit('log', array);
    }

    socket.on('create or join', function(room) {
        log('Received request to create or join room ' + room);

        //http://stackoverflow.com/questions/9352549/getting-how-many-people-are-in-a-chat-room-in-socket-io
        //var numClients = io.sockets.sockets.length;
        
        var numClients = -1;
        try {
            numClients = io.sockets.adapter.rooms[room].length;
        } catch (error) {
            //房间里没人的话，rooms[room]数组是空的，所以调用.length会抛异常
            numClients = 0;
        }
        
        if (numClients === 0) 
        {
            socket.join(room);
            log('Client ID ' + socket.id + ' created room ' + room);
            
            //因为前面join了，所以这里的socket就应该和io.sockets.in(room)返回值一样？
            socket.emit('created', room, socket.id);
        } 
        else if (numClients === 1) 
        {
            log('Client ID ' + socket.id + ' joined room ' + room);
            //这条消息在join之前，所以只有第一个进来的那边能收到
            io.sockets.in(room).emit('join', room);
            
            //第二个参加者也进来了
            socket.join(room);
            //通过指定ID的方式专门给第二个进来的人发消息
            socket.emit('joined', room, socket.id);

            //知会房间里的所有人准备就绪，但是貌似没啥用
            io.sockets.in(room).emit('ready');
        } 
        else 
        { // max two clients
            socket.emit('full or undefined:', room);
        }
        
        //再看看有多少人连上来了
        numClients = io.sockets.adapter.rooms[room].length;
        log('Room ' + room + ' now has ' + numClients + ' client(s)');

    });

    socket.on('ipaddr', function() {
        var ifaces = os.networkInterfaces();
        for (var dev in ifaces) {
            ifaces[dev].forEach(function(details) {
                if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
                    socket.emit('ipaddr', details.address);
                }
            });
        }
    });


    socket.on('bye', function(){
        console.log('received bye');
    });


    //消息群发功能，将收到的消息广播给房间里所有人
    socket.on('message', function(message, roomid) {
        log('Client(' + socket.id + ')('+ typeof message +') said: ', typeof message === object? message.type : message);
        
        //主要是为了应对这条消息，'got user media'，该消息用于触发浏览器客户端启动webrtc流程[maybeStart()]
        //注意只有一个人进房间的时候触发不了下一步操作，另一个人进来之后还会在房间内群发，这时候才能触发下一步操作
        //io.sockets.in(roomid).emit('message', message);
        //sendObjToBrowser(io.sockets.adapter.rooms);
        io.sockets.in(roomid).send(message);

        // for a real app, would be room-only (not broadcast)
        // socket.broadcast.emit('message', message);
    });

    //只把消息回给发件人自己
    socket.on('message_self_remind', function(message, roomid) {
        log('Client(' + socket.id + ') remind: ' + message);
        socket.emit('message', message);
    });

    //把消息发给房间除了自己以外的其他人
    socket.on('message_to_others', function(message, roomid) {
        log('Client(' + socket.id + ') to others: ' + message);
        socket.broadcast.to(roomid).send(message);
    });

});

/** 补充一些socket.io发消息的用法
 // send to current request socket client
socket.emit('message', "this is a test");

// sending to all clients except sender
socket.broadcast.emit('message', "this is a test");

// sending to all clients in 'game' room(channel) except sender
socket.broadcast.to('game').emit('message', 'nice game');

// sending to all clients, include sender
io.sockets.emit('message', "this is a test");

// sending to all clients in 'game' room(channel), include sender
io.sockets.in('game').emit('message', 'cool game');

// sending to individual socketid
io.sockets.socket(socketid).emit('message', 'for your eyes only');

socket.send(): is pretty much same as socket.emit() just this time it uses a default event name 'message'. so it takes just one parameter, data you want to pass. Ex.:

socket.send('hi');
And this time you register and listen the 'message' event name;

socket.on('message', function (data) {
  console.log(data);  // it will return 'hi'
})
 */