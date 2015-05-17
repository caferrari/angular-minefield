(function(angular) {
    'use strict';

    angular.module('MinefieldExperiment', ["Minefield"])

    .controller('IndexCtrl', ['$scope', function($scope) {

        $scope.rows = $scope.cols = 10;
        $scope.mines = 20;

    }]);
}(angular));