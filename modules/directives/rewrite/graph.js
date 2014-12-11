angular.module('dataviz.rewrite')
    .directive('blGraph', function(Events, LayoutService, $timeout) {
      return {
        restrict: 'E',
        replace: true,
        transclude: true,
        template:'<div class="bl-graph" ng-attr-width="layout.container.width" ng-attr-height="layout.container.height"></div>',
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
          $scope.layout = LayoutService.getDefaultLayout(height, width);

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

          this._id = _.uniq();


          this.scale = {
            x: d3.scale.linear()
              .domain($scope.metadata.domain)
              .range([0, $scope.layout.container.width]),
            y: d3.scale.linear()
              .domain($scope.metadata.range)
              .range([0, $scope.layout.container.height])
          };

          this.components = {
            registered: [],
            register: function(componentType, config) {
              this.registered.push(componentType);
              console.log('Registering %s', componentType);

              $scope.layout = LayoutService.updateLayout(componentType, config || {}, $scope.layout);

              var self = this;
              $timeout(function() {
                Events.emitIfEqual(self._id, self.registered.length, $scope.componentCount, $scope, Events.LAYOUT_READY);
              });
            }
          };

        }
      };
    })

  .factory('Events', function() {
    var registered = {};

    var emitIfEqual = function(id, comp1, comp2, scope, event) {
      // Only allow this to be emitted once per graph
      if (registered[id]) { return; }

      registered[id] = true;
      if (comp1 === comp2) {
        console.log('All components registered; calculate and communicate.');
        scope.$emit(event);
      }
    };

    return {
      emitIfEqual: emitIfEqual,
      LAYOUT_READY: 'layout.ready'
    };
  });
;
