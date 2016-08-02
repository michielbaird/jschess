var fs = require('fs');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();

app.use('/', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use("/test", function(req, res) {
    res.send("Hello World.")
});

app.listen(3000, function() {
  console.log('Server started: http://localhost:' + 3000 + '/');
});