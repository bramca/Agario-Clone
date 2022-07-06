//require stuff
var express = require('express');
var bodyparser = require('body-parser');
var path = require("path");
var login = require("./routes/login.js");
var register = require("./routes/register.js");
var menu = require("./routes/menu.js");
var logout = require("./routes/logout.js");
var highscores = require("./routes/highscores.js");
var game = require("./routes/game.js");
const pug = require('pug');
var fs = require("fs");
var session = require('express-session')

var app = express();
global.users = {};

/*
    x live highscore
    ingame menu
    x opeten
    x replace
    x loggedIn boolean per client
*/

app.use(session({
    secret: 'agario12345',
    resave: false,
    saveUninitialized: true
}));

//Set views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, './public')));

//use bodyparser
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());

//Check if the user is already logged in, if not redirect to the login page
app.use(function (req, res, next) {
    if (!global.users[req.sessionID]) {
        global.users[req.sessionID] = {};
    }
    if (req.url != "/login" && req.url != "/register") {
        if (!global.users[req.sessionID].loggedIn) {
            res.redirect("/login");
        }
        else {
            if (req.url == "/") {
                req.url = "/menu";
            }
            next();
        }
    }
    else {
        next();
    }
});


//routes
app.use("/login", login);
app.use("/register", register);
app.use("/menu", menu);
app.use("/logout", logout);
app.use("/highscores", highscores);
app.use("/game", game);

//server
var server = app.listen(3000, function () {
    var host = server.address().address
    var port = server.address().port

    console.log("Example app listening at http://%s:%s", host, port)
});

//websockets
function randomcolor() {
    return '#' + (function co(lor) {
        return (lor +=
            [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'a', 'b', 'c', 'd', 'e', 'f'][Math.floor(Math.random() * 16)])
            && (lor.length == 6) ? lor : co(lor);
    })('');
}
var clients = {};
var io = require('socket.io')(server);
var field = { width: 1200, height: 1200 };
var blobs = [];
var blobradius = 5;
var maxblobs = 200;
highscores = {};
for (var i = 0; i < 3; i++) {
    highscores[i] = {};
    highscores[i].score = 0;
}
for (var i = 0; i < maxblobs; i++) {
    blobs.push({ x: Math.random() * 2 * (field.width - blobradius) - field.width + blobradius, y: Math.random() * 2 * (field.height - blobradius) - field.height + blobradius, r: blobradius, color: randomcolor() });
}
io.on('connection', function (client) {
    console.log(global.timestamp() + "\tclient connected: " + client.id);
    clients[client.id] = client;

    client.emit('sendfield', blobs);

    client.emit("updatehighscores", { highsc: highscores });

    client.on('updateplayerposition', function (data) {
        for (var key in clients) {
            if (key != this.id) {
                clients[key].emit('playerupdate', { id: this.id, player: data });
            }
        }
    });

    client.on("sendID", function (data) {
        clients[this.id].sessionID = data.sessionID;
        client.emit('getName', { name: global.users[data.sessionID].name });
    });
    client.on('removeblob', function (data) {
        blobs[data.index] = { x: Math.random() * 2 * (field.width - blobradius) - field.width + blobradius, y: Math.random() * 2 * (field.height - blobradius) - field.height + blobradius, r: blobradius, color: randomcolor() };
        for (var key in clients) {
            clients[key].emit('updatefield', { newBlob: blobs[data.index], index: data.index });
        }
    });

    client.on('disconnect', function () {
        console.log(global.timestamp() + "\tclient disconnected: " + this.id);
        for (var key in clients) {
            if (key != this.id) {
                clients[key].emit('playerdisconnect', { id: this.id });
            }
        }
        for (var key in highscores) {
            if (highscores[key].sessionID === clients[this.id].sessionID && highscores[key].socketID === this.id) {
                highscores[key] = {};
                highscores[key].score = 0;
            }
        }
        writeHighScore(global.users[this.sessionID].name, this.score);
        delete clients[this.id];
    });

    client.on("removeplayer", function (data) {
        console.log(global.timestamp() + "\tremove player: " + data.socketID);
        if (clients[data.socketID]) {
            clients[data.socketID].emit("gameover");
        }
    });

    client.on("sendremovepiece", function (data) {
        clients[data.socketID].emit("removepiece", { index: data.index });
    });

    client.on("updateclientscore", function (data) {
        this.score = data.score;
        for (var key in highscores) {
            if (data.score > highscores[key].score || (data.sessionID === highscores[key].sessionID && highscores[key].socketID === data.socketID)) {
                highscores[key].name = data.name;
                highscores[key].score = data.score;
                highscores[key].sessionID = data.sessionID;
                highscores[key].socketID = data.socketID;
                for (var other in highscores) {
                    if (other != key) {
                        if (highscores[other].sessionID === data.sessionID && highscores[other].socketID === data.socketID) {
                            highscores[other] = {};
                            highscores[other].score = 0;
                            break;
                        }
                    }
                }
                break;
            }
        }
        for (var key in clients) {
            clients[key].emit("updatehighscores", { highsc: highscores });
        }

    })
});




function writeHighScore(name, score) {
    fs.open('highscores.db', 'a', function (err, fd) {
        if (err) {
            return console.error(err);
        }
        buffer = new Buffer(name + ":" + score+"\n");
        fs.write(fd, buffer, 0, buffer.length, null, function (err) {
            if (err) throw 'error writing file: ' + err;
            fs.close(fd, function () {
                console.log(global.timestamp() + "\tWritten highscore " + name + " " + score);
            })
        });
    });

}


//Timestamp
global.timestamp = function () {
    let date = new Date();
    return (date.getHours() < 10 ? '0' : '') + date.getHours() + ":" + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes() + ":" + (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
};

module.exports = app;
