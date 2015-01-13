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
        y: [graphLayout.height, 0]
      };
    };

    var getChartType = function(registeredComponents) {
      return _.find(registeredComponents, function(c) { return isChart(c.type); }).type;
    };

    var getChartParams = function(registeredComponents, componentType) {
      var chartObj = _.find(registeredComponents, {type: componentType});

      return chartObj ? chartObj.params : {};
    };

    var addAggregate = function(query, aggFunction, field) {
      // aggFunction is going to be: 'count' or 'min'
      if (!_.contains(field, '.num')) { console.warn('Stats aggs only currently work on numeric fields.'); }
      query[aggFunction + 'Aggregation'](field);
      return query;
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
          update: function(componentType, params) {
            var registeredIndex = _.findIndex(registered, {type: componentType});
            if (index < 0) { return console.warn('Can\'t update component type as it wasn\'t found.'); }
            registered[registeredIndex].params = params;
          },
          register: function(componentType, params) {
            var self = this;
            this.registered.push({type: componentType, params: params || {}});
            ctrl.layout = Layout.updateLayout(this.registered, ctrl.layout);

            if (isAxis(componentType)) {
              ctrl.fields[params.direction] = params.field;
            }

            $timeout(function() {
              // If everything is registered and we haven't yet run the initial query
              if (self.registered.length === $scope.componentCount && !hasRun) {

                // First, update the query
                var group;
                ctrl.chartType = getChartType(self.registered);
                if (!ctrl.chartType) {
                  console.warn('No chart type registered.');
                }

                if (ChartHelper.isOrdinal(ctrl.chartType)) {
                  // It's ordinal, set an interval and use intervalGroup
                  group = ctrl.query.termGroup($scope.field);
                } else if ($scope.interval) {
                  // Use termGroup
                  group = ctrl.query.intervalGroup($scope.field, $scope.interval);
                } else if (ctrl.numBuckets) {
                  group = ctrl.query.intervalGroup($scope.field, null, {buckets: ctrl.numBuckets});
                } else {
                  console.warn('There was no interval set and no buckets registered.');
                }

                if ($scope.aggFunction && $scope.aggregateBy) {
                  group[$scope.aggFunction + 'Aggregation']($scope.aggregateBy);
                }

                if (ctrl.chartType === chartTypes.number) {
                  var chartParams = getChartParams(self.registered, ctrl.chartType);
                  ctrl.query = addAggregate(ctrl.query, chartParams.aggregate, $scope.field);
                }

                hasRun = true;
                AQLRunner(ctrl.query)
                  .success(function(data) {
                    ctrl.data.grouped = data;
                    // This is really just to reset the linear or ordinal scale on the x/y axes --
                    // graph dimensions should really already be set at this point.
                    $scope.metadata = RangeFunctions.getMetadata(ctrl.data.grouped, ctrl.chartType, true);
                    ctrl.layout = Layout.updateLayout(self.registered, ctrl.layout);

                    var scaleDims = getScaleDims(ctrl.layout.graph);
                    ctrl.scale = setScale($scope.metadata, scaleDims.x, scaleDims.y, ctrl.chartType);

                    if (Layout.layoutIsValid(ctrl.layout)) {
                      $scope.$broadcast(Layout.DRAW);
                    }
                  })
                  .error(function(err) {
                    console.error('Error pulling data: ', err);
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
          ctrl.query.filters = []; // TODO (ian): There is a method for this now, I think.
          $scope.filters = groupCtrl.filters.getAllFilters();

          // Add all filters except for the current field's
          var newFilterSet = FilterService.groupFiltersExcept($scope.field, groupCtrl.filters.getAllFilters());

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

  .directive('blTitle', function(ChartFactory, componentTypes, LayoutDefaults, Layout) {
    return new ChartFactory.Component({
      template: '<text class="graph-title" ng-attr-transform="translate({{translate.x}}, {{translate.y}})">{{title}}</text>',
      scope: {
        title: '@'
      },
      require: '^blGraph',
      link: function(scope, iElem, iAttrs, graphCtrl) {
        graphCtrl.components.register(componentTypes.title);

        // The text needs to be centered and positioned at the top
        function drawTitle(){
          var containerWidth = graphCtrl.layout.container.width;
          var elemWidth = d3.select(iElem[0]).node().getComputedTextLength();

          scope.translate = {
            x: Math.floor((containerWidth - elemWidth) / 2),
            y: LayoutDefaults.padding.title.top
          };
        }

        scope.$on(Layout.DRAW, drawTitle);
      }
    });
  })
;
