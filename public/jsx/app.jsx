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
    },
    shouldComponentUpdate: function(nextProps, nextState) {
        if (this.props.col !== nextProps.col || this.props.row!== nextProps.row ||
            this.props.selected !== nextProps.selected ||
            this.props.highlight !== nextProps.highlight ||
            this.props.type !== nextProps.type || this.props.color !== nextProps.color){
            return true;
        }
        // You can access `this.props` and `this.state` here
        // This function should return a boolean, whether the component should re-render.
        return false;
    },
});
var BoardDisplay = React.createClass({
    getInitialState: function (){
        return {
            board: new Board(),
            selected: null,
            to_highlight: {},
            to_promote: "Q"

        }
    },
    move: function(move) {
        var board = this.state.board;
        var new_board = board.move(move);
        console.log(new_board);
        if (new_board) {
            this.setState({
                selected: null,
                to_highlight: {},
                board: new_board
            });
        }
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
            console.log(possibleMoves);

            this.setState({
                selected: new Position(x,y),
                to_highlight: to_highlight
            });
        } else if (this.state.selected !== null) {
            var player = this.state.board.player;

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
    render: function() {
        if (!this.state.board.promotion) {
            var checkMate = this.state.board.isCheckMate();
            var check = this.state.board.isCheck();
            var rows = [];
            for (var y = 7; y >= 0; y--) {
                for (var x = 0; x < 8; ++x) {
                    var key = y + ":" + x;
                    var piece = this.state.board.layout[y][x];
                    var highlight = this.state.to_highlight !== null ? this.state.to_highlight[key] : false;
                    var boundClick = this.childClick.bind(this, x, y);
                    rows.push(<Square
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
            return (
                <div>
                <div className="chessboard">
                    {rows}
                </div>
                {checkMate ? "Checkmate" : (check? "Check" :"")}
                <div>{this.props.location}</div>
                </div>
            );
        } else {
           return (<div>
            <form>
               {this.renderChoices()}
              <input onClick={this.promotePiece} type="button" value="Promote"/>
            </form></div>);
        };
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
                <div><input type="radio"
                    name="piece"
                    checked={selected}
                    onChange={this.updateChoice}
                    value={piece}/>{pieceMap[player][piece]}</div>))
        }
        return choices;

    }

});


var game = new Game();
 ReactDOM.render(
     <BoardDisplay />,
     document.getElementById('app-root')
 )
