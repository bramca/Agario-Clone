var c;
var player;
var blobs = [];
var startradius = 20;
var blobradius = 5;
var zoom = 1;
var field = { width: 1200, height: 1200 };
var socket = io();
socket.connect();
var otherplayers = {};
var playerbot = { on: false };
var sessionID;

var highscores = {};

var sketch = function (p) {
    p.setup = function () {
        sessionID = document.getElementById("clientName").textContent;
        c = p.createCanvas(window.innerWidth, window.innerHeight);
        document.getElementById('canvascontainer').appendChild(c.canvas);
        document.body.scrollTop = 0;
        document.body.style.overflow = 'hidden';
        player = new Blob(p.random(-field.width + startradius, field.width - startradius), p.random(-field.height + startradius, field.height - startradius), startradius, randomcolor());
        socket.emit("sendID",{sessionID:sessionID});
        socket.on('sendfield', function (data) {
            for (var i = 0; i < data.length; i++) {
                blobs[i] = new Blob(data[i].x, data[i].y, data[i].r, data[i].color);
            }
        });
        socket.on('updatefield', function (data) {
            blobs[data.index] = new Blob(data.newBlob.x, data.newBlob.y, data.newBlob.r, data.newBlob.color);
        });
        socket.on('playerupdate', function (data) {
            if (!otherplayers[data.id]) {
                otherplayers[data.id] = new Blob(data.player.x, data.player.y, data.player.r, data.player.color);
                otherplayers[data.id].name = data.player.name;
                otherplayers[data.id].pieces = [];
                for (var i = 0; i < data.player.pieces.length; i++) {
                    var piece = data.player.pieces[i];
                    var otherplayerpiece = new Blob(piece.x, piece.y, piece.r, piece.color);
                    otherplayerpiece.name = piece.name;
                    otherplayers[data.id].pieces[i] = otherplayerpiece;
                }
            } else {
                otherplayers[data.id].pos.x = data.player.x;
                otherplayers[data.id].pos.y = data.player.y;
                otherplayers[data.id].r = data.player.r;
                otherplayers[data.id].name = data.player.name;
                for (var i = 0; i < data.player.pieces.length; i++) {
                    var piece = data.player.pieces[i];
                    if (otherplayers[data.id].pieces[i]
                        && data.player.pieces.length >= otherplayers[data.id].pieces.length) {
                        otherplayers[data.id].pieces[i].pos.x = piece.x;
                        otherplayers[data.id].pieces[i].pos.y = piece.y;
                        otherplayers[data.id].pieces[i].r = piece.r;
                        otherplayers[data.id].pieces[i].name = piece.name;
                    } else {
                        var otherplayerpiece = new Blob(piece.x, piece.y, piece.r, piece.color);
                        otherplayerpiece.name = piece.name;
                        otherplayers[data.id].pieces[i] = otherplayerpiece;
                    }
                }
                otherplayers[data.id].pieces.splice(i, otherplayers[data.id].pieces.length-i);
            }
        });
        socket.on('playerdisconnect', function (data) {
            delete otherplayers[data.id];
        });
        socket.on('getName', function (data) {
            player.name = data.name;
        });
        socket.on("gameover",function () {
            window.location.href = "/menu";
        });
        socket.on("updatehighscores",function (data) {
            highscores = data.highsc;
        });
        socket.on("removepiece", function (data) {
            player.pieces.splice(data.index, 1);
        });
    };

    p.draw = function () {
        p.background(0);
        drawScore();
        p.translate(c.width/2, c.height/2);
        // zoom
        // if (player.r > 50) {
        //     var newzoom = startradius / player.r;
        //     zoom = p.lerp(zoom, newzoom, 0.1);
        // }
        // p.scale(zoom);
        p.translate(-player.pieces[0].pos.x, -player.pieces[0].pos.y);

        p.stroke(255);
        p.line(-field.width, -field.height, -field.width, field.height);
        p.line(-field.width, field.height, field.width, field.height);
        p.line(field.width, field.height, field.width, -field.height);
        p.line(field.width, -field.height, -field.width, -field.height);

        blobs.forEach(function (blob, i) {
            if(blob ){
                blob.show();
                player.pieces.forEach(function (piece, j) {
                    if (piece.eat(blob)){
                        blobs[i] = undefined;
                        socket.emit('removeblob', { index: i });
                    }
                });
            }
        });

        player.pieces.forEach(function (piece, i) {
            for (var j = 0; j < player.pieces.length; j++) {
                if (i != j  && player.pieces[j].eatable && piece.eatable && piece.eat(player.pieces[j])) {
                    piece.acc = false;
                    player.pieces[j].acc = false;
                    player.pieces.splice(j, 1);
                }
            }
        })

        p.stroke(0);
        for (var key in otherplayers) {
            if (!otherplayers[key].removed) {
                otherplayers[key].show();
                for (var j = 0; j < otherplayers[key].pieces.length; j++) {
                    for (var i = 0; i < player.pieces.length; i++) {
                        if (!otherplayers[key].pieces[j].removed && player.pieces[i].eat(otherplayers[key].pieces[j])) {
                            otherplayers[key].pieces[j].removed = true;
                            socket.emit("sendremovepiece", { socketID: key, index: j });
                        }
                    }
                }
                otherplayers[key].removed = true;
                for (var i = 0; i < otherplayers[key].pieces.length; i++) {
                    if (!otherplayers[key].pieces[i].removed) {
                        otherplayers[key].removed = false;
                    }
                }
                if (otherplayers[key].removed) {
                    socket.emit("removeplayer",{ socketID: key, score:otherplayers[key].getScore(), name:otherplayers[key].name });
                }
            }
        }
        player.show();
        if (playerbot.on) {
            if (playerbot.target && blobs[playerbot.target]
                && c.width/2 - (player.pos.x - blobs[playerbot.target].pos.x) < c.width
                && c.width/2 - (player.pos.x - blobs[playerbot.target].pos.x) > 0
                && c.height/2 - (player.pos.y - blobs[playerbot.target].pos.y) < c.height
                && c.height/2 - (player.pos.y - blobs[playerbot.target].pos.y) > 0) {
                p.mouseX = c.width/2 - (player.pos.x - blobs[playerbot.target].pos.x);
                p.mouseY = c.height/2 - (player.pos.y - blobs[playerbot.target].pos.y);
            } else {
                playerbot.target = Math.floor(Math.random() * blobs.length);
            }
        }
        player.update();
        var playerpieces = [];
        for (var i = 0; i < player.pieces.length; i++) {
            var piece = player.pieces[i];
            playerpieces.push({ x: piece.pos.x, y: piece.pos.y, r: piece.r, color: piece.color, name: piece.name, removed: piece.removed });
        }
        socket.emit('updateplayerposition', { x: player.pieces[0].pos.x, y: player.pieces[0].pos.y, r: player.pieces[0].r ,color: player.color, name: player.name, pieces: playerpieces });
        if (socket.id)
            socket.emit("updateclientscore",{ score: player.getScore(), name:player.name, sessionID: sessionID, socketID: socket.id });
    };

    p.keyPressed = function () {
        if (p.key == 'A') {
            playerbot.on = !playerbot.on;
        }
        if (p.keyCode == 32) {
            player.split();
        }
    }

    function Blob(x, y, r, color) {
        this.pos = p.createVector(x, y);
        this.r = r;
        this.vel = p.createVector(0, 0);
        this.name;
        this.color = color;
        this.pieces = [];
        this.pieces.push(this);
        this.acc = false;
        this.accelerationcount = 4;
        this.eatable = true;
        this.removed = false;

        this.getAccelerationcount = function () {
            return 4;
        }

        this.show = function () {
            for (var i = 0; i < this.pieces.length; i++) {
                p.fill(this.pieces[i].color);
                p.ellipse(this.pieces[i].pos.x, this.pieces[i].pos.y, this.pieces[i].r*2, this.pieces[i].r*2);
                if(this.pieces[i].name){
                    p.fill(255);
                    p.textSize(20);
                    p.text(this.pieces[i].name, this.pieces[i].pos.x-this.pieces[i].name.length*5, this.pieces[i].pos.y - this.pieces[i].r - 10 );
                }
            }
        }

        this.split = function () {
            var lastpiece = this.pieces[this.pieces.length-1];
            var oldr = lastpiece.r;
            if (oldr >= startradius && oldr/Math.sqrt(2) > this.pieces[0].r/Math.sqrt(3)) {
                var accelerationcount = lastpiece.getAccelerationcount();
                lastpiece.r /= Math.sqrt(2);
                this.pieces.push(new Blob(lastpiece.pos.x, lastpiece.pos.y, oldr/Math.sqrt(2), lastpiece.color));
                this.pieces[this.pieces.length-1].name = lastpiece.name;
                this.pieces[this.pieces.length-1].acc = true;
                this.pieces[this.pieces.length-1].eatable = false;
                this.pieces[this.pieces.length-1].accelerationcount = accelerationcount;
            }
        }

        this.update = function () {
            for (var i = 0; i < this.pieces.length; i++) {
                var newvel = p.createVector(p.mouseX-c.width/2, p.mouseY-c.height/2);
                newvel.setMag(p.lerp(1.2, 4, startradius/this.pieces[i].r));
                if (this.pieces[i].acc && this.pieces[i].pos.x != this.pieces[0].pos.x && this.pieces[i].pos.y != this.pieces[0].pos.y) {
                    newvel.x *= this.pieces[i].accelerationcount;
                    newvel.y *= this.pieces[i].accelerationcount;
                    if (this.pieces[i].accelerationcount > 1) {
                        this.pieces[i].accelerationcount -= 2/this.pieces[i].r;
                    } else {
                        var force = p.createVector(this.pieces[0].pos.x-this.pieces[i].pos.x, this.pieces[0].pos.y-this.pieces[i].pos.y);
                        force.setMag(1);
                        newvel.add(force);
                        this.pieces[i].eatable = true;
                    }
                } else {
                    this.pieces[i].accelerationcount = this.pieces[i].getAccelerationcount();
                    this.pieces[i].acc = false;
                }
                // newvel.setMag(4 * startradius / this.pieces[i].r > 1.2 ? 4 * startradius / this.pieces[i].r : 1.2);
                this.pieces[i].vel.lerp(newvel, 0.2);
                if (this.pieces[i].pos.x + this.pieces[i].vel.x >= -field.width + this.pieces[i].r
                    && this.pieces[i].pos.x + this.pieces[i].vel.x <= field.width - this.pieces[i].r) {
                    this.pieces[i].pos.x += this.pieces[i].vel.x;
                }
                if (this.pieces[i].pos.y + this.pieces[i].vel.y >= -field.height + this.pieces[i].r
                    && this.pieces[i].pos.y + this.pieces[i].vel.y <= field.height - this.pieces[i].r) {
                    this.pieces[i].pos.y += this.pieces[i].vel.y;
                }
            }
            this.pos.x = this.pieces[0].pos.x;
            this.pos.y = this.pieces[0].pos.y;
            this.r = this.pieces[0].r;
            this.vel = this.pieces[0].vel;
        }

        this.eat = function (blob) {
            var d = p5.Vector.dist(this.pos, blob.pos);
            if (d < this.r + blob.r && this.r >= blob.r) {
                var areasum = (this.r * this.r + blob.r * blob.r) * p.PI;
                this.r = p.sqrt(areasum / p.PI);
                if (this.pos.x + this.r > field.width) {
                    this.pos.x = field.width - this.r;
                } else if (this.pos.x - this.r < -field.width) {
                    this.pos.x = -field.width + this.r;
                }
                if (this.pos.y + this.r > field.height) {
                    this.pos.y = field.height - this.r;
                } else if (this.pos.y - this.r < -field.height) {
                    this.pos.y = -field.height + this.r;
                }
                return true;
            } else {
                return false;
            }
        }

        this.getScore = function () {
            var result = 0;
            for (var i = 0; i < this.pieces.length; i++) {
                result += this.pieces[i].r * this.pieces[i].r * p.PI;
            }
            return Math.floor(p.sqrt(result / p.PI));
        }
    }

    function randomcolor() {
        return '#' + (function co(lor){
                            return (lor +=
                                    [0,1,2,3,4,5,6,7,8,9,'a','b','c','d','e','f'][Math.floor(Math.random()*16)])
                                      && (lor.length == 6) ?  lor : co(lor); })('');
    }


    function drawScore(){
        let x = 40;
        let y = 40;
        p.textSize(28);

        p.fill(255, 255, 255, 200);
        p.text("score: " + player.getScore(),x,c.height-y);

        if(highscores){
            p.textSize(20);
            for (var key in highscores) {
                if(highscores[key] && highscores[key].name) {
                    var rank = parseInt(key)+1;
                    p.text(rank + ". " + highscores[key].name + ": " + Math.floor(highscores[key].score), x, rank * y);
                }
            }

        }
    }
};

var app = new p5(sketch);
