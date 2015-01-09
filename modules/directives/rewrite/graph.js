angular.module('dataviz.rewrite')
  .directive('blGraph', function(Layout, $timeout, RangeFunctions, chartTypes, componentTypes, ChartHelper, LayoutDefaults, FilterService, AQLRunner) {
    var groupCtrl;

    var setScale = function(metadata, xRange, yRange, chartType) {
      var scales = {};
      var getXScale = function(metadata, xRange) {
        // check to see if the data is linear or time-based
        if (!metadata.isTime) {
          return d3.scale.linear()
            .domain(metadata.range)
            .range(xRange);
        } else {
          return d3.time.scale()
            .domain(metadata.range)
            .range(xRange);
        }
      };

      // All charts use a linear scale on x. I doubt this is actually true.
      scales.x = getXScale(metadata, xRange);

      scales.x = d3.scale.linear()
        .domain(metadata.domain)
        .range(xRange);

      // Define the Y scale based on whether the chart type is ordinal or linear
      if (!ChartHelper.isOrdinal(chartType)) {
        console.log('metadata is: ', metadata);
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
      require: ['^blGroup'],
      replace: true,
      transclude: true,
      template:'<svg class="bl-graph" ng-attr-width="{{layout.width}}" ng-attr-height="{{layout.height}}"></svg>',
      scope: {
        resource: '@',
        refresh: '@?',
        containerHeight: '=',
        containerWidth: '=',
        interval: '=?',
        aggregateBy: '@',
        field: '@',
        aggFunction: '@'
      },
      compile: function() {
        return {
          pre: function(scope, iElem, iAttrs, ctrls, transclude) {
            transclude(scope, function(clone) {
              iElem.append(clone);
             });
            groupCtrl = ctrls[0];
          },
          post: function(scope, iElem) {
            scope.componentCount = iElem.children().length;
          }
        };
      },
      controller: function($scope, $element, $attrs) {
        var ctrl = this;
        var hasRun = false;
        this.layout = Layout.getDefaultLayout($scope.containerHeight, $scope.containerWidth);
        $scope.layout = this.layout.container;
        this.interval = $scope.interval;
        this.query = new AQL.SelectQuery($scope.resource);
        this._id = _.uniq();
        this.data = {};
        this.scale = {};
        this.fields = {};
        this.filters = {
          includes: [],
          excludes: [],
          addFilter: function(type, term) {
            // To be clear, 'type' here is going to be either 'includes' or 'excludes'
            // So we're adding inclusion/exclusion filters
            this.toggleTerm(type, term);
            var filter = new AQL.TermFilter($scope.field, this[type]);
            groupCtrl.filters.registerFilter(filter);
          },
          toggleTerm: function(type, term) {
            var termIndex = _.findIndex(this[type], term);

            if (termIndex < 0) {
              this[type].push(term);
            } else {
              this[type].splice(termIndex, 1);
            }
          }
        };

        this.components = {
          registered: [],
          register: function(componentType, params) {
            this.registered.push(componentType);
            var self = this;

            if (isChart(componentType)) {
              var group;
              ctrl.chartType = componentType;

              if (ChartHelper.isOrdinal(componentType)) {
                // It's ordinal, set an interval and use intervalGroup
                group = ctrl.query.termGroup($scope.field);
              } else {
                // Use termGroup
                group = ctrl.query.intervalGroup($scope.field, $scope.interval);
              }

              if ($scope.aggFunction && $scope.aggregateBy) {
                group[$scope.aggFunction + 'Aggregation']($scope.aggregateBy);
              }


            } else if (isAxis(componentType)) {
              ctrl.fields[params.direction] = params.field;
            }

            $timeout(function() {
              if (self.registered.length === $scope.componentCount && !hasRun) {
                hasRun = true;
                AQLRunner(ctrl.query)
                  .success(function(data) {
                    ctrl.data.grouped = data;
                    //if (!ChartHelper.isOrdinal(componentType)) {
                    //  ctrl.data.grouped = _.each(ctrl.data.grouped, function(v) {
                    //    v.key = parseInt(v.key, 10);
                    //  });
                    //}

                    $scope.metadata = RangeFunctions.getMetadata(ctrl.data.grouped, ctrl.chartType);
                    ctrl.layout = Layout.updateLayout(self.registered, ctrl.layout);

                    var scaleDims = getScaleDims(ctrl.layout.graph);
                    ctrl.scale = setScale($scope.metadata, scaleDims.x, scaleDims.y, ctrl.chartType);
                    $scope.$broadcast(Layout.DRAW);
                  })
                  .error(function(err) {
                    console.error('error pulling data: ', err);
                  });
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

        $scope.$on(FilterService.FILTER_CHANGED, function() {
          // Clear existing filters
          ctrl.query.filters = [];
          $scope.filters = groupCtrl.filters.getAllFilters();

          // Add all filters except for the current field's
          var newFilterSet = FilterService.groupFiltersExcept($scope.field, groupCtrl.filters.getAllFilters());
          console.log('newFilterSet is: ', newFilterSet);

          if (!newFilterSet.value) {
            ctrl.query.filters = [];
          } else {
            ctrl.query.addFilter(FilterService.groupFiltersExcept($scope.field, groupCtrl.filters.getAllFilters()));
          }


          // Repull the data
          AQLRunner(ctrl.query)
            .success(function(data) {
              ctrl.data.grouped = data;
              $scope.metadata = RangeFunctions.getMetadata(ctrl.data.grouped, ctrl.chartType);

              var scaleDims = getScaleDims(ctrl.layout.graph);
              ctrl.scale = setScale($scope.metadata, scaleDims.x, scaleDims.y, ctrl.chartType);

              $scope.$broadcast(Layout.DRAW);

            })
            .error(function(err) {
              console.error('Error running AQL query: ', err);
            });
        });

      }
    };
  })
;
