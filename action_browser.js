'use strict';

var isInitiator = false;//用来标识发起者
var isChannelReady = false;//用来标识两个人都已经进了同一间屋子
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;

var pcConfig = {
  'iceServers': [
    //{'url': 'stun:stun.l.google.com:19302'}
    {
      //'url': 'turn:183.60.1.158:3478?transport=udp',
      'url': 'turn:119.29.28.242:3478?transport=udp',
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

if (room !== '') {
  socket.emit('create or join', room);
  console.log('1. Attempted to create or join room', room);
}

//Server发消息告诉第一个浏览器客户端进房间成功
socket.on('created', function(room) {
  console.log('Created room ' + room, socket);
  isInitiator = true;
});

//标识第一个用户进来了，这里log内容不一样，主要为了在浏览器Console里两个人看到不一样的内容
socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  isChannelReady = true;
});

//标识第二个用户进来了
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

//到这里进房间完成，信令通信告一段落，开始真正音视频操作
////////////////////////////////////////////////

function sendMessage(message, roomid) {
  console.log('[SEND_MSG]: ', message);
  socket.emit('message', message, roomid);
}

// This client receives a message
socket.on('message', function(message) {
  console.log('[RECV_MSG]:', message);
  if (message === 'got user media') {
    maybeStart();
  } 
  else if (message.type === 'offer') {
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
    handleRemoteHangup();
  }
  
});

////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

navigator.mediaDevices.getUserMedia({
  audio: false,
  video: true
})
.then(gotStream)//启动设备会被卡住，gotStream可能后面才会执行
.catch(function(e) {
  alert('getUserMedia() error: ' + e.name);
});

function gotStream(stream) {
  console.log('()gotStream()Adding local stream.');
  localVideo.src = window.URL.createObjectURL(stream);
  localStream = stream;
  sendMessage('got user media', room);
  if (isInitiator) {
    maybeStart();
  }else{
    console.log('()gotStream() isInitiator is false，so maybeStart() not called');
  }
}

var constraints = {
  video: true
};

console.log('2. Getting user media with constraints', constraints);
console.log('2. isInitiator=', isInitiator);
console.log('2. location.hostname=', location.hostname);

if (location.hostname !== 'localhost') {
  requestTurn(
    'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
  );
}

function maybeStart() {
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);

  //房间只有一个人的时候，isChannelReady===false，所以进不来
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      doCall();
    }
  }
}

window.onbeforeunload = function() {
  sendMessage('bye', room);
};

/////////////////////////////////////////////////////////

function requestTurn(turnURL){
  var turnExists = false;
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].url.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      console.log('()requestTurn()', pcConfig.iceServers[i]);
      break;
    }
  }
  /*
  if (!turnExists) {
    console.log('Getting TURN server from ', turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pcConfig.iceServers.push({
          'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turnURL, true);
    xhr.send();
  }
  */
}

function createPeerConnection() {
  console.log('()createPeerConnection() do nothing now!')
}

function doCall() {
  console.log('()doCall() do nothing now!');
}


