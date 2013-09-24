var module = angular.module('makerApp', ['dataviz'], function ($locationProvider) {
  $locationProvider.hashPrefix('');
  // Make code pretty
  window.prettyPrint && prettyPrint();
});



module    .controller('makerCtrl', ['$scope', '$rootScope', '$filter', '$location', function ($scope, $rootScope, $filter, $location) {

      $scope.viz = {
        type: $location.search().type,
        data: $location.search().data,
        config: $location.search().config
      };

      $scope.$watch('viz.data', function(d) {
        $location.search('data',d);
        if (d) {
          $scope.viz.parsedData = JSON.parse(d);
        }
      });

      $scope.$watch('viz.config', function(c) {
        $location.search('config',c);
        if (c) {
          $scope.viz.parsedConfig = JSON.parse(c);
        }
      });

      $scope.$watch('viz.type', function(t) {
        $location.search('type',t);
      });

    }])


    .filter('timestampToTime', function () {
      return function (t) {
        var d = new Date();
        d.setTime(t);
        return d.toDateString();
      }
    });
