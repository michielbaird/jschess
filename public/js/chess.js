function Piece(type, player) {
    this.type = type;
    this.player = player
};

function Position(x, y) {
    this.x = x;
    this.y = y;
};

function Empty() {};

function Move(from, to, special) {
    this.to = to;
    this.from = from;
    this.special = !special ? "normal" : special;
};

function Promotion(type) {
    this.type = type;
}

function Board(parent_board, move) {
    var promotion = null;
    if (!parent_board) {
        this.layout = Board.newBoard();
        this.player = "white";
        this.castling = {
            "white": {
                "left": true,
                "right": true
            },
            "black": {
                "left": true,
                "right": true
            }
        }
        this.promotion = null;
        this.last_move = null;
        this.parent_board = null;
        return;
    } else if (parent_board.promotion) {
        if (!(move instanceof Promotion)) {
            throw new Error("Promotion needs to happen first.");
        }
        this.layout = [];
        for (var i = 0; i < 8 ; ++i) {
            this.layout.push([]);
            for (var j = 0; j < 8; j++) {
                this.layout[i].push(parent_board.layout[i][j]);
            }
        }
        var x = parent_board.promotion.x;
        var y = parent_board.promotion.y;
        this.layout[y][x] = new Piece(move.type, parent_board.player);
        this.castling = parent_board.castling;
    } else {
        this.layout = [];
        for (var i = 0; i < 8 ; ++i) {
            this.layout.push([]);
            for (var j = 0; j < 8; j++) {
                this.layout[i].push(parent_board.layout[i][j]);
            }
        }
        this.layout[move.to.y][move.to.x] = parent_board.layout[move.from.y][move.from.x];
        this.layout[move.from.y][move.from.x] = Empty;
        promotion = Board.checkPromotion(this.layout, move);


        if (move.special === "enpassant") {
            this.layout[move.from.y][move.to.x] = Empty;
        }
        if (move.special === "castling") {
            var delta_x = (move.to.x - move.from.x)/2;
            var x = delta_x < 0 ? 0 : 7;
            this.layout[move.from.y][move.to.x - delta_x] = this.layout[move.from.y][x];
            this.layout[move.from.y][x] = Empty;
        }

        this.castling = Board.calculateCastling(parent_board, this.layout, move);
    }
    if (!promotion) {
        this.player = parent_board.player == "white" ? "black" : "white";
    } else {
        this.player = parent_board.player
    }
    this.parent_board = parent_board;
    this.last_move = move;
    this.promotion = promotion;
};

Board.startRow = function(player) {
   return [
       new Piece("R", player), new Piece("N", player), new  Piece("B", player),
       new Piece("Q", player), new Piece("K", player), new Piece("B", player),
       new Piece("N", player), new Piece("R", player)];
};

Board.pawnRow = function (player) {
    result = [];
    for (var i = 0; i < 8; i++) {
        result.push(new Piece("P",player))
    }
    return result;
};

Board.emptyRow = function () {
    result = [];
    for (var i = 0; i < 8; i++) {
        result.push(Empty);
    }
    return result;
};
Board.newBoard = function () {
    layout = [];
    layout.push(Board.startRow("white"));
    layout.push(Board.pawnRow("white"));
    for (var i = 0; i < 4 ; ++i) {
        layout.push(Board.emptyRow());
    }
    layout.push(Board.pawnRow("black"));
    layout.push(Board.startRow("black"));
    return layout;
};

Board.calculateCastling = function(parent_board, layout, move) {
    var other = parent_board.player == "white" ? "black" : "white";
    var castling = JSON.parse(JSON.stringify(parent_board.castling));
    if (layout[move.to.y][move.to.x].type === "K") {
        // Moving the king
        castling = {}
        castling[parent_board.player] = {"left": false, "right": false}
        castling[other] = parent_board.castling[other];
    }
    if ((move.from.x === 0 || move.from.x === 7) &&
            (move.from.y === (parent_board.player === "white" ? 0 : 7))) {
        // Moving the Rook
        castling[parent_board.player] = {}
        var dir = move.from.x === 0 ? "left" : "right";
        var other_dir = move.from.x === 0 ? "right" : "left";
        castling[parent_board.player][dir] = false;
        castling[parent_board.player][other_dir] = parent_board.castling[parent_board.player][other_dir];
    }
    if ((move.to.x === 0 || move.to.x === 7) &&
            (move.to.y === (parent_board.player === "white" ? 7 : 0))) {
        // Taking the Rook
        castling[other] = {}
        var dir = move.from.x === 0 ? "left" : "right";
        var other_dir = move.from.x === 0 ? "right" : "left";
        castling[other][dir] = false;
        castling[other][other_dir] = parent_board.castling[other][other_dir];
    }
    return castling;
}

