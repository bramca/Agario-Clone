var express = require('express');
var session = require('express-session');
var router = express.Router();
var bodyparser = require('body-parser');
var fs = require("fs");
var passwordHash = require('password-hash'); //https://www.npmjs.com/package/password-hash

router.use(bodyparser.urlencoded({ extended: false }));
router.use(bodyparser.json());



router.use(session({
    secret: 'agario12345',
    resave: false,
    saveUninitialized: true
}));

router.get('/', function (req, res) {
    res.render('login');
});

router.post('/', function (req, res) {
    tryLogin(req.body.name, req.body.password, res,req);
});


module.exports = router;

/**
 * Check the users.db file
 *      if user exists and password is correct, redirect to menu
 *      if user does not exist/password is incorrect, generate error
 * @param {String} name
 * @param {String} password
 * @param {HTTPResponse} res
 */
function tryLogin(name, password, res,req) {
    fs.readFile('users.db', function (err, data) {
        if (err) {
            return console.error(err);
        }
        let lines = data.toString().split(/\r?\n/);
        lines.some(function (line) {
            let credentials = line.split(/;/);
            if (credentials[0] == name) {
                if (passwordHash.verify(password, credentials[1])) {
                    global.users[req.sessionID].loggedIn = true;
                    res.redirect("/menu")
                    global.users[req.sessionID].name = name;
                    console.log(global.timestamp() + "\tLogged in user " + name);
                    return;
                }
            }
        })
        if(!global.users[req.sessionID].loggedIn){
            res.render("login",{nae:"Wrong login"});
        }
    });


}
