var pieceMap = {
    "white": {
        "K": "\u2654",
        "Q": "\u2655",
        "R": "\u2656",
        "B": "\u2657",
        "N": "\u2658",
        "P": "\u2659"
    },
    "black": {
        "K": "\u265a",
        "Q": "\u265b",
        "R": "\u265c",
        "B": "\u265d",
        "N": "\u265e",
        "P": "\u265f"
    }
};

var Square = React.createClass({
    render: function() {
       var c = (this.props.row % 2) ^ (this.props.col %2);
       c = c ? "white": "black";
       var classes = (c + (this.props.selected ? " selected": "") +
                (this.props.highlight ? " highlight": ""));

       var piece_text = this.props.type ? pieceMap[this.props.color][this.props.type] : "";
       return (<div onClick={this.props.onClick} className={classes} >{piece_text}</div>);
    }
});
var BoardDisplay = React.createClass({
    getInitialState: function (){
        return {
            board: new Board(),
            selected: null,
            to_highlight: {},
            to_promote: "Q",
            turn: 1,
            can_play: false
        }
    },
    move: function(move) {
        var board = this.state.board;
        var new_board = board.move(move);
        if (new_board) {
            this.setState({
                selected: null,
                to_highlight: {},
                board: new_board,
                can_play: false
            });
        } else {
            return;
        }
        var turn = this.state.turn;
        var self = this;
        superagent
            .post("../move")
            .send({
                game_id: this.props.game_id,
                turn: this.state.turn,
                player: this.props.player,
                move: move.ser()
            })
            .set('Accept', 'application/json')
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                self.setState({
                    turn: turn + 1
                });
            });

    },
    childClick: function (x, y) {
        var player = this.state.board.player;
        if (this.state.board.layout[y][x].player === player) {
            if (this.state.selected !== null &&
                    this.state.selected.x == x &&
                    this.state.selected.y == y) {
                this.setState({
                    selected: null,
                    to_highlight: {}
                });
                return;
            }

            var possibleMoves = this.state.board.getPossibleMoves(new Position(x, y));
            var to_highlight = {};
            for (var i = 0; i < possibleMoves.length; ++i) {
                var move = possibleMoves[i];
                to_highlight[move.to.y + ":" + move.to.x] = true
            }

            this.setState({
                selected: new Position(x,y),
                to_highlight: to_highlight
            });
        } else if (this.state.selected !== null) {

            // TODO: promotion.
            this.move(new Move(this.state.selected, new Position(x, y)));
        }

    },
    isSelected(x, y) {
        if (this.state.selected !== null) {
            return this.state.selected.x === x && this.state.selected.y === y;
        }
        return false;
    },
    applyMoves: function(serverMoves) {
        var board = this.state.board;
        var turn =  this.state.turn + serverMoves.length;
        board = board.applyJsonMoves(serverMoves);

        var can_play = false;
        if (this.props.player === board.player) {
            can_play = true;
        }
        this.setState({
            turn: turn,
            board: board,
            can_play: can_play
        });
    },
    fetchBoardFromServer: function() {
        var comp = this;
        superagent
            .post("../moves")
            .send({
                game_id: this.props.game_id,
                from_turn: this.state.turn
            })
            .set('Accept', 'application/json')
            .end(function(err, res) {
                if (err) {
                    throw err;
                }
                comp.applyMoves(res.body);
            });
    },
    componentDidMount: function() {
        this.fetchBoardFromServer()
        window.setInterval(this.fetchBoardFromServer, 5000);
    },
    render: function() {
        if (!this.state.board.promotion || this.state.board.player !== this.props.player) {
            var checkMate = this.state.board.isCheckMate();
            var check = this.state.board.isCheck();
            var square = [];
            for (var y = 7; y >= 0; y--) {
                for (var x = 0; x < 8; ++x) {
                    var key = y + ":" + x;
                    var piece = this.state.board.layout[y][x];
                    var highlight = this.state.to_highlight !== null ? this.state.to_highlight[key] : false;
                    var boundClick;
                    if (this.state.can_play) {
                        boundClick = this.childClick.bind(this, x, y);
                    } else {
                        boundClick = function() {};
                    }
                    square.push(<Square
                        onClick={boundClick}
                        selected={this.isSelected(x,y)}
                        key={key}
                        row={y}
                        col={x}
                        highlight={highlight}
                        type={piece.type}
                        color={piece.player}/>);
                }
            }
            if (this.props.player === "black") {
                square = square.reverse()
            }
            var other_player = this.props.player === "white" ? "black" : "white";
            var game_code = btoa("game:" + this.props.game_id + ":" + other_player);
            var game_url = game_code;
            return (
                <div>
                <div>Player: {this.props.player}</div>
                <div>Game: {this.props.game_id}</div>
                <div className="chessboard">
                    {square}
                </div>
                {checkMate ? "Checkmate" : (check? "Check" :"")}
                <div>
                    {other_player}:
                    <a href={game_url} target="_blank">
                    Other players link.
                    </a>
                </div>
                </div>
            );
        } else {
           return (<div>
            <form>
               {this.renderChoices()}
              <input onClick={this.promotePiece} type="button" value="Promote"/>
            </form></div>);
        }
    },
    promotePiece() {
        var piece = this.state.to_promote;
        this.move(new Promotion(piece));
    },
    updateChoice(changeEvent) {
        this.setState({
            to_promote: changeEvent.target.value
        });
    },
    renderChoices() {
        var choices = [];
        var player = this.state.board.player;
        var pieces = ["Q", "R", "B", "N"];
        for (var i = 0; i < 4; ++i){
            var piece = pieces[i];
            var selected = piece === this.state.to_promote;
            choices.push((
                <div>
                    <input type="radio"
                    name="piece"
                    checked={selected}
                    onChange={this.updateChoice}
                    value={piece}/>
                    {pieceMap[player][piece]}
                </div>))
        }
        return choices;

    }

});

var checkGame = function() {
    var path = window.location.pathname;
    var match = /.*\/game\/([^\/]+)\/?$/.exec(path);

    if (match) {
        var game_path = match[1];
        var raw = atob(game_path).split(":");
        if (raw[0] !== "game" ||
                (raw[2] !== "white" && raw[2] !== "black")) {
            return null;
        }
        return {
            player: raw[2],
            game_id: raw[1]
        }

    } else {
        return null;
    }
};

var game = new Game();
var check = checkGame();
if (check !== null) {
    ReactDOM.render(
        <BoardDisplay
         player={check.player}
         game_id={check.game_id}
         path={window.location.pathname} />,
        document.getElementById('app-root')
    )
} else {
    ReactDOM.render(
        <div>Chess?</div>,
        document.getElementById('app-root')
    );
}

