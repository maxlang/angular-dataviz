angular.module('dataviz.rewrite')
  .directive('blGraph', function(Layout, $timeout, RangeFunctions, chartTypes, componentTypes, ChartHelper, LayoutDefaults) {
    var setScale = function(metadata, xRange, yRange, chartType) {
      var scales = {};

      // All charts use a linear scale on x. I doubt this is actually true.
      scales.x = d3.scale.linear()
        .domain(metadata.domain)
        .range(xRange);

      // Define the Y scale based on whether the chart type is ordinal or linear
      if (!ChartHelper.isOrdinal(chartType)) {
        scales.y = d3.scale.linear()
          .domain(metadata.range)
          .range(yRange);
      } else {
       scales.y = d3.scale.ordinal()
         .domain(metadata.range)
         .rangeRoundBands(yRange, 0.1, 0);
      }

      return scales;
    };

    var isChart = function(componentType) {
      return _.contains(chartTypes, componentType);
    };

    var isAxis = function(componentType) {
      return _.contains(componentType.toLowerCase(), componentTypes.axis);
    };

    var getScaleDims = function(graphLayout) {
      return {
        x: [0, graphLayout.width - LayoutDefaults.padding.graph.right],
        y: [graphLayout.height - 10, 0]
      };
    };

    return {
      restrict: 'E',
      replace: true,
      transclude: true,
      template:'<svg class="bl-graph" ng-attr-width="{{layout.width}}" ng-attr-height="{{layout.height}}"></svg>',
      scope: {
        resource: '=?',
        containerHeight: '=',
        containerWidth: '=',
        filters: '='
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

        console.log('blGraph controller live.');

        this.data = $scope.resource.data;

        this._id = _.uniq();
        this.scale = {};
        this.fields = {};
        $scope.filters = this.filters = {
          include: [],
          exclude: [],
          addFilter: function(type, term) {
            if (!this[type]) {
              throw new Error('Can\'t add filter of that type.');
            }

            this[type].push(term);
            console.log($scope.filters);
          }
        };

        this.components = {
          registered: [],
          register: function(componentType, params) {
            this.registered.push(componentType);
            var self = this;

            if (isChart(componentType)) {
              ctrl.chartType = componentType;
              $scope.metadata = RangeFunctions.getMetadata(ctrl.data, componentType);
            } else if (isAxis(componentType)) {
              ctrl.fields[params.direction] = params.field;
            }

            $timeout(function() {
              if (self.registered.length === $scope.componentCount) {
                ctrl.layout = Layout.updateLayout(self.registered, ctrl.layout);

                var scaleDims = getScaleDims(ctrl.layout.graph);
                ctrl.scale = setScale($scope.metadata, scaleDims.x, scaleDims.y, ctrl.chartType);
                $scope.$broadcast(Layout.DRAW);
              }
            });
          }
        };

        $scope.$watch('[containerHeight, containerWidth]', function(nv, ov) {
          if (angular.equals(nv, ov)) { return; }

          var height = nv[0];
          var width = nv[1];

          ctrl.layout = Layout.updateLayout(ctrl.components.registered, Layout.getDefaultLayout(height, width));
          $scope.layout = ctrl.layout.container;
          var scaleDims = getScaleDims(ctrl.layout.graph);
          ctrl.scale = setScale($scope.metadata, scaleDims.x, scaleDims.y, ctrl.chartType);
          $scope.$broadcast(Layout.DRAW);
        });

      }
    };
  })

  .factory('RangeFunctions', function(ChartHelper) {
    var getMinMax = function(data, key) {
      return [_.min(data, key)[key], _.max(data,key)[key]];
    };

    var getMetadata = function(data, chartType) {
      var metadata = {
        total: _.reduce(data, function(sum, o) {
          return sum + o.value;
        }, 0),
        count: data.length
      };

      metadata.avg = metadata.total / metadata.count;

      if (!ChartHelper.isOrdinal(chartType)) {
        metadata.range = getMinMax(data, 'value');
        metadata.domain = getMinMax(data, 'key');
      } else {
        metadata.range = _.pluck(data, 'key');
        metadata.domain = getMinMax(data, 'value');
      }

      console.log('metadata is: ', metadata);

      return metadata;
    };



    return {
      getMinMax: getMinMax,
      getMetadata: getMetadata
    };
  })
;
