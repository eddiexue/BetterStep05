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