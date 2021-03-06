'use strict';

/**
 * 整体流程大致描述如下：
 * 1、第一个用户通过join信令创建房间，收到server下发的push消息（created），设置自身状态（isInitiator=true），打开摄像头（getUserMedia、maybeStart）
 * 2、第二个用户通过join信令进入房间，收到server下发的push消息（join），打开摄像头（getUserMedia、maybeStart）
 * 3、Server给二人下发push消息（ready），两边各自设置通道准备完毕（isChannelReady = true;），开始启动后续动作（maybeStart）
 * * 注意：两个客户端打开摄像头(getUserMedia)与信令通道准备是并行操作，且必须二者都完成才能进行下一步，所以打开摄像头结束和通道准备就绪之后都要尝试maybeStart
 * 4、第一个用户向第二个用户发offer信令（SDP）
 * 5、第二个用户向第一个用户回answer信令（SDP）
 * 6、第二个用户向第一个用户发送Candidate
 * 7、第一个用户向第二个用户发送Caddidate
 * 8、开始音视频通话
 * * 注意：这里私底下就是STUN过程和TURN过程，用wireshark抓包可以看到细节
 */

var isInitiator = false;//用来标识发起者
var isChannelReady = false;//用来标识两个人都已经进了同一间屋子
var isStarted = false;
var localStream;
var pc;
var remoteStream;

var wantHostMode      = false;
var wantReflexiveMode = false;
var wantRelayMode     = true;

var pcConfig = {}; //客户端不可见由后台下发
/*
{
  'iceServers': [
    {
      'url': 'turn:119.29.28.242:3478?transport=udp',
      'username': '1509020397:helloword',
      'credential': '+SLiebXF1e6o+R09Peu2yteQCnY='
    }
    //,{'url': 'stun:stun.l.google.com:19302'},
  ]
};
*/

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  'mandatory': {
    'OfferToReceiveAudio': true,
    'OfferToReceiveVideo': true
  }
};

/////////////////////////////////////////////
var socket = io.connect();//这里的io对象是从哪来的？

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
////////////////////////////////////////////////

var room = 'eddiexue';
// Could prompt for room name:
//room = prompt('Enter room name:');

if (room !== '') 
{
  socket.emit('join', room);
  console.log('Attempted to join room', room);
}

socket.on('created', function(room) {
  console.log('[OnCreate] Created room ' + room, socket);
  isInitiator = true;
});

//标识第一个用户进来了，这里log内容不一样，主要为了在浏览器Console里两个人看到不一样的内容
socket.on('join', function (room){
  if( isInitiator )
  {
    console.log('[OnJoin] Another peer made a request to join room ' + room);
    console.log('[OnJoin] This peer is the initiator of room ' + room + '!');
  }
  isChannelReady = true;
});

//人齐了，可以开工了
socket.on('ready', function(room, pccfg) {
  pcConfig = pccfg;
  isChannelReady = true;
  console.log('[OnReady] Signal channel is ready for room: ' + room);
  maybeStart();
});

socket.on('full', function(room) {
  console.log('[OnFull] Room ' + room + ' is full');
});

