# WebRTC实现服务器中转模式的多人视频通话

免费的东西，从来都不便宜。

老实讲，面对类似WebRTC这样一个复杂系统，我的内心是忐忑的。根据以往经验，开源产品通常充斥各种未知和不确定性，任何一个走不通的细枝末节都有可能打乱整个项目计划，尤其是无法和产品研发负责人建立有效沟通渠道、官网文档找不到解决方案、通过各种搜索引擎/StackOverFlow/邮件列表等野路子也走不通的时候，会非常伤士气。本文旨在记录“**WebRTC实现服务器中转模式的多人实时通话**”项目的完整实施过程，方便想要实现类似功能的人能够复刻我们的经验，少走点弯路、少踩点坑，将精力投入到定制开发符合自身产品特点的功能上。

本文假定读者和我们一样，都是之前对WebRTC一无所知且毫无前端经验的后台研发人员，当然如果已经熟悉JavaScript语言或具备Web前端开发经验则会事半功倍。

## 项目需求分析

在正式启动之前，必须确认项目中的几个关键部分WebRTC是否能够满足：

1. 由于要实现多人实时通话，所以数据流一定要能够通过**后台服务器中转**

1. 由于可能要有录制或转直播的需求，所以中转服务一定要能**解析出媒体流的内容**

1. 由于可能会有与其他系统对接需求，所以要求视频必须**支持H264**，避免视频转码消耗（音频其实最好也能不转码，单音频转码消耗较少，暂时可以容忍）

1. 由于WebRTC媒体流基于RTP协议，中转服务是否有稳定可靠的开源实现，或者是否有RTP/RTCP/DTLS/STUN/TURN**标准协议的解析库**（全都重新实现可能代价太大）

1. 由于是多人实时通话，所以每个人都要接收多路音视频媒体流，终端是否有**混流/混音**能力

以上能力缺一不可。如果本文最终成稿，则所有能力均已具备或找到解决方案，尽可放心切入复刻我们的项目。然而目前，我们也仍在摸索阶段，慎入~

## 最初的摸索与尝试

