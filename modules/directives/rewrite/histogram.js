angular.module('dataviz.rewrite')
  .directive('blHistogram', function(ChartFactory, Translate, Layout, chartTypes, HistogramHelpers) {
    var histConfig = {
      bars: {
        minWidth: 1,
        padding: 1
      }
    };

    var clickFn = function(d, addFilter) {
      addFilter('includes', d.key);
    };

    return new ChartFactory.Component({
      template: '<g class="bl-histogram chart" ng-attr-height="{{layout.height}}" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}},{{translate.y}})"></g>',
      scope: {
        numBars: '@?'
      },
      link: function(scope, iElem, iAttrs, controllers) {
        var COMPONENT_TYPE = chartTypes.histogram;
        var graphCtrl = controllers[0];
        graphCtrl.components.register(COMPONENT_TYPE);
        var g = d3.select(iElem[0]);

        function drawHist() {
          scope.layout = graphCtrl.layout.graph;
          scope.translate = Translate.graph(scope.layout, graphCtrl.components.registered, COMPONENT_TYPE);
          var barWidth = HistogramHelpers.getBarWidth(graphCtrl.data.grouped, scope.layout, histConfig);

          var bars = g.selectAll('rect').data(graphCtrl.data.grouped);

          // Do this for all the
          bars.enter().append('rect')
            .classed('bar', true)
            .attr('y', 0)
            .attr('stroke-width', '0px')
            .attr('fill', 'steelblue')
            .classed('selected', function(d, i) {
              return true;
              //return _.contains(scope.params.filter, d.key);
            })
            .on('click', function(d, i) {
              var boundAddFilter = graphCtrl.filters.addFilter.bind(graphCtrl.filters);
              clickFn.call(this, d, boundAddFilter);
            });

          bars
            .transition().duration(300)
            .attr('x', function(d, i) {
              return graphCtrl.scale.x(d.key);
            })
            .attr('width', function(d) { return barWidth; })
            .attr('height', function(d) {
              return scope.layout.height - graphCtrl.scale.y(d.value);
            })
            .attr('transform', function(d) {
              return 'translate(0,' + (graphCtrl.scale.y(d.value))  +')';
            });


          bars
            .exit()
            .transition().duration(300)
            .attr('height', 0)
            .remove();
        }

        scope.$on(Layout.DRAW, drawHist);

      }
    });
  })

  .factory('HistogramHelpers', function() {
    var getBarWidth = function(data, layout, histConfig) {
      var idealWidth = Math.floor(layout.width / data.length) - histConfig.bars.padding;
      return (idealWidth > histConfig.bars.minWidth) ? idealWidth : histConfig.bars.minWidth;
    };

    var getNumBars = function(barOverride, data, interval) {
      if (barOverride) { return barOverride || data.length; }

      interval = interval || 1;
      var keys = _.pluck(data, 'key');
      var maxKey = _.max(keys);
      var minKey = _.min(keys);
      return Math.ceil((maxKey - minKey) / interval) + 1;
    };

    return {
      getBarWidth: getBarWidth,
      getNumBars: getNumBars
    };
  })
;
