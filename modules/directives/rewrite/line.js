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
 <example module="dataviz.rewrite">
 <file name="index.html">
 <div>
  Height: <input type="number" ng-model="height"><br />
  Width: <input type="number" ng-model="width">
 </div>
 <div class="graph-wrapper" ng-init="width = 500; height = 200;">
   <bl-graph container-height="height" container-width="width">
      <bl-line field-x="'key'" field-y="'value'"></bl-line>
      <bl-axis direction="x"></bl-axis>
      <bl-axis direction="y"></bl-axis>
      <bl-legend></bl-legend>
   </bl-graph>
 </div>
 </file>
 </example>
 */

  // resource for namespacing all the fields
// the line is declaratively told which field to aggregate on

angular.module('dataviz.rewrite')
  .directive('blLine', function(ChartFactory, Translate, Layout, components) {

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
        var COMPONENT_TYPE = components.graph;
        var graphCtrl = controllers[0];
        graphCtrl.components.register(COMPONENT_TYPE);
        var path = d3.select(iElem[0]).select('path'); // strip off the jquery wrapper

        function drawLine() {
          scope.line = setLine(graphCtrl.scale, {x: scope.fieldX, y: scope.fieldY});
          scope.translate = Translate.graph(graphCtrl.layout, graphCtrl.components.registered, COMPONENT_TYPE);
          path.attr('d', scope.line(graphCtrl.data));
          scope.layout = graphCtrl.layout[COMPONENT_TYPE];
        }

        scope.$on(Layout.DRAW, function() {
          drawLine();
        });
      }
    });
  })
;