作为WebRTC新人，自然要先花时间阅读[官网](https://webrtc.org/)推荐的一些[入门文章和视频](https://webrtc.org/start/)，大概知道什么是信令服务、什么是STUN、什么是TURN以及通话过程具体是怎么样的。随后，为了加强感性认识，我们需要下载其傻瓜示例[codelab](https://codelabs.developers.google.com/codelabs/webrtc-web)，尝试搭建示例所需要的测试环境，希望实际看下两人视频通话效果。

codelab由多个示例组成，每一个示例都会展示WebRTC的部分能力，所有示例都可以在本地Chrome上完成，只需要安装一个Chrome的Server插件即可。在这里我们会遇到第一个门槛：JavaScript语言。如果以前用过Java的话会发现语法很多都挺像，示例代码读起来也不困难，不过后面如果想对示例代码做修改的话，还是要找本书啃一下。

## 搭建独立的后台服务

在本地体验了codelab所有示例之后，我们就迫不及待地开始把服务往后台搬了（毕竟要实现后台中转嘛），在我们测试环境的服务器上，碰到了第二个坑：大公司病。我们这边网络环境分为：办公网、开发网、体验网、测试网...不同类型网络之间相互隔离，各种防火墙，各种限制策略。想要在公司测试环境服务器通过NPM下载Node.js依赖库势比登天，测试环境gcc版本低的让人落泪，编译个开源代码烦得让人心碎。于是果断抛弃公司内网环境，购买`云虚拟主机`，各种限制一扫而空，真是让人神清气爽精神百倍--除了被墙之外其他都~~嗯，挺好的

已经大体阅读过官网入门文档的我们，已经知道至少要搭两个后台服务，即：信令服务和STUN/TURN中转服务。按照codelab上演示的方案，信令服务我们选择[Node.js](https://nodejs.org/en/)+socket.io+node-static。Node.js的话去官网下载一个最新版本的二进制安装包吧，别折腾源码编译了。安装完成之后，到含有package.json的目录下执行`npm install`即可自动下载socket.io及其依赖组件。值得一提的是，由于嫌弃step-05流程写得太乱，我用socket.io新版本（1.4.7）的API重写了信令部分的逻辑，所以package.json里面socket.io的版本比step-05要新。这里又忍不住吐槽，socket.io文档写得很差，不知所云且语焉不详，平白给使用者添堵。

STUN/TURN服务就选官网推荐的[COTURN](https://github.com/coturn/coturn)（该项目是rfc5766-turn-server的升级版）。有些linux发行版里已经带了的，就可以直接使用。如果没带就从源码编译，过程也不复杂，有疑问就阅读INSTALL文档，里面内容非常详尽，真是非常好的文档范本。

上文说了，由于不满意codelab的两人视频示例代码step-05凌乱的流程和日志，我重写了部分代码，使流程和输出日志更清晰易读，有兴趣可以通过<https://github.com/eddiexue/BetterStep05>获取源码。在云主机上clone代码之后，按下面的步骤安装好依赖工具，执行`node js/server/https_svr_handler.js`即可启动服务。

**特别提醒**，由于安全性的考虑，从Chrome版本47开始，[通道加密](http://webrtc-security.github.io/)成为WebRTC强制属性，而且加密方式仍在不断升升级。于是信令服务必须使用HTTPs【大坑1】、而STUN/TURN服务则必须使用域（realm）验证方能走通【大坑2】。另一个对实际使用有好处、但给测试验证造成大麻烦的是，最新版本浏览器都启用了端到端的数据加密，使得我们难以通过抓包来观察RTP、STUN/TRUN Message所携带的音视频原始内容，而**端到端加密的流程和处理方式又语焉不详**（我好像很喜欢这个词？）【大坑3】，为了能获得原始音视频payload，我们又被迫花时间去研究ICE、DTLS流程和数据解密方法。真是一步一坑啊~

### 云主机相关工具安装

  1. yum install gcc git expat-devel curl-devel 
  1. yum install openssl-devel
  1. yum install lrzsz #装这个主要为了rz/sz，上传/下载个文件比较方便

### 信令服务HTTPs证书生成

HTTPs服务所使用的证书生成过程如下所示（由于不是权威认证机构签发的证书，所以浏览器会有警告）：
1. openssl genrsa -out privatekey.pem 1024 //生成私钥
1. openssl req -new -key privatekey.pem -out certrequest.csr //用私钥生成证书
1. openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem //用自己的私钥给自己的证书签名，浏览器会提示不安全，但好歹能自测用
生成的证书放在源码根目录的cert文件夹里，服务代码`https_svr_handler.js`里会使用到。

如果觉得自己测试不想用HTTPs这么麻烦，还可以在Chrome启动参数增加：
1. --unsafely-treat-insecure-origin-as-secure="http://ServerIP:ServerPort" 
1. --user-data-dir=/path/to/chromeCache/

注意两个参数缺一不可，而且Google老大留这个后门也不大情愿，我们最好也从了老大的意思，别这么搞了。

### STUN/TURN服务的安装

  1. yum install perl-ExtUtils-CBuilder perl-ExtUtils-MakeMaker #coturn需要的工具
  1. yum install sqlite-devel libevent-devel #coturn需要这个库
  1. ./configure --prefix=/root/turnserver --bindir=/root/turnserver/bin64 --confdir=/root/turnserver/conf ##目录参数可以自己改
  1. make & make install
  1. 修改缺省的turnserver.conf文件：
      - 将配置文件的里面的realm域启用，任意字符串应该都可以，我们填了TENCENT
      - 将配置文件中的use-auth-secret选项启用
      - 将配置文件中的static-auth-secret选项填一个任意字符串作为加密秘钥，服务端代码`https_svr_handler.js`会用来具体生成访问STUN/TURN服务所需的username和credential

一切准备就绪之后，可以用`node js/server/https_svr_handler.js`启动信令服务，用`turnserver -c path-to-conf/turnserver.conf`启动STUN/TURN服务。在浏览器侧，输入`https://x.x.x.x:8888`（端口是在`https_svr_handler.js`里指定的）启动两个tab即可看到双人通话的效果。在后台控制台和Chrome浏览器控制台（MAC：ctl+cmd+j）都可以看到流程相关的log输出。

折腾这么久，终于跑通了，吐血撰文以记之，万里长征第0步。

## 强制媒体数据走中转的尝试

基于远程CVM的信令服务和STUN/TURN服务的P2P通话跑通以后，我们就开始琢磨如何强制让浏览器把音视频数据也走中转。根据ICE的流程，会依次尝试host（局域网直连）、srflx（打洞直连）、relay（服务器中转）三种通道，并在下图中的交换candidate阶段确定连接方式，所以我们只需要在candidate的选择环节上屏蔽host和srflx的通路即可达到目的。

![CreateAVChat](https://raw.githubusercontent.com/satanas/simple-signaling-server/master/doc/RTCPeerConnection-diagram.png)

```javascript
//BetterStep05: js/server/https_client.js
var wantHostMode      = false;
var wantReflexiveMode = false;
var wantRelayMode     = true; //此时此刻我们只想要后台中转模式

var isHost = (ice.candidate.indexOf('typ host') !== -1);
var isSrflx = (ice.candidate.indexOf('srflx') !== -1);
var isRelay = (ice.candidate.indexOf('relay') !== -1);
var candidateType = isHost?'host':(isSrflx?'srflx':'relay');

if(wantHostMode && ice.candidate.indexOf('typ host') == -1) 
    return;

if(wantReflexiveMode && ice.candidate.indexOf('srflx') == -1) 
    return;

if(wantRelayMode && ice.candidate.indexOf('relay') == -1) 
    return;

sendMsgToOthers(略)
```

## 强制视频使用H264编码的尝试

由于我们希望WebRTC能够和我们现有的多人通话系统对接，而我们目前编解码都是采用H264和AAC，所以此时我们希望指定浏览器只使用H264来编码视频流。幸运的是，Chrome版本52已经支持了H264，而如果我们更早启动这个项目可能到这一步就夭折了~~

通过上面一节我们知道，终端能力和通道都是通过信令交互完成的，而信令交互的内容是SDP，所以我们只需要正确调整SDP的内容即可达到目的。在粗略研究SDP字段含义之后，我们发现在setLocalDescription()之前，把`m=video xxxx`里面描述的视频编码类型的顺序改变一下，即把代表H264的type:107放在前面，浏览器就会优先选择H264（当然前提是两方浏览器都支持H264），看来浏览器是按照SDP中的顺序来确定优先级的。虽然按照上面的方法处理也可以，但是有洁癖的我们想把VP8和VP9都干掉，免得后面测试碍事，但由于对SDP缺乏了解，又没有困难制造了一把困难。

上面已经提到，浏览器支持的视频编码格式的类型列表是在`m=video`属性中指定的，例如：`m=video 9 UDP/TLS/RTP/SAVPF 107 99 98 97`，然后在下面会有每一个编码类型的关联配置，比如：
```
m=video 9 UDP/TLS/RTP/SAVPF 107 99 98 97
a=rtpmap:107 H264/90000
a=rtcp-fb:107 ccm fir
...
a=rtpmap:99 rtx/90000
a=fmtp:99 apt=107
a=rtpmap:98 VP9/90000
a=rtcp-fb:98 ccm fir
...
a=fmtp:97 apt=98
```

如上所示，H264类型107、VP9类型98。我们不想要VP9在SDP里面碍眼，于是就删除了`m=video`里的98和`a=xx`里和98相关的行，一运行就报下面的错误（欲哭无泪）

```javascript
Uncaught (in promise) DOMException: Failed to set local offer sdp: Session error code: ERROR_CONTENT. Session error description: Failed to set local video description recv parameters..
```

在失败和摸索中挣扎了许久之后，我们发现原来光删除和type:98相关的内容还不够，如果有和98相关联的属性中包含了其他编码类型，那么被关联的这个类型的所有信息也要被删除，以此类推。也就是说，虽然我们删除了含有98的所有行，但是由于存在`a=fmtp:97 apt=98`，所以所有和type:97相关的内容也都要被删除，由此递归进行直到所有关联内容被删干净为止。这段代码在，https_client.js中preferH264(sdp)中实现，如果嫌麻烦还是用开始说的简单方法处理好了，我是想留个折腾的纪念所以没删掉这段较长的SDP处理代码。。。

## 附录

### 关于开发工具的建议
这里大力推荐一下 **Visual Studio code（VSC）**，微软在开发工具方面实力确实深不可测，Sublime啥的可以退散了。[基本的编辑功能](http://code.visualstudio.com/docs/editor/codebasics)全面而方便；搭配GTags，查看代码的便利程度直逼SourceInsight（守着一个只有Windows版本、常年不更新、中文支持差的收费软件有意思？）；集成Node.js的本地调试能力；集成git工具，搭配命令行窗口，通过github进行远程协作和多人协作非常方便；好用的插件越来越多...作为一个轻量的“编辑器”，已经满足了我的所有需要

### 关于抓包设置的建议

研究WebRTC，抓包分析是必不可少的。然而官方文档有关wireshark抓包的指引内容太老（https://webrtc.org/testing/wireshark/），2.0以上版本的wireshark查看rtp协议的地方变了，用的时候Google一下吧。

### 关于打开Chrome详细log的方法（MacOS）

默认情况下，浏览器是没什么输出的，给问题定位造成了不小的障碍。在BetterStep05根目录下有一个start_chrome.sh的脚本，里面包含了一些log过滤规则，读者可以自行尝试修改。此外，chrome://version/可以查看chrome启动的命令行参数和可执行文件目录，chrome://webrtc-internals、chrome://webrtc-logs对定位问题也有一定的帮助

### 一个仅保留后台中转模式（relay）、视频只使用H264编码的SDP片段

```sdp
v=0
o=- 5515643570159031865 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE video
a=msid-semantic: WMS boZGr3yqoqSPSDYHJKEu9fU9Gpq57qMWnJGp

//下面这行用于表示所支持的视频编码类型
m=video 9 UDP/TLS/RTP/SAVPF 107 99

c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:c6ZD
a=ice-pwd:Eryn2erIzCEd/ZglqOEsJMjy
a=fingerprint:sha-256 3E:EB:FF:87:4D:1A:53:4D:06:2A:1F:57:F0:7C:D4:31:D5:E5:C2:1C:80:F7:D4:F7:37:86:D2:10:47:A2:87:BB
a=setup:actpass
a=mid:video
...略...
a=sendrecv
a=rtcp-mux
a=rtcp-rsize

//视频编码的具体参数，注意a=fmtp:99 apt=107，如果107和99同时出现，那么99相应的行也要保留
//与之相反，对于不想要的编码方式，如果其类型出现在其他行，那么该行里所含的类型也要全部删除
a=rtpmap:107 H264/90000
a=rtcp-fb:107 ccm fir
a=rtcp-fb:107 nack
a=rtcp-fb:107 nack pli
a=rtcp-fb:107 goog-remb
a=rtcp-fb:107 transport-cc
a=fmtp:107 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f
a=rtpmap:99 rtx/90000
a=fmtp:99 apt=107

a=ssrc-group:FID 3982266123 424105406
a=ssrc:3982266123 cname:vX6Qq/R0j9D8F5gN
...下略
```


