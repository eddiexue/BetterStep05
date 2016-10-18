这里借鉴的是<http://blog.csdn.net/u011244942/article/details/49306777>的说明.

```
//生成私钥
openssl genrsa -out privatekey.pem 1024
//用私钥生成证书
openssl req -new -key privatekey.pem -out certrequest.csr
//用自己的私钥给自己的证书签名，浏览器会提示不安全，但好歹能自测用
openssl x509 -req -in certrequest.csr -signkey privatekey.pem -out certificate.pem
```

关于证书、签名更多信息可以查阅<http://www.cnblogs.com/kyrios/p/tls-and-certificates.html>另外:还可以参考<http://cnodejs.org/topic/54745ac22804a0997d38b32d>