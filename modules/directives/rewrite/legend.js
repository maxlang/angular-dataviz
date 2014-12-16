angular.module('dataviz.rewrite')
  .directive('blLegend', function(ChartFactory, Translate, Layout, LayoutDefaults, components) {
    return new ChartFactory.Component({
      template: '<g class="bl-legend" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}}, {{translate.y}})"></g>',
      link: function(scope, iElem, iAttrs, controllers) {
        // graphCtrl is responsible for communicating the keys and values in a fairly simple way to the legend
        var graphCtrl = controllers[0];
        var COMPONENT_TYPE = 'legend';
        var seriesData = ['Series1'];
        graphCtrl.components.register(COMPONENT_TYPE);
        var RECT_SIZE = 18;

        function drawLegend() {
          scope.layout = graphCtrl.layout.legend;
          scope.translate = Translate.legend(graphCtrl.layout, graphCtrl.components.registered, COMPONENT_TYPE);
        }

        var legend = d3.select(iElem[0])
          .attr('height', function(d) { return 100; });

        // set up the series tags
        var series = legend.selectAll('.series')
          .data(seriesData)
          .enter()
          .append('g')
          .attr('class', 'series')
          .attr('height', function(d) { return RECT_SIZE + LayoutDefaults.padding.legend.series.bottom; })
          .attr('width', '100%')
          .attr('transform', function(d, i) {
            var height = RECT_SIZE + LayoutDefaults.padding.legend.series.bottom;
            var horz = 0;
            var vert = i * height;
            return 'translate(' + horz + ',' + vert + ')';
          });

        series.append('rect')
          .attr('width', RECT_SIZE)
          .attr('height', RECT_SIZE)
          .attr('fill', 'red')
          .attr('stroke', 'none');

        series.append('text')
          .attr('x', RECT_SIZE + 5)
          .attr('font-size', 14)
          .attr('y', 14)
          .text(function(d) { console.log(d); return d; });

        scope.$on(Layout.DRAW, drawLegend);
      }
    });
  })

  .factory('LegendFactory', function() {
    var Legend = function(config) {
      this.label = config.label;
      this.visualization = {
        type: config.vizType,
        color: config.color
      };
    };

    return {
      Legend: Legend
    };
  });
