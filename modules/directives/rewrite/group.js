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
angular.module('dataviz.rewrite')
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
;
