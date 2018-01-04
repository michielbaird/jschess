var orm = require('orm');
var transaction = require("orm-transaction");

module.exports = function (app) {
    app.use(orm.express("sqlite://game.db", {
        define: function (db, models, next) {
            db.use(transaction);
            db.settings.set("properties.primary_key", "UID");
            models.game = db.define("game", {
                id: {type: 'serial', key: true},
                turn: {type: 'integer'},
                player: String
            });
            models.board = db.define("board", {
                turn: {type: 'integer'},
                board_state: String,
                last_move: Object,
                wcl: Boolean,
                wcr: Boolean,
                bcl: Boolean,
                bcr: Boolean,
                promotion: Boolean
            });
            models.board.hasOne("game", models.game);
            db.sync();
            next();
        }
    }));
};