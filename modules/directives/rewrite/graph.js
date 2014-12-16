angular.module('dataviz.rewrite')
  .directive('blGraph', function(Layout, $timeout) {
    var setScale = function(metadata, xRange, yRange) {
      return {
        x: d3.scale.linear()
          .domain(metadata.domain)
          .range(xRange),
        y: d3.scale.linear()
          .domain(metadata.range)
          .range(yRange)
      };
    };

    return {
      restrict: 'E',
      replace: true,
      transclude: true,
      template:'<svg class="bl-graph" ng-attr-width="{{layout.width}}" ng-attr-height="{{layout.height}}"></div>',
      scope: {
        data: '=?',
        containerHeight: '=',
        containerWidth: '='
      },
      compile: function() {
        return {
          pre: function(scope, iElem, iAttrs, ctrl, transclude) {
            transclude(scope, function(clone) {
              iElem.append(clone);
             });
          },
          post: function(scope, iElem, iAttrs) {
            scope.componentCount = iElem.children().length;
          }
        };
      },
      controller: function($scope, $element, $attrs) {
        var ctrl = this;
        this.layout = Layout.getDefaultLayout($scope.containerHeight, $scope.containerWidth);
        $scope.layout = this.layout.container;

        this.data = [ { key: 1,   value: 5},  { key: 20,  value: 20},
          { key: 40,  value: 10}, { key: 60,  value: 40},
          { key: 80,  value: 5},  { key: 300, value: 300}];
        _.each(this.data, function(v) {
          v.key = parseFloat(v.key);
        });

        var getMinMax = function(data, key) {
          return [_.min(data, key)[key], _.max(data,key)[key]];
        };

        $scope.metadata = {
          total: _.reduce(ctrl.data, function(sum, num) {
            return sum + num.y;
          }, 0),
          domain: getMinMax(ctrl.data, 'key'),
          range: getMinMax(ctrl.data, 'value'),
          count: ctrl.data.length
        };

        $scope.metadata.avg = $scope.metadata.total/$scope.metadata.count;

        this._id = _.uniq();
        this.scale = setScale($scope.metadata, [0, this.layout.graph.width - 10], [this.layout.graph.height - 10, 0]);
        this.components = {
          registered: [],
          register: function(componentType) {
            this.registered.push(componentType);
            var self = this;
            console.log('Registering %s', componentType);

            $timeout(function() {
              if (self.registered.length === $scope.componentCount) {
                ctrl.scale = setScale($scope.metadata, [0, ctrl.layout.graph.width - 10], [ctrl.layout.graph.height - 10, 0]);
                ctrl.layout = Layout.updateLayout(self.registered, ctrl.layout);
                $scope.$broadcast(Layout.DRAW);
              }
            });
          }
        };

        $scope.$watch('[containerHeight, containerWidth]', function(nv, ov) {
          if (angular.equals(nv, ov)) { return; }

          var height = nv[0];
          var width = nv[1];

          ctrl.layout = Layout.getDefaultLayout(height, width);
          ctrl.layout = Layout.updateLayout(ctrl.components.registered, ctrl.layout);
          $scope.layout = ctrl.layout.container;
          //console.log('ctrl.layout.graph.width is: ', ctrl.layout.graph.width);
          //ctrl.layout.graph.height
          ctrl.scale = setScale($scope.metadata, [0, ctrl.layout.graph.width - 10], [ctrl.layout.graph.height - 10, 0]);
          $scope.$broadcast(Layout.DRAW);
        });

      }
    };
  })
;