Board.checkPromotion = function(layout, move) {
    if ((move.to.y === 0 || move.to.y === 7) &&
         layout[move.to.y][move.to.x].type === "P") {
         return move.to;
    }
    return null;
}

Board.prototype._generatePieceMovesSimple = function(position, disable_castling) {
    var piece = this.layout[position.y][position.x];

    if (piece == Empty) {
        return [];
    }

    switch (piece.type) {
        case "R":
            return this._slide(
                position,
                piece.player,
                [[0,1],[0,-1],[1,0],[-1,0]]
            );
        case "N":
            return this._step(
                position,
                piece.player,
                [
                    [2,1],[2,-1],[-2,1],[-2,-1],
                    [1,2],[1,-2],[-1,2],[-1,-2]
                ]
            );
        case "B":
            return this._slide(
                position,
                piece.player,
                [[1,1],[1,-1],[-1,1],[-1,-1]]
            );
        case "Q":
            return this._slide(
                position,
                piece.player,
                [
                    [1,1],[1,-1],[-1,1],[-1,-1],
                    [0,1],[0,-1],[1,0],[-1,0]
                ]
            );
        case "K":
	    var castling = [];
            if (!disable_castling) {
                castling = this._findCastlingMoves(position, piece.player);
            }
            return this._step(
                position,
                piece.player,
                [
                    [1,1],[1,-1],[-1,1],[-1,-1],
                    [0,1],[0,-1],[1,0],[-1,0]
                ]
            ).concat(castling) ;
        case "P":
            return this._pawnMoves(position, piece.player);
    }
};

Board.prototype._testCastling = function(player, y, x_coords) {
    var b = this;
    return x_coords.every(function (x) {
        return (b.layout[y][x] === Empty &&
            !b.isCheck(player, new Position(x, y)));
    });
};
Board.prototype._findCastlingMoves = function(position, player) {
    var moves = [];
    var y = player == "white" ? 0 : 7;
    console.log(this.castling[player]);
    if (this.castling[player].left && this._testCastling(player, y, [1, 2, 3])) {
        moves.push(new Move(position, new Position(position.x - 2, y), "castling"));
    }
    if (this.castling[player].right && this._testCastling(player, y, [5, 6])) {
        moves.push(new Move(position, new Position(position.x + 2, y), "castling"));
    }
    return moves;
};


Board.prototype.findKing = function(player) {
    for (var y = 0; y < 8; ++y) {
        for (var x = 0; x < 8; x++) {
            if (this.layout[y][x] !== Empty &&
                this.layout[y][x].type === "K" &&
                this.layout[y][x].player === player) {
                return new Position(x, y);
            }
        }
    }
};

Board.prototype.isCheck = function(player, king_pos) {
    player = player ? player : this.player;
    var opponent = player == "white" ? "black" : "white";
    var king_pos = king_pos ? king_pos : this.findKing(player);
    var possible = [];
    for (var y = 0; y < 8; ++y) {
        for (var x = 0; x < 8; x++) {
            if (this.layout[y][x] != Empty &&
                this.layout[y][x].player != player) {
                possible = possible.concat(this._generatePieceMovesSimple(new Position(x, y), true));
            }
        }
    };
    return possible.some(function (move) {
        return move.to.x === king_pos.x &&  move.to.y === king_pos.y;
    });
};

Board.prototype.isCheckMate = function() {
    if (!this.isCheck()){
        return false;

    }
    for (var y = 0; y < 8; ++y) {
        for (var x = 0; x < 8; x++) {
            if (this.getPossibleMoves(new Position(x,y)).length > 0) {
                return false;
            }
        }
    }
    return true;

    var possible = [];
    for (var y = 0; y < 8; ++y) {
        for (var x = 0; x < 8; x++) {
            if (this.layout[y][x] != Empty &&
                this.layout[y][x].player != player) {
                possible = possible.concat(this._generatePieceMovesSimple(new Position(x, y)));
            }
        }
    };
    return possible.some(function (move) {
        return move.to.x === king_pos.x &&  move.to.y === king_pos.y;
    });
};


