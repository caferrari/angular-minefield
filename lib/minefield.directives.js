(function() {
    'use strict';

    angular.module('Minefield.Directives', ['Minefield.Services'])

    .directive('minefield', ['GameService', function(GameService) {
        return {
            restrict: 'E',
            template: "<div class='game'><table ng-if='game'><tr ng-repeat='row in game.getBoard()'><td ng-repeat='tile in row'><minetile></minetile></td></tr></table></div>",
            replace: true,
            scope: {
                game: "=",
                mines: "=",
                rows: "=",
                cols: "="
            },
            link: function(scope, elem, attrs)  {

                scope.game = new GameService(scope.rows, scope.cols, scope.mines);

                scope.$watchGroup(['rows', 'cols', 'mines'], function(v) {
                    var rows = v[0], cols = v[1], mines = v[2];
                    scope.game = new GameService(rows, cols, mines);

                    scope.game.onUpdate(function() {
                        setTimeout(function() {
                            scope.$apply();
                        }, 0);
                    });
                });
            }
        };
    }])
    .directive('minetile', [function() {
        return {
            restrict: 'E',
            template: "<div></div>",
            replace: true,
            link: function(scope, elem, attrs) {

                var tile = scope.tile;

                elem.on('click', function() {
                    tile.stepOn();
                });

                elem.on('contextmenu', function(e) {
                    tile.putFlag();
                    e.preventDefault();
                    return false;
                });

                tile.on('changeState', function(state) {

                    switch(state) {
                        case tile.states.UNCLICKED:

                            break;
                        case tile.states.NOMINESAROUND:
                                elem.addClass('clicked nomines');
                                elem.html('');
                            break;
                        case tile.states.MINESAROUND:
                                elem.addClass('clicked');
                                elem.html(tile.howManyMinesAround());
                            break;
                        case tile.states.FLAGON:
                                elem.addClass('clicked flag');
                                elem.html('<i class="fa fa-flag"></i>');
                            break;
                        case tile.states.FLAGOFF:
                                elem.removeClass('clicked flag');
                                elem.html('');
                            break;
                        case tile.states.BOOM:
                                elem.addClass('boom');
                                elem.html('<i class="fa fa-bomb"></i>');
                            break;
                        case tile.states.REVEAL:
                            if (tile.hasMine() && !tile.hasFlag()) {
                                elem.html('<i class="fa fa-bomb"></i>');
                            }else if (!tile.hasMine() && tile.hasFlag()) {
                                elem.addClass('boom');
                            }
                            break;
                        default:
                            alert('undefined state: ' + state);
                    }

                });

                tile.initialize();
            }
        };
    }]);
}(angular));