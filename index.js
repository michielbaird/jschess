var fs = require('fs');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var model = require('./datamodel.js')(app)
var chess = require('./public/js/chess.js');

var LRU = require('lru');
var cache = new LRU(500);

app.use( bodyParser.json());
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

app.use('/', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.get("/test", function(req, res) {
    res.send("Hello World.")
});

app.post("/new_game", function(req, res, next) {
    req.db.transaction(function(err, transaction) {
        var rollbackAndPass = function(err, transaction) {
            transaction.rollback(function(err) {
                if (err) next(err);
            });
        };
        var game_id;
        req.models.game.create(
                {turn: 1, player: "white"}, function(err, game) {
            if (err) {
                rollbackAndPass(err);
                return;
            }
            var db_game = game;
            var board = new chess.Board();
            req.models.board.create({
                turn: "white",
                last_move: null,
                board_state: board.serializeBoard(),
                wcl: board.castling.white.left,
                wcr: board.castling.white.right,
                bcl: board.castling.black.left,
                bcr: board.castling.black.right,
                promotion: Boolean(board.promotion)
            }, function(err, db_board) {
                if (err) {
                    rollbackAndPass(err);
                }
                db_board.setGame(db_game, function() {});
                cache.set(db_game.id + ":" +1, board);
                game_id = db_game.id
                console.log(game_id);
                transaction.commit(function(err) {
                    if (err) {
                        next(err);
                        return;
                    }
                    console.log(game_id);
                    var player = ["white", "black"][Math.floor(Math.random()*2)]
                    var raw = "game:" + game_id + ":" + player;
                    var game_url = new Buffer(raw).toString('base64');
                    res.redirect("/game/" + game_url)
                });
            });
        });

    });
});

app.get("/game/:identifier", function (req, res, next) {
    fs.readFile('public/game.html', function (err, data) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data);
        res.end();
    });
});


function errorHandler(err, req, res, next) {
  res.status(500);
  res.render('error', { error: err });
}

function logErrors(err, req, res, next) {
  console.error(err.stack);
  next(err);
}

app.use(errorHandler);
app.use(logErrors);

app.listen(3000, function() {
  console.log('Server started: http://localhost:' + 3000 + '/');
});