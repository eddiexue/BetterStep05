# WebRTC实现服务器中转模式的多人视频会议
## 双人实时视频通话场景

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