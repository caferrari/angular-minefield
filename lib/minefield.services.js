(function() {
    'use strict';

    angular.module('Minefield.Services', [])

    .factory('TileModel', function() {

        var Tile = function(game, position, hasMine) {
            this.x = position.x;
            this.y = position.y;

            this.game = game;

            this._clicked = false;
            this._flagged = false;
            this._hasMine = hasMine || false;

            this._siblings = [];
            this._bombSiblings = [];

            this._callbacks = {
                changeState: []
            };
        };

        Tile.prototype.on = function(e, callback) {
            this._callbacks[e].push(callback);
        };

        Tile.prototype.trigger = function(e) {
            var callbacks = this._callbacks[e];

            if (!callbacks) { return; }

            var args = [];
            for (var x = 1; x < arguments.length; x++) {
                args.push(arguments[x]);
            }

            callbacks.forEach(function(cbk) {
                cbk.apply(this, args);
            }.bind(this));
        };

        Tile.prototype.states = Tile.states = {
            UNCLICKED: "UNCLICKED",
            NOMINESAROUND: "NOMINESAROUND",
            MINESAROUND: "MINESAROUND",
            FLAGON: "FLAGON",
            FLAGOFF: "FLAGOFF",
            BOOM: "BOOM",
            REVEAL: "REVEAL"
        };

        Tile.prototype.getSiblingsPositions = function() {
            var positions = [];
            for (var x = this.x - 1; x <= this.x + 1; x++ ) {
                for (var y = this.y -1; y <= this.y + 1; y++) {
                    if ((x == this.x && y == this.y) || (x < 0 || y < 0) ||(x >= this.game.getWidth() || y >= this.game.getHeight())) {
                        continue;
                    }

                    positions.push({
                        x: x,
                        y: y
                    });
                }
            }
            return positions;
        };

        Tile.prototype.changeState = function(state) {
            this._state = state;
            this.trigger('changeState', state);
        };

        Tile.prototype.reveal = function() {
            this.changeState(Tile.states.REVEAL);
        };

        Tile.prototype.stepOn = function() {

            if (!this.game.isPlaying() || this._clicked || this._flagged) {
                return;
            }

            this._clicked = true;
            this.game.clearTile(this);

            if (this.hasMine()) {
                this.game.lose(this);
                return this.changeState(Tile.states.BOOM);
            }

            if (this.howManyMinesAround() === 0) {

                setTimeout(function() {
                    this._siblings.forEach(function(i) {
                        i.stepOn();
                    });
                }.bind(this), 0);
                return this.changeState(Tile.states.NOMINESAROUND);
            }

            this.changeState(Tile.states.MINESAROUND);
        };

        Tile.prototype.putFlag = function() {

            if (!this.game.isPlaying() || this._clicked) {
                return;
            }

            if (this._flagged) {
                this.game.giveFlag();
                this._flagged = false;
                return this.changeState(Tile.states.FLAGOFF);
            }

            if (this.game.flagsLeft() > 0) {
                this.game.takeFlag();
                this._flagged = true;
                this.changeState(Tile.states.FLAGON);
            }
        };

        Tile.prototype.hasMine = function() {
            return this._hasMine;
        };

        Tile.prototype.hasFlag = function() {
            return this._flagged;
        };

        Tile.prototype.setSiblings = function(siblings, bombSiblings) {
            this._siblings = siblings;
            this._bombSiblings = bombSiblings;
        };

        Tile.prototype.howManyMinesAround = function() {
            return this._bombSiblings.length;
        };

        Tile.prototype.print = function() {
            return this.howManyMinesAround() + (this._hasMine ? 'M' : '');
        };

        Tile.prototype.initialize = function() {
            this._clicked = false;
            this._flagged = false;
            this.changeState(Tile.states.UNCLICKED);
        };

        return Tile;

    })

    .factory('GameService', ["TileModel", function(TileModel) {

        var Game = function(width, height, mines) {
            if (mines > (width * height)) {
                throw "Too many mines!";
            }

            this._width = width || 10;
            this._height = height || width || 10;
            this._mines = mines || Math.ceil(this._width * this._height * 0.2);

            this._board = [];
            this._tiles = [];
            this._bombs = [];

            this._callback = false;
            this._playing = false;
            this._lose = false;

            this.reset();
        };

        Game.prototype.onUpdate = function(callback) {
            this._callback = callback;
        };

        Game.prototype.update = function() {
            if (!this._callback) {
                return;
            }
            this._callback.apply(this);
        };

        Game.prototype.flagsLeft = function() {
            return this._flags;
        };

        Game.prototype.takeFlag = function() {
            if (this.flagsLeft() === 0) {
                throw "There is not more flags, sorry!";
            }

            this._flags--;
            this.update();
        };

        Game.prototype.giveFlag = function() {
            this._flags++;
            this.update();
        };

        Game.prototype.generateMinePositions = function() {
            var mines = Array.apply(null, new Array(this.getWidth() * this.getHeight()))
                .map(function(v, i) { return i; })
                .sort(function() { return 0.5 - Math.random(); }); // weak shuffle =/

            var iterations = this._width * this._height * 3;

            for (var x = 0; x < iterations; x++) {
                var a = Math.floor(Math.random() * mines.length);
                var b = Math.floor(Math.random() * mines.length);

                var tmp = mines[a];
                mines[a] = mines[b];
                mines[b] = tmp;
            }

            return mines.splice(0, this._mines);
        };

        Game.prototype.reset = function() {

            this._board = [];

            this._flags = this._mines;
            this._lose = false;

            var minePositions = this.generateMinePositions();
            var x, y;

            // Create the game grid
            var counter = 0;
            for (x = 0; x < this._width; x++) {
                this._board[x] = [];
                for (y =0; y < this._height; y++) {
                    var hasMine = minePositions.indexOf(counter++) >= 0;

                    var tile = new TileModel(this, {
                        x: x,
                        y: y,
                    }, hasMine);

                    if (hasMine) {
                        this._bombs.push(tile);
                    }

                    this._board[x].push(tile);
                    this._tiles.push(tile);
                }
            }

            this._tiles.forEach(function(tile) {
                this.processSiblings(tile);
                tile.initialize();
            }.bind(this));

            this._playing = true;
            this.update();
        };

        Game.prototype.isPlaying = function() {
            return this._playing;
        };

        Game.prototype.processSiblings = function(tile) {

            var positions = tile.getSiblingsPositions();

            var siblings = [];
            var bombSiblings = [];

            positions.forEach(function (p) {
                var t = this._board[p.x][p.y];
                if (t.hasMine()) {
                    bombSiblings.push(t);
                }
                siblings.push(t);
            }.bind(this));

            tile.setSiblings(siblings, bombSiblings);
        };

        Game.prototype.lose = function() {
            this._tiles.forEach(function(tile) {
                tile.reveal();
            });

            this._lose = true;

            this._playing = false;
            this.update();
        };

        Game.prototype.clearTile = function(tile) {
            var index = this._tiles.indexOf(tile);
            this._tiles.splice(index, 1);
            this.update();
        };

        Game.prototype.getBoard = function() {
            return this._board;
        };

        Game.prototype.getTiles = function() {
            return this._tiles;
        };

        Game.prototype.getWidth = function() {
            return this._width;
        };

        Game.prototype.getHeight = function() {
            return this._height;
        };

        Game.prototype.getMines = function() {
            return this._mines;
        };

        Game.prototype.getFlags = function() {
            return this._flags;
        };

        Game.prototype.getTilesLeft = function() {
            return this._tiles.length;
        };

        Game.prototype.youWin = function() {
            if (this.getTilesLeft() == this.getMines() && this.getFlags() === 0) {
                this._playing = false;
                return true;
            }

            return false;
        };

        Game.prototype.youLose = function() {
            return this._lose;
        };

        return Game;
    }]);

}(angular));