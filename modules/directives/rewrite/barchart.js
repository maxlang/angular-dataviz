/**
 * @ngdoc directive
 * @name dataviz.rewrite:blBarchart
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
 angular.module('test', ['dataviz.rewrite'])
 .controller('dataController', function($scope, $rootScope, FilterService) {
      $scope.width = 500;
      $scope.height = 300;
    });
 </file>
 </example>
 */

angular.module('dataviz.rewrite')
  .directive('blBarchart', function(ChartFactory, Layout, chartTypes, Translate) {

    var clickFn = function(d, addFilter) {
      addFilter('includes', d.key);
    };

    return new ChartFactory.Component({
      template: '<g class="bl-barchart chart" ng-attr-height="{{layout.height}}" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}},{{translate.y}})"></g>',
      scope: {},
      link: function(scope, iElem, iAttrs, controllers) {
        var graphCtrl = controllers[0];
        var COMPONENT_TYPE = chartTypes.barchart;
        var g = d3.select(iElem[0]);

        graphCtrl.components.register(COMPONENT_TYPE);

        function drawChart() {
          scope.layout = graphCtrl.layout.chart;
          scope.translate = Translate.graph(scope.layout, graphCtrl.components.registered, COMPONENT_TYPE);

          var bars = g.selectAll('rect').data(graphCtrl.data.grouped);

          // Do this for all the
          bars.enter().append('rect')
            .classed('bar', true)
            .attr('x', 0)
            .attr('stroke-width', '0px')
            .classed('selected', function(d, i) {
              return true;
              //return _.contains(scope.params.filter, d.key);
            })
            .on('click', function(d, i) {
              var boundAddFilter = graphCtrl.filters.addFilter.bind(graphCtrl.filters);
              clickFn.call(this, d, boundAddFilter);
            });

          bars
            .attr('y', function(d) { return graphCtrl.scale.y(d.key); })
            .attr('width', function(d) { return graphCtrl.scale.x(d.value); })
            .attr('height', Math.abs(graphCtrl.scale.y.rangeBand()));

          bars
            .exit()
            .remove();
        }

        scope.$on(Layout.DRAW, drawChart);
      }
    });
  });