angular.module('dataviz')
  .factory('blGraphEvents', function() {
    return {
      DRAW: 'graph.DRAW',
      ALL_COMPONENTS_REGISTERED: 'graph.ALL_COMPONENTS_REGISTERED'
    };
  })

  .directive('blGraph', function(BlLayout, $timeout, RangeFunctions, chartTypes, componentTypes, ChartHelper, BlLayoutDefaults, BlFilterService, $log, DataMgrFactory, ScaleMgrFactory, FilterMgrFactory, QueryMgrFactory, ComponentMgrFactory, LayoutMgrFactory, blGraphEvents) {
    var groupCtrl;

    var addAggregate = function(query, aggFunction, field) {
      // aggFunction is going to be: 'count' or 'min'
      if (!_.contains(field, '.num')) { $log.warn('Stats aggs only currently work on numeric fields.'); }
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
        this.layoutMgr = new LayoutMgrFactory($scope.containerHeight, $scope.containerWidth);
        $scope.layout = ctrl.layoutMgr.layout.container;
        ctrl.interval = $scope.interval;
        ctrl.queryMgr = new QueryMgrFactory($scope.resource);
        ctrl.dataMgr = new DataMgrFactory();
        ctrl.scaleMgr = new ScaleMgrFactory();
        ctrl.filterMgr = new FilterMgrFactory();
        ctrl.componentsMgr = new ComponentMgrFactory($scope, $element);

        $scope.$on(blGraphEvents.ALL_COMPONENTS_REGISTERED, function() {
          $timeout(function() {
            var group;

            if (!ctrl.componentsMgr.chart) { $log.warn('No chart registered.'); }

            if (ChartHelper.isOrdinal(ctrl.componentsMgr.chart.type)) {
              // It's ordinal, set an interval and use intervalGroup
              group = ctrl.queryMgr.query.termGroup($scope.field);
            } else if ($scope.interval) {
              // Use termGroup
              group = ctrl.queryMgr.query.intervalGroup($scope.field, $scope.interval);
            } else if (ctrl.numBuckets) {
              group = ctrl.queryMgr.query.intervalGroup(
                $scope.field, null, {buckets: ctrl.componentsMgr.chart.params.numBuckets}
              );
            } else {
              $log.warn('There was no interval set and no buckets registered.');
            }

            if ($scope.aggFunction && $scope.aggregateBy) {
              group[$scope.aggFunction + 'Aggregation']($scope.aggregateBy);
            }

            if (ctrl.componentsMgr.chartType === chartTypes.number) {
              var chartParams = ctrl.componentsMgr.chart.params;
              ctrl.queryMgr.query = addAggregate(ctrl.query, chartParams.aggregate, $scope.field);
            }

            ctrl.dataMgr.refresh(ctrl.queryMgr.query)
              .then(function(data) {
                // TODO (il): Empty state
                if (!data) { return; }

                ctrl.layoutMgr.update(ctrl.componentsMgr.registered);
                ctrl.scaleMgr.update(ctrl.layoutMgr.layout, ctrl.dataMgr.metadata, ctrl.componentsMgr.chart.type);
                $scope.$broadcast(blGraphEvents.DRAW);
              });
          });
        });


        $scope.$watch('[containerHeight, containerWidth]', function(nv, ov) {
          if (angular.equals(nv, ov)) { return; }

          var height = nv[0];
          var width = nv[1];

          ctrl.layoutMgr.update(ctrl.componentsMgr.registered, BlLayout.getDefaultLayout(height, width));
          $scope.layout = ctrl.layoutMgr.layout.container;
          ctrl.scaleMgr.update(ctrl.layoutMgr.layout, ctrl.dataMgr.metadata, ctrl.componentsMgr.chart.type);
          $scope.$broadcast(blGraphEvents.DRAW);
        });

        $scope.$on(BlFilterService.FILTER_CHANGED, function() {
          ctrl.queryMgr.query.clear(); // TODO (ian): There is a method for this now, I think.
          $scope.filters = groupCtrl.filters.getAllFilters();

          // Add all filters except for the current field's
          var newFilterSet = BlFilterService.groupFiltersExcept($scope.field, groupCtrl.filters.getAllFilters());

          if (!newFilterSet.isEmpty()) {
            ctrl.query.addFilter(BlFilterService.groupFiltersExcept($scope.field, groupCtrl.filters.getAllFilters()));
          }

          ctrl.dataMgr.refresh()
            .then(function() {
              var chartType = ctrl.componentsMgr.chart.type;
              ctrl.scaleMgr.update(ctrl.layoutMgr.layout, ctrl.dataMgr.metadata, chartType);
              $scope.$broadcast(blGraphEvents.DRAW);
            });

        });

      }
    };
  })
;
