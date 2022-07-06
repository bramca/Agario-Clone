var express = require('express');
var router = express.Router();
var fs = require("fs");
var passwordHash = require('password-hash');


router.get('/', function (req, res) {
    res.render('register');
})

router.post('/', function (req, res) {
    if (req.body.password != req.body.confirmPassword) {
        res.render('register', { nae: "error" });
    }
    else {
        createUser(req.body.name,req.body.password);
        res.redirect("/login");
    }
    return;
})

module.exports = router;

/**
 * Add the user to the users.db file, no check for duplicate usernames yet.
 * @param {String} name 
 * @param {String} pass 
 */
function createUser(name, pass) {
    fs.open('users.db', 'a', function (err, fd) {
        if (err) {
            return console.error(err);
        }
        var hashedPassword = passwordHash.generate(pass);
        buffer = new Buffer(name + ";" + hashedPassword+"\n");
        fs.write(fd, buffer, 0, buffer.length, null, function (err) {
            if (err) throw 'error writing file: ' + err;
            fs.close(fd, function () {
                console.log(global.timestamp() + "\tRegistered a new user with name: " + name);
            })
        });
    });

}