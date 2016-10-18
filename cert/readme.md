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


Namespace {
  name: '/',
  server: 
   Server {
     nsps: { '/': [Circular] },
     _path: '/socket.io',
     _serveClient: true,
     _adapter: [Function: Adapter],
     _origins: '*:*',
     sockets: [Circular],
     
     eio: 
      Server {
        clients: [Object],
        clientsCount: 1,
        wsEngine: undefined,
        pingTimeout: 60000,
        pingInterval: 25000,
        upgradeTimeout: 10000,
        maxHttpBufferSize: 100000000,
        transports: [Object],
        allowUpgrades: true,
        allowRequest: [Function: bound ],
        cookie: 'io',
        cookiePath: false,
        perMessageDeflate: [Object],
        httpCompression: [Object],
        ws: [Object],
        _events: [Object],
        _eventsCount: 1 
        },

     httpServer: 
      Server {
        _contexts: [],
        requestCert: false,
        rejectUnauthorized: false,
        key: <Buffer 2d 2d 2d 2d 2d 42 45 47 49 4e 20 52 53 41 20 50 52 49 56 41 54 45 20 4b 45 59 2d 2d 2d 2d 2d 0a 4d 49 49 43 58 51 49 42 41 41 4b 42 67 51 43 6f 79 44 ... >,
        cert: <Buffer 2d 2d 2d 2d 2d 42 45 47 49 4e 20 43 45 52 54 49 46 49 43 41 54 45 2d 2d 2d 2d 2d 0a 4d 49 49 43 41 54 43 43 41 57 6f 43 43 51 43 55 6a 33 5a 71 54 73 ... >,
        honorCipherOrder: true,
        NPNProtocols: <Buffer 08 68 74 74 70 2f 31 2e 31 08 68 74 74 70 2f 31 2e 30>,
        ALPNProtocols: <Buffer 08 68 74 74 70 2f 31 2e 31>,
        sessionIdContext: 'a4a426858cea1aed4f1ee48ac157a2a9',
        _sharedCreds: [Object],
        domain: null,
        _events: [Object],
        _eventsCount: 6,
        _maxListeners: undefined,
        _connections: 4,
        _handle: [Object],
        _usingSlaves: false,
        _slaves: [],
        _unref: false,
        allowHalfOpen: false,
        pauseOnConnect: false,
        httpAllowHalfOpen: false,
        timeout: 120000,
        _connectionKey: '6::::8888' 
        },

     engine: 
      Server {
        clients: [Object],
        clientsCount: 1,
        wsEngine: undefined,
        pingTimeout: 60000,
        pingInterval: 25000,
        upgradeTimeout: 10000,
        maxHttpBufferSize: 100000000,
        transports: [Object],
        allowUpgrades: true,
        allowRequest: [Function: bound ],
        cookie: 'io',
        cookiePath: false,
        perMessageDeflate: [Object],
        httpCompression: [Object],
        ws: [Object],
        _events: [Object],
        _eventsCount: 1 
        } 
    },

  sockets: 
   { MAmN1CqnyzyLh8UPAAAB: 
      Socket {
        nsp: [Circular],
        server: [Object],
        adapter: [Object],
        id: 'MAmN1CqnyzyLh8UPAAAB',
        client: [Object],
        conn: [Object],
        rooms: [Object],
        acks: {},
        connected: true,
        disconnected: false,
        handshake: [Object],
        _events: [Object],
        _eventsCount: 2 
        } 
    },

  connected: 
   { MAmN1CqnyzyLh8UPAAAB: 
      Socket {
        nsp: [Circular],
        server: [Object],
        adapter: [Object],
        id: 'MAmN1CqnyzyLh8UPAAAB',
        client: [Object],
        conn: [Object],
        rooms: [Object],
        acks: {},
        connected: true,
        disconnected: false,
        handshake: [Object],
        _events: [Object],
        _eventsCount: 2 
        } 
    },
  fns: [],
  ids: 0,
  adapter: 
   Adapter {
     nsp: [Circular],
     rooms: { MAmN1CqnyzyLh8UPAAAB: [Object] },
     sids: { MAmN1CqnyzyLh8UPAAAB: [Object] },
     encoder: Encoder {} },
  _events: { connection: [Function] },
  _eventsCount: 1 }