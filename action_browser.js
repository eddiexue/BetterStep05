'use strict';

var isInitiator = false;
var isChannelReady = false;

var pcConfig = {
  'iceServers': [
    //{'url': 'stun:stun.l.google.com:19302'}
    {
      'url': 'turn:183.60.1.158:3478?transport=udp',
      'credential': 'testpassword',
      'username': 'testqq'
    }
  ]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true
  }
};

/////////////////////////////////////////////

var room = 'eddiexue';
// Could prompt for room name:
//room = prompt('Enter room name:');

var socket = io.connect();//这里的io对象是从哪来的？

//MSG-SEND-1, 创建或加入房间
if (room !== '') {
  socket.emit('create or join', room);
  console.log('Attempted to create or join room', room);
}

socket.on('created', function(room) {
  console.log('Created room ' + room);
  isInitiator = true;
});

socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

socket.on('joined', function(room) {
  console.log('joined: ' + room);
  isChannelReady = true;
});

socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}