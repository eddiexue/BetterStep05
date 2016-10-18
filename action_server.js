'use strict';

var os = require('os');
var fs = require('fs');
var https = require('https'); //由于浏览器都必须https了，所以这里也要换成https
var nodeStatic = require('node-static');

var options = {  
    key: fs.readFileSync('./cert/privatekey.pem'),  
    cert: fs.readFileSync('./cert/certificate.pem')  
};

//为了测试，本地cache尽快更新; 把index.html改个名字试试
var fileHandler = new nodestatic.Server( {cache: 1, indexFile: 'frontpage.html'} );

//启动简单文件服务器，到这里其实只负责把文件都拉回去
var httpsServer = https.createServer(options, function(req, res){
    fileHandler.serve(req, res);
    console.log('receive:' + req.url);
}).listen(8080)