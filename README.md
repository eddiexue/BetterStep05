# WebRTC实现服务器中转模式的多人视频通话

免费的东西，从来都不便宜。

老实讲，面对类似WebRTC这样一个复杂系统，我的内心是忐忑的。根据以往经验，开源产品通常充斥各种未知和不确定性，任何一个走不通的细枝末节都有可能打乱整个项目计划，尤其是无法和产品研发负责人建立有效沟通渠道、官网文档找不到解决方案、通过各种搜索引擎/StackOverFlow/邮件列表等野路子也走不通的时候，会非常伤士气。本文旨在记录“**WebRTC实现服务器中转模式的多人实时通话**”项目的完整实施过程，以方便其他想要实现类似功能的组织或个人能够复刻我们的经验，少走点弯路、少踩点坑，将精力投入到定制开发符合自身产品特点的功能上。

本文假定读者和我们一样，都是之前对WebRTC一无所知、毫无前端技术经验的后台研发人员，当然如果已经有JavaScript和Web前端开发经验更好。

## 项目需求分析

在正式启动之前，必须确认项目中的几个关键部分WebRTC是否能够满足：

1. 由于要实现多人实时通话，所以数据流一定要能够通过**后台服务器中转**

1. 由于可能要有录制或转直播的需求，所以中转服务一定要能**解析出媒体流的内容**

1. 由于可能会有与其他系统对接需求，所以要求视频必须**支持H264**，避免视频转码消耗（音频其实最好也能不转码，单音频转码消耗较少，暂时可以容忍）

1. 由于WebRTC媒体流基于RTP协议，中转服务是否有稳定可靠的开源实现，或者是否有RTP/RTCP/DTLS**标准协议的解析库**（全都重新实现可能代价太大）

1. 由于是多人实时通话，所以每个人都要接收多路音视频媒体流，终端是否有**混流/混音**能力

以上能力缺一不可。如果本文最终成稿，则所有能力均已具备或找到解决方案，尽可放心切入复刻我们的项目。目前，我们也仍在摸索阶段，慎入~

## 最初的摸索与尝试