Board.prototype._slide = function(position, player, deltas) {
    var moves = [];
    for (var id  in deltas) {
        var delta = deltas[id];
        for (var x = position.x + delta[0], y = position.y + delta[1];
                x >= 0 && y >= 0 && x < 8 && y < 8; x += delta[0], y += delta[1]) {
            if (this.layout[y][x] == Empty){
                moves.push(new Move(position,new Position(x, y)));
                continue;
            } else if (this.layout[y][x].player != player) {
                moves.push(new Move(position, new Position(x, y)));
            }
            break;
        }
    }
    return moves;
};
Board.prototype._step = function(position, player, deltas) {
    var moves = [];
    for (var id in deltas) {
        var delta = deltas[id];
        var x = position.x + delta[0];
        var y = position.y + delta[1];
        if (x < 0 ||  x >= 8 || y < 0 ||  y >= 8 ) {
            continue;
        }
        if (this.layout[y][x] == Empty || this.layout[y][x].player != player){
            moves.push(new Move(position, new Position(x, y)));
        }
    }

    return moves;
}

Board.prototype._pawnMoves = function(position, player) {
    moves = [];
    var delta_y = player == "white" ? 1 : -1;
    if (position.y === 0 || position.y === 7) {
        return moves;
    }
    for (var delta_x = -1; delta_x <= 1; delta_x += 2) {
        var x = position.x + delta_x;
        if (x < 0 ||  x >= 8) {
            continue;
        }
        var piece = this.layout[position.y + delta_y][position.x + delta_x];
        if (piece != Empty && piece.player != player) {
            moves.push(
                new Move(position,new Position(position.x + delta_x, position.y + delta_y)));
        }
    }
    if (this.layout[position.y + delta_y][position.x] == Empty) {
        moves.push(new Move(position, new Position(position.x, position.y + delta_y)));
        var double_y = player == "white" ? 1 : 6;
        if (position.y == double_y && this.layout[position.y + 2*delta_y][position.x] == Empty ) {
            moves.push(
                new Move(position, new Position(position.x, position.y + 2*delta_y)));
        }
    }
    if (this.last_move && !(this.last_move instanceof Promotion)) {
        var en_row = player === "white" ? 4 : 3;
        var last_move = this.last_move;
        var end_x = this.last_move.to.x;
        var end_y = this.last_move.to.y;
        var start_y = this.last_move.from.y;

        if (position.y === en_row && end_y == en_row && Math.abs(end_y - start_y) === 2 &&
            this.layout[end_y][end_x].type === "P" && Math.abs(position.x - end_x) == 1) {
            moves.push(
                new Move(
                    position,
                    new Position(end_x, position.y + delta_y), "enpassant")
            );
        }
    }

    return moves;
    // TODO: Promotion
};

Board.prototype.getPossibleMoves = function(position) {
    if (this.layout[position.y][position.x] == Empty ||
        this.layout[position.y][position.x].player != this.player) {
        return [];
    }
    var raw_moves =  this._generatePieceMovesSimple(position);
    var board = this;
    return raw_moves.filter(function(move) {
        var new_board = new Board(board, move);
        return !new_board.isCheck(board.player);
    });

}

Board.prototype.move = function(move) {
    var board = this;
    if (move instanceof Promotion) {
        return new Board(board, move);
    }
    var possible = board.getPossibleMoves(move.from);
    var new_board = null;
    for (var i = 0; i < possible.length; ++i) {
        var possible_move = possible[i];
        if (possible_move.to.x == move.to.x && possible_move.to.y == move.to.y) {
            return new Board(board, possible_move);
        }
    }
};


function Game(board) {
    this.board = board ? board : new Board();
};

Game.prototype.move = function(move) {
      var board = this.board;
      var possible = this.board.getPossibleMoves(move.from);
      for (var i = 0; i < possible.length; ++i) {
          var possible_move = possible[i];
          if (possible_move.to.x == move.to.x && possible_move.to.y == move.to.y) {
              this.board = new Board(this.board, possible_move);
              return;
          }
      }
  };
