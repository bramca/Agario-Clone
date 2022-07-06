var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
    global.LoggedIn = false;
    res.render("logout");
 })

 module.exports = router;