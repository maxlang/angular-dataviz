angular.module('dataviz')
  .directive('blLegend', function(BlChartFactory, BlTranslate, BlLayout, BlLayoutDefaults, componentTypes, blGraphEvents) {
    return new BlChartFactory.Component({
      template: '<g class="bl-legend" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}}, {{translate.y}})"></g>',
      link: function(scope, iElem, iAttrs, graphCtrl) {
        // graphCtrl is responsible for communicating the keys and values in a fairly simple way to the legend
        var COMPONENT_TYPE = componentTypes.legend;
        var seriesData = ['Loans'];
        graphCtrl.componentsMgr.register(COMPONENT_TYPE);
        var RECT_SIZE = 18;

        function drawLegend() {
          scope.layout = graphCtrl.layoutMgr.layout.legend;
          scope.translate = BlTranslate.legend(graphCtrl.layoutMgr.layout, graphCtrl.componentsMgr.registered, COMPONENT_TYPE);
        }

        var legend = d3.select(iElem[0])
          .attr('height', function(d) { return 100; });

        // set up the series tags
        var series = legend.selectAll('.series')
          .data(seriesData)
          .enter()
          .append('g')
          .attr('class', 'series')
          .attr('height', function(d) { return RECT_SIZE + BlLayoutDefaults.padding.legend.series.bottom; })
          .attr('width', '100%')
          .attr('transform', function(d, i) {
            var height = RECT_SIZE + BlLayoutDefaults.padding.legend.series.bottom;
            var horz = 0;
            var vert = i * height;
            return 'translate(' + horz + ',' + vert + ')';
          });

        series.append('rect')
          .attr('width', RECT_SIZE)
          .attr('height', RECT_SIZE)
          .attr('fill', 'steelblue')
          .attr('stroke', 'none');

        series.append('text')
          .attr('x', RECT_SIZE + 5)
          .attr('font-size', 14)
          .attr('y', 14)
          .text(_.identity);

        scope.$on(blGraphEvents.DRAW, drawLegend);
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
