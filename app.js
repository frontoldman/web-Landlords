/**
 * Created by Administrator on 14-2-23.
 */
var express = require('express')
    , app = express()
    , server = require('http').createServer(app)
    , io = require('socket.io').listen(server)
    , connect = require('connect')
    , cookie  = require('cookie')
    , parseCookie = connect.utils.parseSignedCookies
    , mySocket = require('./socket-msg/socket');


server.listen(80);

app.use(express.static('./static'));
app.use(express.urlencoded());//解析post
app.use(express.cookieParser());//解析cookie
app.use(express.cookieSession({
    secret: 'zr'
}));



app.get('/landlords', function (req, res) {
    req.session.user = Math.random();
    res.sendfile(__dirname + '/index.html');
});

io.set('log level', 1);

io.set('authorization', function(handshakeData, callback){
    handshakeData.cookie = parseCookie(cookie.parse(decodeURIComponent(handshakeData.headers.cookie)),'zr')
    var connect_sid = handshakeData.cookie['connect.sess'];
    if (connect_sid) {
        var sess = connect_sid.substring(2);
        sess = JSON.parse(sess);
        handshakeData.session = sess;
        callback(null, true);
    }
    else {
        callback('no session');
    }
});

io.sockets.on('connection', mySocket);



