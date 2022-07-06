var express = require('express');
var session = require('express-session');
var router = express.Router();


router.use(session({
    secret: 'agario12345',
    resave: false,
    saveUninitialized: true
}));

router.get('/', function (req, res) {
    res.render('menu');
})

module.exports = router;
