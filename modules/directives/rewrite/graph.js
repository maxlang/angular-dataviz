angular.module('dataviz.rewrite')
    .directive('blGraph', function() {
      return {
        restrict: 'E',
        replace: true,
        transclude: true,
        template:'<div class="bl-graph" width="400px" height="400px"></div>',
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

          var dims = {
            height: 400,
            width: 400
          };

          var getMinMax = function(data, key) {
            return [_.min(data, key)[key], _.max(data,key)[key]];
          };

          $scope.layout = {};

          $scope.metadata = {
            total: _.reduce($scope.data, function(sum, num) {
              return sum + num.y;
            }, 0),
            domain: getMinMax($scope.data, 'key'),
            range: getMinMax($scope.data, 'value'),
            count: $scope.data.length
          };
          $scope.metadata.avg = $scope.metadata.total/$scope.metadata.count;

          this.scaleX = d3.scale.linear()
            .domain($scope.metadata.domain)
            .range([0, 400]);

          this.scaleY = d3.scale.linear()
            .domain($scope.metadata.range)
            .range([0, 400]);


          this.registerComponent = function(componentType, config) {
            var t = componentType;

            if (_.isEmpty($scope.layout)) {
              $scope.layout[t] = config;
            } else {
              if (t === 'xAxis') {
                $scope.layout.graph.height = dims.height - config.height;
              } else if (t === 'graph') {
                config.height -= $scope.layout.xAxis.height;
              }
              $scope.layout[t] = config;

            }
          };

        }
      };
    });