socket.on('log', function(array) {
  console.log.apply(console, array);
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

function gotStream(stream) 
{
  localVideo.src = window.URL.createObjectURL(stream);
  localStream = stream;
  if (isInitiator) {
    maybeStart();
  }
}

function maybeStart() 
{
  console.log('>>>>>> maybeStart() '+ 'isStarted?'+isStarted +', localStream?'+(typeof localStream)+', isChannelReady?'+isChannelReady);

  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) 
  {
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    if (isInitiator) 
    {
      //这个动作很重要，分别是本地筛选candidate，以及发送offer信令给到对方
      doOffer();
    }
  }
}

window.onbeforeunload = function() 
{
  sendMsgToOthers('bye', room);
};

/////////////////////////////////////////////////////////

//到这里进房间完成，信令通信告一段落，开始真正音视频操作
socket.on('message', function(message) 
{
  console.log('[OnMessage]['+message.type+'] Receive from the other!', message);
  
  if (message.type === 'offer') 
  {
    if (!isInitiator && !isStarted) 
    {
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } 
  else if (message.type === 'answer' && isStarted) 
  {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } 
  else if (message.type === 'candidate' ) 
  {
    if( isStarted )
    {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
      pc.addIceCandidate(candidate);
    }
    else
    {
      console.log('[OnMessage]['+message.type+'] not start ?!!!');
    }
  } 
  else if (message === 'bye' && isStarted) 
  {
    handleRemoteHangup();
  }
  else
  {
    console.log('[OnMessage]['+message.type+'] unknown msg:', message);
  }
  
});

/////////////////////////////////////////////////////////

function createPeerConnection() 
{
  try {
    pc = new RTCPeerConnection(pcConfig);
    pc.onicecandidate = handleIceCandidate;
    pc.onaddstream = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('>>>>>> createPeerConnection()', pc);
  } catch (e) {
    console.log('>>>>>> createPeerConnection() Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) 
{
  var ice = event.candidate;

  if (ice) 
  {
    var isHost = (ice.candidate.indexOf('typ host') !== -1);
    var isSrflx = (ice.candidate.indexOf('srflx') !== -1);
    var isRelay = (ice.candidate.indexOf('relay') !== -1);
    var candidateType = isHost?'host':(isSrflx?'srflx':'relay');

    if(wantHostMode && ice.candidate.indexOf('typ host') == -1) 
    {
      console.log('>>>>>> handleIceCandidate(event) pass candidate ['+candidateType + ']');
      return;
    }

    if(wantReflexiveMode && ice.candidate.indexOf('srflx') == -1) 
    {
      console.log('>>>>>> handleIceCandidate(event) pass candidate ['+candidateType + ']');
      return;
    }

    if(wantRelayMode && ice.candidate.indexOf('relay') == -1) 
    {
      console.log('>>>>>> handleIceCandidate(event) pass candidate ['+candidateType + ']');
      return;
    }

    console.log('>>>>>> handleIceCandidate(event) selected a '+ candidateType+' candidate and send to the other');
    sendMsgToOthers({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    }, room);

  } 
  else {
    console.log('>>>>>> handleIceCandidate(event) End of candidates.');
  }
}

function handleRemoteStreamAdded(event) {
  console.log('>>>>>> handleRemoteStreamAdded(event) Remote stream added.', event);
  remoteVideo.src = window.URL.createObjectURL(event.stream);
  remoteStream = event.stream;
}

function handleRemoteStreamRemoved(event) {
  console.log('>>>>>> handleRemoteStreamRemoved(event) Remote stream removed. Event: ', event);
}

function doOffer() 
{
  console.log('>>>>>> doOffer(): Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() 
{
  console.log('>>>>>> doAnswer(): Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription)
{
  // Set Opus as the preferred codec in SDP if Opus is present.
  // sessionDescription.sdp = preferOpus(sessionDescription.sdp);
  //console.log('????? before=', sessionDescription.sdp)
  sessionDescription.sdp = preferH264(sessionDescription.sdp);
  //console.log('????? after=', sessionDescription.sdp)
  pc.setLocalDescription(sessionDescription);
  sendMsgToOthers(sessionDescription, room);
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function onCreateSessionDescriptionError(error) {
  console.trace('Failed to create session description: ' + error.toString());
}

//主动挂断？本例中无此功能
function hangup() {
  console.log('>>>>>> Hanging up.');
  stop();
  sendMsgToOthers('bye', room);
}

function handleRemoteHangup() {
  console.log('>>>>>> handleRemoteHangup(): Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  // isAudioMuted = false;
  // isVideoMuted = false;
  pc.close();
  pc = null;
  console.log('>>>>>> stop().');
}

///////////////////////////////////////////
function preferH264(sdp)
{
  var sdpLines = sdp.split('\r\n');
  var mLineIndex;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) 
  {
    if (sdpLines[i].search('m=video') !== -1) 
    {
      mLineIndex = i;
      break;
    }
  }

  // If H264 is available, set it as the default in m line.
  /*
  for (i = 0; i < sdpLines.length; i++) 
  {
    if (sdpLines[i].search('H264/') !== -1) 
    {
      var h264Payload = extractSdp(sdpLines[i], /:(\d+) H264\//i);
      if (h264Payload) 
      {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], h264Payload);
      }
      break;
    }
  }
  */

  removeVideoCodecByName(sdpLines, mLineIndex, 'red');
  removeVideoCodecByName(sdpLines, mLineIndex, 'ulpfec');
  removeVideoCodecByName(sdpLines, mLineIndex, 'VP8');
  removeVideoCodecByName(sdpLines, mLineIndex, 'VP9');
  
  sdp = sdpLines.join('\r\n');
  return sdp;
}


function removeVideoCodecByName(sdpLines, mLineIndex, targetName)
{
  var targetPayload = removeRtpmapByName(sdpLines, mLineIndex, targetName);
  if( targetPayload )
  {
    removeRtcpfbByPayload(sdpLines, mLineIndex, targetPayload);
    removeFmtpByPayload(sdpLines, mLineIndex, targetPayload);
    var associatedPayload = removeFmtpAptByPayload(sdpLines, mLineIndex, targetPayload)
    if( associatedPayload )
    {
     removeRtmpByPayload(sdpLines, mLineIndex, associatedPayload)
    }
  }
}

function removeRtmpByPayload(sdpLines, mLineIndex, targetPayload)
{
  var mLineElements = sdpLines[mLineIndex].split(' ');
  var regularEq = new RegExp('a=rtpmap:'+targetPayload+' ', 'i' );

  for (var i = sdpLines.length - 1; i >= 0; i--) 
  {
    if (sdpLines[i].search(regularEq) !=-1)
    {
      var cnPos = mLineElements.indexOf(targetPayload);
      if (cnPos !== -1) {
        mLineElements.splice(cnPos, 1);
      }
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
}

function removeFmtpAptByPayload(sdpLines, mLineIndex, targetPayload)
{
  var associatedPayload = null;
  var regularEq = new RegExp('a=fmtp:[0-9]+ apt='+targetPayload, 'i' );

  for (var i = sdpLines.length - 1; i >= 0; i--) 
  {
    if (sdpLines[i].search(regularEq) !=-1)
    {
      associatedPayload = sdpLines[i].split(/[:| ]/)[1];
      sdpLines.splice(i, 1);
    }
  }

  return associatedPayload;
}

function removeFmtpByPayload(sdpLines, mLineIndex, targetPayload)
{
  for (var i = sdpLines.length - 1; i >= 0; i--) 
  {
    if (sdpLines[i].search('a=fmtp:'+targetPayload) !=-1) 
      sdpLines.splice(i, 1);
  }
}

function removeRtcpfbByPayload(sdpLines, mLineIndex, targetPayload)
{
    for (var i = sdpLines.length - 1; i >= 0; i--) 
    {
      if (sdpLines[i].search('a=rtcp-fb:'+targetPayload) !=-1) 
        sdpLines.splice(i, 1);
    }
}

function removeRtpmapByName(sdpLines, mLineIndex, targetName)
{
  var mLineElements = sdpLines[mLineIndex].split(' ');
  var regularEq = new RegExp('a=rtpmap:(\\d+) '+targetName+'\/\\d+', 'i' );

  var targetPayload = null;
  for (var i = sdpLines.length - 1; i >= 0; i--) 
  {
    var payload = extractSdp(sdpLines[i], regularEq);

    if (payload) 
    {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);

      targetPayload = payload;
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return targetPayload;
}


function extractSdp(sdpLine, pattern) 
{
  var result = sdpLine.match(pattern);
  return result && result.length === 2 ? result[1] : null;
}


// Set the selected codec to the first in m line.
function setDefaultCodec(mLine, payload) 
{
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
