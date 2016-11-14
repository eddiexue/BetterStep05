'use strict';

//@TODO: 修改SDP的内容，使其生成h264内容
//@TODO: 


var os = require('os');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

var https = require('https'); //由于浏览器都必须https了，所以这里也要换成https
var nodeStatic = require('node-static');//httpsvr的实现，简化处理逻辑
var socketIO = require('socket.io');//用来实现房间和多人聊天

/**
 * console.log(__dirname);             //  /root/workspace/SimpleWebrtc/js/server
 * console.log(__filename);            //  /root/workspace/SimpleWebrtc/js/server/https_svr_handler.js, 这个好一点
 * console.log(process.cwd());         //  /root/workspace/SimpleWebrtc, 会随着执行路径变化而变化，不理想
 * console.log(path.resolve('./'));    //  /root/workspace/SimpleWebrtc, 同上
 */

var workspaceDir = __filename.slice(0, __filename.indexOf('SimpleWebrtc')+'SimpleWebrtc'.length);

//信令服务的秘钥和证书的配置
var secure_options = {  
    key: fs.readFileSync( workspaceDir+'/cert/privatekey.pem' ),  
    cert: fs.readFileSync( workspaceDir+'/cert/certificate.pem')  
};

function parseINIString(data)
{  
    var regex = {  
        section: /^\s*\s*([^]*)\s*\]\s*$/,
        param: /^\s*([\w\.\-\_]+)\s*=\s*(.*?)\s*$/,  
        comment: /^\s*#.*$/  
    };  
    var value = {};  
    var lines = data.split(/\r\n|\r|\n/);  
    var section = null;  
    lines.forEach(function(line)
    {  
        if(regex.comment.test(line)){  
            return;  
        }
        else if(regex.param.test(line))
        {  
            var match = line.match(regex.param);  
            if(section){  
                value[section][match[1]] = match[2];  
            }else{  
                value[match[1]] = match[2];  
            }
            console.log('[turnserver property]'+match[1] + ' = ' +  value[match[1]]);
        }
        else if(regex.section.test(line))
        {  
            var match = line.match(regex.section);  
            value[match[1]] = {};  
            section = match[1];  
        }
        else if(line.length == 0 && section)
        {  
            section = null;  
        };  
    });  
    return value;  
}  

//从turnserver配置文件中读取？？
var turnserver_conf = parseINIString(fs.readFileSync( workspaceDir+'/../../turnserver/etc/turnserver.conf').toString());
var turn_static_auth_secret = turnserver_conf['static-auth-secret'];
//测试发现这个选项其实没有实际作用，这里只是用来拿到Turnserver外网IP
var externalIp = turnserver_conf['external-ip'];
var turn_usercombo  =  Math.floor(((new Date()).valueOf()/1000+86400*3650))+':'+'eddiexue';
var turn_password   = crypto.createHmac('sha1', turn_static_auth_secret).update(turn_usercombo).digest().toString('base64');
var turn_ip_addr    = externalIp+':3478';
//console.log('path(turnserver.conf)='+turnserver_conf);
//console.log('turn_static_auth_secret='+turn_static_auth_secret);

var pcConfig = {
  'iceServers': [
    {
      'url': 'turn:'+turn_ip_addr+'?transport=udp',
      'username': turn_usercombo,
      'credential': turn_password
    }
    //,{'url': 'stun:stun.l.google.com:19302'},
  ]
};

console.log('>>>>>> creating turnserver secure secret...');
for(var i=0 ; i < pcConfig.iceServers.length; i++)
{
    console.log('url['+i+']         = '+pcConfig.iceServers[i].url);
    console.log('username['+i+']    = '+pcConfig.iceServers[i].username);
    console.log('credential['+i+']  = '+pcConfig.iceServers[i].credential);
}
console.log('-----------------------------------');


//为了测试，本地cache尽快更新; 把index.html改个名字试试
var requestHandler = new nodeStatic.Server( {cache: 1, indexFile: 'index.html'} );

//启动简单文件服务器，到这里其实只负责把文件都拉回去
var httpsServer = https.createServer(secure_options, function(request, response){
    request.addListener('end', function () {
        requestHandler.serve(request, response).addListener('error', function (err) {
            console.error("Error serving: " + request.url + " - " + err.message);
        });
    }).resume();
}).listen(8888);

//让socket监听httpServer的事件
var io = socketIO.listen(httpsServer);

io.sockets.on('connection', function(socket)
{
    function sendDebugInfoBack() 
    {
        var array = ['[Debug][Server]:'];
        array.push.apply(array, arguments);
        socket.emit('log', array);
    }

    socket.on('join', function(room) 
    {
        var numClients = (undefined === io.sockets.adapter.rooms[room] ? 0 : io.sockets.adapter.rooms[room].length);
        
        //第一个进来的是创建者
        if (numClients === 0) 
        {
            socket.join(room);
            socket.emit('created', room, socket.id);
            console.log('[On Join] Client[' + socket.id + '] created room ' + room);
        } 
        //第二个进来的是参与者
        else if (numClients === 1) 
        {            
            //第二个参加者也进来了
            socket.join(room);
            io.sockets.in(room).emit('join', room, socket.id);
            console.log('[On Join] Client[' + socket.id + '] joined room ' + room);

            //知会房间里的所有人准备就绪，但是貌似没啥用
            io.sockets.in(room).emit('ready', room, pcConfig);
            console.log('[On Join] Send READY signal for all clients ('+ numClients +') in room: ' + room);
        } 
        //暂时只支持两人连麦
        else 
        { // max two clients
            socket.emit('full', room);
            console.log('[On Join] Room: ' + room + ' has been full(' + numClients + ')!');
        }
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

    //消息群发功能，将收到的消息广播给房间里所有人，包括发送者自己
    socket.on('message', function(message, roomid) {
        io.sockets.in(roomid).send(message);
        console.log('[On Message]Client(' + socket.id + ')('+ typeof message +') said: ' + (typeof message === "string"? message : message.type) );
    });

    //只把消息回给发件人自己
    socket.on('message_self_remind', function(message, roomid) {
        socket.emit('message', message);
        console.log('[On Message_SELF_REMIND]Client(' + socket.id + ')('+ typeof message +') remind: ' + (typeof message === "string"? message : message.type) );
    });

    //把消息发给房间除了自己以外的其他人
    socket.on('message_to_others', function(message, roomid) {
        socket.broadcast.to(roomid).send(message);
        console.log('[On MESSAGE_TO_OTHERS]Client(' + socket.id + ')('+ typeof message +') to others: ' + (typeof message === "string"? message : message.type) );
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