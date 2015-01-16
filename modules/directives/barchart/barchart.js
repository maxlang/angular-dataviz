/**
 * @ngdoc directive
 * @name dataviz:blBarchart
 * @param {String} field The field to be used
 * @restrict E
 * @element bl-barchart
 * @scope
 *
 * @description
 * Creates a barchart.
 *
 * @example
 <example module="test">
 <file name="index.html">
 <div ng-controller="dataController">
 <div>
 Data: {{resource.data}}<br />
 Height: <input type="number" ng-model="height"><br />
 Width: <input type="number" ng-model="width">
 </div>
 <div class="graph-wrapper">
 <bl-group>
 <bl-graph container-height="height" container-width="width" resource="resource" field="source" aggregate-by="power" agg-function="sum">
 <bl-barchart></bl-barchart>
 <bl-axis direction="'x'"></bl-axis>
 <bl-axis direction="'y'"></bl-axis>
 </bl-graph>
 </bl-group>
 </div>
 </div>
 </file>
 <file name="script.js">
 angular.module('test', ['dataviz'])
 .controller('dataController', function($scope, $rootScope, BlFilterService) {
      $scope.width = 500;
      $scope.height = 300;
    });
 </file>
 </example>
 */

/**
 * TODO:
 * - Selection brush
 * - Update to match new library structure
 */

angular.module('dataviz')
  .directive('blBarchart', function(BlChartFactory, BlLayout, chartTypes, BlTranslate, blGraphEvents) {

    var clickFn = function(d, addFilter) {
      addFilter('includes', d.key);
    };

    return new BlChartFactory.Component({
      template: '<g class="bl-barchart chart" ng-attr-height="{{layout.height}}" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}},{{translate.y}})"></g>',
      scope: {},
      link: function(scope, iElem, iAttrs, graphCtrl) {
        var COMPONENT_TYPE = chartTypes.barchart;
        var g = d3.select(iElem[0]);

        graphCtrl.componentsMgr.register(COMPONENT_TYPE);

        function drawChart() {
          scope.layout = graphCtrl.layoutMgr.layout.chart;
          scope.translate = BlTranslate.graph(scope.layout, graphCtrl.componentsMgr.registered, COMPONENT_TYPE);

          var bars = g.selectAll('rect').data(graphCtrl.dataMgr.data);

          bars.enter().append('rect')
            .classed('bar', true)
            .attr('x', 0)
            .attr('stroke-width', '0px')
            //.classed('selected', function(d, i) { return false; }) // add selection logic back in
            .on('click', function(d, i) {
              var boundAddFilter = graphCtrl.filters.addFilter.bind(graphCtrl.filters);
              clickFn.call(this, d, boundAddFilter);
            });

          bars
            .attr('y', function(d) { return graphCtrl.scaleMgr.y(d.key); })
            .attr('width', function(d) { return graphCtrl.scaleMgr.x(d.value); })
            .attr('height', Math.abs(graphCtrl.scaleMgr.y.rangeBand()));

          bars
            .exit()
            .remove();
        }

        scope.$on(blGraphEvents.DRAW, drawChart);
      }
    });
  });