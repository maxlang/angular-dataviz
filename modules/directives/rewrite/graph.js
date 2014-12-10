angular.module('dataviz.rewrite')
    .directive('blGraph', function() {
      return {
        restrict: 'E',
        replace: true,
        transclude: true,
        template:'<svg width="400px" height="400px"></svg>',
        scope: {
          data: '=?'
        },
        link: function(scope, element, attrs, trl, transclude) {
          transclude(scope, function(clone) {
            element.append(clone);
          });
        },
        controller: function($scope) {
          $scope.data = [ { key: 1,   value: 5},  { key: 20,  value: 20},
            { key: 40,  value: 10}, { key: 60,  value: 40},
            { key: 80,  value: 5},  { key: 300, value: 300}];
          _.each($scope.data, function(v) {
            v.key = parseFloat(v.key);
          });

          var getMinMax = function(data, key) {
            return [_.min(data, key)[key], _.max(data,key)[key]];
          };

          $scope.metadata = {
            total: _.reduce($scope.data, function(sum, num) {
              return sum + num.y;
            }, 0),
            domain: getMinMax($scope.data, 'key'),
            range: getMinMax($scope.data, 'value'),
            count: $scope.data.length
          };
          $scope.metadata.avg = $scope.metadata.total/$scope.metadata.count;
        }
      };
    });
