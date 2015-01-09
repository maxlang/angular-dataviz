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
                    console.log('got data: ', data);
                    ctrl.data.grouped = data;
                    if (!ChartHelper.isOrdinal(componentType)) {
                      ctrl.data.grouped = _.each(ctrl.data.grouped, function(v) {
                        v.key = parseInt(v.key, 10);
                      });
                    }

                    var sortByKey = ChartHelper.isOrdinal(componentType) ? 'value' : 'key';
                    ctrl.data.grouped = _.take(_.sortBy(ctrl.data.grouped, sortByKey), 5);

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

  .factory('RangeFunctions', function(ChartHelper) {
    /**
     * Returns an object with the following parameters:
     * total - the sum of the values of all the elements in the dataset
     * count - the total number of elements in the dataset
     * range - the range of the VALUES of the dataset
     * domain - the range of the KEYS of the dataset
     */

    var getMinMax = function(data, key, startFromZero) {
      var max = _.max(data,key)[key];

      if (startFromZero) {
        return [0, max];
      } else {
        var min = _.min(data, key)[key];
        return [min, max];
      }
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
        metadata.range = getMinMax(data, 'value', true);
        metadata.domain = getMinMax(data, 'key');
      } else {
        metadata.range = _.pluck(data, 'key');
        metadata.domain = getMinMax(data, 'value');
      }

      return metadata;
    };



    return {
      getMinMax: getMinMax,
      getMetadata: getMetadata
    };
  })

/**
 * @ngdoc directive
 * @name dataviz.rewrite:blGroup
 * @param {String} field The field to be used
 * @restrict E
 * @element bl-group
 * @scope
 *
 * @description
 * Creates a visualization group.
 *
 * @example
 <example module="test">
 <file name="index.html">
 <div ng-controller="dataController">
 <div>
 Data: {{resource.data}}<br />
 Filters: {{filters}}<br />
 Height: <input type="number" ng-model="height"><br />
 Width: <input type="number" ng-model="width">
 </div>
 <div class="graph-wrapper">
   <bl-group>
     <bl-graph container-height="height" container-width="width" resource="resource" field="source" aggregate-by="power" agg-function="sum">
       <bl-barchart field="'key'"></bl-barchart>
       <bl-axis direction="'x'"></bl-axis>
       <bl-axis direction="'y'"></bl-axis>
     </bl-graph>
     <bl-graph container-height="height" container-width="width" resource="resource" field="target" aggregate-by="power" agg-function="sum">
       <bl-barchart field="'key'"></bl-barchart>
       <bl-axis direction="'x'"></bl-axis>
       <bl-axis direction="'y'"></bl-axis>
     </bl-graph>
   </bl-group>
 </div>
 </div>
 </file>
 <file name="script.js">
 angular.module('test', ['dataviz.rewrite'])
 .controller('dataController', function($scope, $rootScope, FilterService) {
      $scope.width = 500;
      $scope.height = 300;
    });
 </file>
 </example>
 */

  .directive('blGroup', function(FilterService) {
    return {
      restrict: 'E',
      transclude: true,
      replace: true,
      scope: {
        filters: '='
      },
      template: '<div class="bl-group" ng-transclude></div>',
      controller: function($scope) {
        $scope.filters = this.filters = {
          filterStore: {},
          registerFilter: function(aqlFilterObj) {
            this.filterStore[aqlFilterObj.expr] = aqlFilterObj;
            $scope.$broadcast(FilterService.FILTER_CHANGED);
          },
          getAllFilters: function() {
            return this.filterStore;
          }
        };

      }
    };
  })
  .service('FilterService', function() {
    var groupFiltersExcept = function(exprs, filterGroup) {
      var resFilter = new AQL.AndFilter();

      _.each(filterGroup, function(f) {
        if (_.contains(exprs, f.expr)) { return; }
        resFilter.addFilter(f);
      });

      return resFilter;
    };

    return {
      groupFiltersExcept: groupFiltersExcept,
      FILTER_CHANGED: 'filters.filterChanged'
    };
  })
  .provider('AQLRunner', function() {
    var resources = [];

    var getResourceConfig = function(resourceStr) {
      return _.find(resources, function(rs) {
        return rs.matcher.test(resourceStr);
      });
    };

    this.resource = function(pattern, configObj) {
      var getFields = function(pattern) {
        return _.map(_.filter(pattern.split('/'), function(segment) { return segment[0] === ':'; }), function(token) { return token.slice(1); });
      };

      var makeMatcher = function(pattern) {
        // TODO: Potential issue if someone passes in .* (or any other regex chars)
        return new RegExp('^' + _.map(pattern.split('/'), function(v) { return v[0] === ':' ? '([^/]*)' : v;}).join('/') + '$');
      };

      resources.push({
        matcher: makeMatcher(pattern),
        config: configObj,
        fields: getFields(pattern)
      });

      console.log('resources is: ', resources);

      return this;
    };

    this.$get = function($http) { // AQLRunner(query).success)func
      return function(query) {

        var resource = getResourceConfig(query.resourceId);
        var queryFields = query.resourceId.match(resource.matcher).slice(1);

        return $http.post(resource.config.url, {
          params: _.zipObject(resource.fields, queryFields),
          query: query
        });
      };
    };
  })
;
