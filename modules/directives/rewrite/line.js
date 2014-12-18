/**
 * @ngdoc directive
 * @name dataviz.rewrite:blLine
 * @restrict E
 * @element bl-line
 *
 * @description
 * Creates a line chart.
 *
 * @example
 <example module="test">
 <file name="index.html">
 <div ng-controller="dataController">
 <div>
 Data: {{data}}<br />
 Height: <input type="number" ng-model="height"><br />
 Width: <input type="number" ng-model="width">
 </div>
 <div class="graph-wrapper">
 <bl-group>
   <bl-graph container-height="height" container-width="width" field="power" interval="200" aggregate-by="power" agg-function="sum">
     <bl-line field-x="'key'" field-y="'value'"></bl-line>
     <bl-axis direction="'x'"></bl-axis>
     <bl-axis direction="'y'"></bl-axis>
     <bl-legend></bl-legend>
   </bl-graph>
 </bl-group>
 </div>
 </div>
 </file>
 <file name="script.js">
 angular.module('test', ['dataviz.rewrite'])
 .controller('dataController', function($scope) {
      $scope.resource = {
        data: [
          { key: 1,   value: 5},  { key: 20,  value: 20},
          { key: 40,  value: 10}, { key: 60,  value: 40},
          { key: 80,  value: 5},  { key: 300, value: 300}
        ]
      };

      $scope.width = 500;
      $scope.height = 300;
    });
 </file>
 </example>
 */

  // resource for namespacing all the fields
// the line is declaratively told which field to aggregate on

angular.module('dataviz.rewrite')
  .directive('blLine', function(ChartFactory, Translate, Layout, chartTypes) {

    // setLine expects scales = {x: d3Scale, y: d3Scale}, fields: {x: 'fieldName', y: 'fieldName'}
    var setLine = function(scales, fields) {
      return d3.svg.line()
        .x(function(d) { return scales.x(d[fields.x]); })
        .y(function(d) { return scales.y(d[fields.y]); })
        .interpolate('linear');
    };

    return new ChartFactory.Component({
      template:
      '<g ng-attr-width="{{layout.width}}" ng-attr-height="{{layout.height}}" class="bl-line chart">' +
        '<path ng-attr-transform="translate({{translate.x}}, {{translate.y}})"></path>' +
      '</g>',
      scope: {
        fieldX: '=',
        fieldY: '='
      },
      link: function(scope, iElem, iAttrs, controllers) {
        var COMPONENT_TYPE = chartTypes.linechart;
        var graphCtrl = controllers[0];
        graphCtrl.components.register(COMPONENT_TYPE);
        var path = d3.select(iElem[0]).select('path'); // strip off the jquery wrapper

        function drawLine() {
          scope.line = setLine(graphCtrl.scale, {x: scope.fieldX, y: scope.fieldY});
          scope.translate = Translate.graph(graphCtrl.layout, graphCtrl.components.registered, COMPONENT_TYPE);
          path.attr('d', scope.line(graphCtrl.data.grouped));
          scope.layout = graphCtrl.layout[COMPONENT_TYPE];
        }

        scope.$on(Layout.DRAW, drawLine);
      }
    });
  })
;
