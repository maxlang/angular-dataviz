angular.module('dataviz.rewrite')
  .directive('blGraph', function(Layout, $timeout) {
    return {
      restrict: 'E',
      replace: true,
      transclude: true,
      template:'<svg class="bl-graph" ng-attr-width="{{layout.width}}" ng-attr-height="{{layout.height}}"></div>',
      scope: {
        data: '=?'
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
        var height = parseInt($attrs.containerHeight, 10);
        var width = parseInt($attrs.containerWidth, 10);
        this.layout = Layout.getDefaultLayout(height, width);
        $scope.layout = this.layout.container;
        var ctrl = this;

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


        console.log('this.layout is: ', this.layout);

        this.scale = {
          x: d3.scale.linear()
            .domain($scope.metadata.domain)
            .range([0, this.layout.graph.width - 10]),
          y: d3.scale.linear()
            .domain($scope.metadata.range)
            .range([this.layout.graph.height - 10, 0])
        };

        this.components = {
          registered: [],
          register: function(componentType, config) {
            config = config || {};
            this.registered.push(componentType);
            var self = this;
            console.log('Registering %s', componentType);

            ctrl.layout = Layout.updateLayout(componentType, config, ctrl.layout);
            console.log('ctrl.layout is: ', ctrl.layout);

            $timeout(function() {
              // Update the scale if we have all the components registered
              if (self.registered.length === $scope.componentCount) {
                ctrl.scale.x.range([0, ctrl.layout.graph.width - 10]);
                ctrl.scale.x.range([ctrl.layout.graph.height - 10, 0]);
              }
            });
          }
        };

      }
    };
  })
;
