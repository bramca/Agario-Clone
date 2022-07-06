var express = require('express');
var router = express.Router();
var fs = require("fs");

router.get('/', function (req, res) {
    readHighscores(res);
 })


 function readHighscores(res) {
    fs.readFile('highscores.db', function (err, data) {
        if (err) {
            return console.error(err);
        }
        let lines = data.toString().split(/\r?\n/);
        let users = [];
        lines.some(function (line) {
            let u = line.split(/:/)
            let user = {}
            user.name = u[0];
            user.score = u[1];
            users.push(user);
        })
        users.sort(function (a, b) { return b.score-a.score });
        res.render('highscores',{numberOne:users[0],numberTwo:users[1],numberThree:users[2]});
    });
}



 module.exports = router;
