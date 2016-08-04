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
                turn: 1,
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
                game_id = db_game.id;
                transaction.commit(function(err) {
                    if (err) {
                        next(err);
                        return;
                    }
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

function build_moves_db(model, game_id, cb, filter) {
    filter = parseInt(filter ? filter : 1);
    model.all({game_id: game_id}, {order: "turn"}, function(err, boards){
        if (err) {
            cb(err);
        }
        var moves = [];
        for (var i = 1; i < boards.length; ++i) {
            if (boards[i].turn > filter) {
                console.log(boards[i].last_move);
                console.log(boards[i].turn);
                moves.push(boards[i].last_move);
            }
        }
        cb(null, moves);
    })
}

app.post("/moves", function(req, res, next) {
    if (!req.body) {
        res.sendStatus(400);
        return;
    }
    var game_id = req.body.game_id;
    build_moves_db(
            req.models.board,
            game_id,
            function(err, moves){
        if (err) {
           res.sendStatus(400);
           next(err);
           return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(moves));
    }, req.body.from_turn);
})


app.post("/move", function(req, res, next) {
    if (!req.body) {
       res.sendStatus(400);
       return;
    }
    var turn = req.body.turn;
    var move = chess.Board.convertMove(req.body.move);
    var player = req.body.player;
    var game_id = req.body.game_id;
    req.db.transaction(function(err, transaction) {
        req.models.game.one({id: game_id}, function(err, game) {
            console.log(turn, game.turn);
            if (err) {
                console.log(err.stack);
                next(err);
                transaction.rollback( function() {});
                return;
            }

            if (game == null || game.turn != turn) {
                transaction.rollback(function() {});
                res.sendStatus(400);
                return;
            }
            var id = game.id + ":" + turn;
            var board = cache.get(id);
            console.log(board);
            function processBoard(board) {
                var new_board = board.move(move);
                if (!new_board) {
                    transaction.rollback(function() {});
                    res.sendStatus(400);
                    return;
                }
                var new_turn = turn + 1;
                var new_id = game.id + ":" + new_turn;
                req.models.board.create({
                    turn: new_turn,
                    last_move: move.ser(),
                    board_state: new_board.serializeBoard(),
                    wcl: new_board.castling.white.left,
                    wcr: new_board.castling.white.right,
                    bcl: new_board.castling.black.left,
                    bcr: new_board.castling.black.right,
                    promotion: Boolean(new_board.promotion)
                }, function(err, db_board) {
                    db_board.setGame(game, function() {});
                    game.player = new_board.player;
                    game.turn = new_turn;
                    game.save(function (err) {
                        console.log(err);
                        transaction.commit(function() {
                            res.sendStatus(200);
                        });
                    })
                });
            }

            if (!board) {
                build_moves_db(
                        req.models.board,
                        game_id,
                        function(err, moves){
                    if (err) {
                       res.sendStatus(400);
                       next(err);
                       return;
                    }
                    processBoard(new chess.Board().applyJsonMoves(moves));
                });
            } else {
                processBoard(board);
            }
        });
    });
});


function errorHandler(err, req, res, next) {
  res.status(500);
  console.error(err.stack);
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