作为WebRTC新人，自然要先花时间阅读[官网](https://webrtc.org/)推荐的一些[入门文章和视频](https://webrtc.org/start/)，大概知道什么是信令服务、什么是STUN、什么是TURN以及通话过程具体是怎么样的。随后，为了加强感性认识，我们需要下载其傻瓜示例[codelab](https://codelabs.developers.google.com/codelabs/webrtc-web)，尝试搭建示例所需要的测试环境，希望实际看下两人视频通话效果。

codelab由多个示例组成，每一个示例都会展示WebRTC的部分能力，所有示例都可以在本地Chrome上完成，只需要安装一个Chrome的Server插件即可。在这里我们会遇到第一个门槛：JavaScript语言。如果以前用过Java的话会发现语法很多都挺像，示例代码读起来也不困难，不过后面如果想对示例代码做修改的话，还是要找本书啃一下。

** 这里大力推荐一下 **Visual Studio code（VSC）**，用了之后深感微软在开发工具方面实例深不可测，Sublime啥的可以退散了。基本的编辑功能全面而方便；搭配GTags，查看代码的方便程度直逼SourceInsight（守着一个只有Windows版本、常年不更新、中文支持差的收费软件有意思？）；集成Node.js的本地调试能力；集成git工具，搭配命令行窗口，通过github进行远程协作和多人协作非常方便；好用的插件越来越多...作为一个轻量的编辑器，已经满足了我的所有需要

## 搭建独立的后台信令服务

在本地体验了codelab所有示例之后，我们就迫不及待地开始把服务往后台搬了（毕竟要实现后台中转嘛），在我们测试环境的服务器上，碰到了第二个坑：大公司病。我们这边网络环境分为：办公网、开发网、体验网...不同类型网络之间相互隔离，各种防火墙，各种限制策略（比如办公网不能checkout代码，开发网不能访问外网，体验网不能访问OA...）。想要在公司测试环境服务器通过NPM下载Node.js依赖库势比登天，测试环境gcc版本低的让人落泪，编译个开源代码烦得让人心碎。于是果断抛弃公司内网环境，购买`云虚拟主机`，各种限制一扫而空，真是让人神清气爽、精神百倍。不过云主机会被墙的问题又会惹来其他麻烦，访问google代码仓库的时候各种超时，又让人怀念公司的香港代理，真是矛盾呀~~两权相害取其轻，决定前期先不研究WebRTC源码，先搞清楚项目需求分析提到的几项内容。

### 安全相关的问题
关于信令服务的安全设置
关于STUN/TRUN服务的安全设置
关于如何查看查看视频裸流的办法？

### 在SDP中设置H264优先
删除VP8/VP9/H264任意一个都会报错，只能调整其位置
删除red/90000会报解析错误，尚未解决？

```javascript
Uncaught (in promise) DOMException: Failed to set local offer sdp: Session error code: ERROR_CONTENT. Session error description: Failed to set local video description recv parameters..
```

### 调试环境的问题
公司内网各种限制，安装开源软件各种麻烦
wireshark抓包，官网版本旧了，2.0以上版本位置变了
chrome如何打开更详细的log
mac下的VSC真心好用，编辑功能强大自不必说，支持md、能直接调试node.js、能直接commit、能在界面下方开终端窗口方便命令行操作

### 一个可更好的Step-05示例代码

## 多人实时视频通话场景？
多个人怎么互相交换SDP？
多个人观看是自动做的混音、混流？




1. 购买了一台腾讯云虚拟主机（CentOS），装了gcc、git
  1. yum install perl-ExtUtils-CBuilder perl-ExtUtils-MakeMaker 
  1. yum install expat-devel  curl-devel openssl-devel
  1. yum install lrzsz ,不装这个就没有rz/sz
1. 在github上clone了coturn项目（该项目rfc5766-turn-server的升级版），源码也clone到虚拟主机上
1. 编译和运行coturn
  1. 需要Libevent2: yum install libevent-devel
  1. 需要跟一个DB，CentOS带了SQLite3，所以这个先不用换
  1. ./configure
  1. ./configure --prefix=/root/turnserver --bindir=/root/turnserver/bin64 --confdir=/root/turnserver/conf
  1. make & make install
1. 安装node.js（https://nodejs.org/）
1. 下载最简单的例子wbrtc-web，在step-05说明了如何用socket.io/node-static/node.js来搭建后台信令服务（实际就是HTTPSVR）
  1. step-04里面有package.json文件，里面的dependencies写明了依赖soket.io/node-static
  1. 用node.js的安装工具npm，执行npm install即可自动下载这两个module以及相关的依赖（自动生成一个node_modules目录）
  1. node index.js启动服务，用chrome就可以实现例子里的功能
1. Chrome从47版本开始就不允许非https连接了，这就坑苦了用官方例子的同仁，看样子解决方案有两个
  1. node.js和turnserver支持https，需要改下server代码。自己签个私有证书凑合用
  1. 启动Chrome时设定参数：/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --unsafely-treat-insecure-origin-as-secure="http://119.29.28.242:8080" --user-data-dir=/Users/eddiexue/Tencent/Projects/rtclab，注意两个参数缺一不可，第二个参数主要用于指定Chrome的数据缓存目录

到这一步好运气基本用完，由于webrtc和后端node.js的api都是基于JavaScript的，不熟悉一下语法寸步难行，于是下载《JavaScript高级程序设计(第3版)》、《JavaScript语言精粹（修订版）》先看几天。熟悉完语法，就可以着手准备webrtc中转模式了。

chrome://version/，可以查看chrome启动的命令行参数和可执行文件目录
可以参考start_chrome.sh的方式启动chrome，可以多打出一些信息，不过还要进一步研究研究!!
这个是可以有的!!!!!!!!!!

VSC的使用指南，参考http://code.visualstudio.com/docs/editor/codebasics

STUN/TURN配置
1、必须全面支持安全设置
2、使用realm域
3、必须启用use-auth-secret，并搭配加密秘钥static-auth-secret=4080218913，用户名:密码的形式不再可用

//@TODO: 修改SDP的内容，使其生成h264内容

wireshark抓包，官方文档指引里的版本太老（https://webrtc.org/testing/wireshark/），新版本查看rtp协议的地方变了

对标准不熟悉，DTLS、RTP/RTCP、STUN/TRUN!!!!!!



"v=0
↵o=- 5515643570159031865 2 IN IP4 127.0.0.1
↵s=-
↵t=0 0
↵a=group:BUNDLE video
↵a=msid-semantic: WMS boZGr3yqoqSPSDYHJKEu9fU9Gpq57qMWnJGp
↵m=video 9 UDP/TLS/RTP/SAVPF 107 99
↵c=IN IP4 0.0.0.0
↵a=rtcp:9 IN IP4 0.0.0.0
↵a=ice-ufrag:c6ZD
↵a=ice-pwd:Eryn2erIzCEd/ZglqOEsJMjy
↵a=fingerprint:sha-256 3E:EB:FF:87:4D:1A:53:4D:06:2A:1F:57:F0:7C:D4:31:D5:E5:C2:1C:80:F7:D4:F7:37:86:D2:10:47:A2:87:BB
↵a=setup:actpass
↵a=mid:video
↵a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
↵a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
↵a=extmap:4 urn:3gpp:video-orientation
↵a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay
↵a=sendrecv
↵a=rtcp-mux
↵a=rtcp-rsize
↵a=rtpmap:107 H264/90000
↵a=rtcp-fb:107 ccm fir
↵a=rtcp-fb:107 nack
↵a=rtcp-fb:107 nack pli
↵a=rtcp-fb:107 goog-remb
↵a=rtcp-fb:107 transport-cc
↵a=fmtp:107 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f
↵a=rtpmap:99 rtx/90000
↵a=fmtp:99 apt=107
↵a=ssrc-group:FID 3982266123 424105406
↵a=ssrc:3982266123 cname:vX6Qq/R0j9D8F5gN
↵a=ssrc:3982266123 msid:boZGr3yqoqSPSDYHJKEu9fU9Gpq57qMWnJGp 9b5c62b1-6639-4b22-b536-4219054195dd
↵a=ssrc:3982266123 mslabel:boZGr3yqoqSPSDYHJKEu9fU9Gpq57qMWnJGp
↵a=ssrc:3982266123 label:9b5c62b1-6639-4b22-b536-4219054195dd
↵a=ssrc:424105406 cname:vX6Qq/R0j9D8F5gN
↵a=ssrc:424105406 msid:boZGr3yqoqSPSDYHJKEu9fU9Gpq57qMWnJGp 9b5c62b1-6639-4b22-b536-4219054195dd
↵a=ssrc:424105406 mslabel:boZGr3yqoqSPSDYHJKEu9fU9Gpq57qMWnJGp
↵a=ssrc:424105406 label:9b5c62b1-6639-4b22-b536-4219054195dd
↵"