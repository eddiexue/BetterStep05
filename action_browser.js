'use strict';

var isInitiator = false;//用来标识发起者
var isChannelReady = false;//用来标识两个人都已经进了同一间屋子
var isStarted = false;
var localStream;
var pc;
var remoteStream;

var wantHostMode      = false;
var wantReflexiveMode = false;
var wantRelayMode     = true;

/* 
 * 打印 JavaScript 函数调用堆栈 
 */  
function printCallStack() {  
    var e = new Error('dummy');
    var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '')
      .replace(/^\s+at\s+/gm, '')
      .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@')
      .split('\n');
    console.log(stack);
}  

var pcConfig = {
  'iceServers': [
    //{'url': 'stun:stun.l.google.com:19302'},
    {
      //'url': 'turn:183.60.1.158:3478?transport=udp',
      'url': 'turn:119.29.28.242:3478?transport=udp',
      'credential': 'testpassword',
      'username': 'testqq'
    },
    {
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

function sendSelfRemindMsg(message, roomid)
{
  console.log('[SEND_SELF_REMIND]: ', message);
  socket.emit('message_self_remind', message, roomid);
}

function sendMsgToOthers(message, roomid)
{
  console.log('[SEND_MSG_TO_OTHERS]: ', message);
    socket.emit('message_to_others', message, roomid);
}

// This client receives a message
socket.on('message', function(message) {
  console.log('[RECV_MSG]['+message.type+']', message);
  
  if (message === 'got user media') {
    maybeStart();
  } 
  else if (message.type === 'offer') {//setLocalAndSendMessage会offer对方
    if (!isInitiator && !isStarted) {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } 
  else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } 
  else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } 
  else if (message === 'bye' && isStarted) {
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
      console.log('()requestTurn()', pcConfig.iceServers[i]);
      break;
    }
  }
}

/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(null);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) 
{
  var ice = event.candidate;

  console.log('>>>>>>>>>>>>>icecandidate event: ', ice);

  if (ice) {
    if(wantHostMode && ice.candidate.indexOf('typ host') == -1) 
    {
      console.log('[pass]wantHostMode='+wantHostMode+', typ host?='+(ice.candidate.indexOf('typ host') == -1) );
      return;
    }

    if(wantReflexiveMode && ice.candidate.indexOf('srflx') == -1) 
    {
      console.log('[pass]wantReflexiveMode='+wantReflexiveMode+', srflx?='+(ice.candidate.indexOf('srflx') == -1) );
      return;
    }

    if(wantRelayMode && ice.candidate.indexOf('relay') == -1) 
    {
      console.log('[pass]wantRelayMode='+wantRelayMode+', relay?='+(ice.candidate.indexOf('relay') == -1) );
      return;
    }

    console.log('>>>>>>>>>> selected relay candidate: ', ice);
    sendMsgToOthers({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    }, room);
  } else {
    console.log('End of candidates.');
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.', event);
  remoteVideo.src = window.URL.createObjectURL(event.stream);
  remoteStream = event.stream;
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function doCall() {
  console.log('doCall(): Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function setLocalAndSendMessage(sessionDescription) {
  // Set Opus as the preferred codec in SDP if Opus is present.
  //  sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage() sending message');
  //sendMessage(sessionDescription, room);
  sendMsgToOthers(sessionDescription, room);
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doAnswer() {
  console.log('()doAnswer(): Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function onCreateSessionDescriptionError(error) {
  console.trace('Failed to create session description: ' + error.toString());
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  // isAudioMuted = false;
  // isVideoMuted = false;
  pc.close();
  pc = null;
}

///////////////////////////////////////////

// Set Opus as the default audio codec if it's present.
function preferOpus(sdp) {
  var sdpLines = sdp.split('\r\n');
  var mLineIndex;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('m=audio') !== -1) {
      mLineIndex = i;
      break;
    }
  }
  if (mLineIndex === null) {
    return sdp;
  }

  // If Opus is available, set it as the default in m line.
  for (i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
      if (opusPayload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex],
          opusPayload);
      }
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

function extractSdp(sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return result && result.length === 2 ? result[1] : null;
}

// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) { // Format of media starts from the fourth.
      newLine[index++] = payload; // Put target payload to the first.
    }
    if (elements[i] !== payload) {
      newLine[index++] = elements[i];
    }
  }
  return newLine.join(' ');
}

// Strip CN from sdp before CN constraints is ready.
function removeCN(sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length - 1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}
