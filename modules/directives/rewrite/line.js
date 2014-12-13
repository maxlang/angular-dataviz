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
 <div class="graph-wrapper">
   <bl-graph container-height="200" container-width="600">
      <bl-line></bl-line>
      <bl-axis direction="x"></bl-axis>
      <bl-axis direction="y"></bl-axis>
   </bl-graph>
 </div>
 </file>
 </example>
 */

angular.module('dataviz.rewrite')
  .directive('blLine', function(ChartFactory, Translate, Layout) {
    var setLine = function(xScale, yScale) {
      return d3.svg.line()
        .x(function(d) { return xScale(d.key); })
        .y(function(d) { return yScale(d.value); })
        .interpolate('basis');
    };

    return new ChartFactory.Component({
      template:
      '<g ng-attr-width="{{layout.width}}" ng-attr-height="{{layout.height}}" class="bl-line chart">' +
        '<path ng-attr-transform="translate({{translate.x}}, {{translate.y}})"' +
      '</g>',
      link: function(scope, iElem, iAttrs, controllers) {
        var COMPONENT_TYPE = 'graph';
        var graphCtrl = controllers[0];
        var path = d3.select(iElem[0]).select('path'); // strip off the jquery wrapper

        graphCtrl.components.register(COMPONENT_TYPE);

        function drawLine() {
          scope.line = setLine(graphCtrl.scale.x, graphCtrl.scale.y);
          scope.translate = Translate.getGraphTranslation(graphCtrl.layout, graphCtrl.components.registered, COMPONENT_TYPE);
          path.attr('d', scope.line(graphCtrl.data));
          scope.layout = graphCtrl.layout[COMPONENT_TYPE];
        }

        scope.$on(Layout.DRAW, function() {
          drawLine();
        });
      }
    });
  })

  .directive('blLegend', function(ChartFactory) {
    return new ChartFactory.Component({
      template: '<div class="legend"></div>',
      link: function(scope, iElem, iAttrs, controllers) {
        // graphCtrl is responsible for communicating the
        var graphCtrl = controllers[0];

      }
    });
  })
;
