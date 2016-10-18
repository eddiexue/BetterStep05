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
    console.log('Request: ' + request.url);
}).listen(8888);

//让socket监听httpServer的事件
var io = socketIO.listen(httpsServer);

io.on('connection', function(socket){

    function log(content) 
    {
        console.log(content);
    }

    function printObj( obj )
    {
        for( var i in obj)
        {
            log(i + '=' + obj[i].toString());
        }
    }

    //MSG-RECV-1 svr收到client发上来的创建房间请求
    socket.on('create or join', function(room) {
        log('Received request to create or join room ' + room);

        var numClients = io.sockets.sockets.length;
        //var numClients = socket.

        log('Room ' + room + ' now has ' + numClients + ' client(s)');

        if (numClients === 1) 
        {
            socket.join(room);
            log('Client ID ' + socket.id + ' created room ' + room);
            
            //MSG-SEDN-2 svr告知客户端说已完成房间创建
            socket.emit('created', room, socket.id);
        } 
        else if (numClients === 2) 
        {
            log('Client ID ' + socket.id + ' joined room ' + room);
            //MSG-SEDN-2 svr告知客户端说已完成房间加入
            io.sockets.in(room).emit('join', room);
            
            socket.join(room);
            socket.emit('joined', room, socket.id);
            //MSG-SEDN-3 svr告知同房间的对端浏览器完成房间加入
            io.sockets.in(room).emit('ready');
        } 
        else 
        { // max two clients
            socket.emit('full or undefined', room);
            log('===========');
            printObj(socket);
            log('===========');
            printObj(io);
        }
    });

    socket.on('bye', function(){
        log('received bye');
    });
});