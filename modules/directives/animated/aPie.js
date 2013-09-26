angular.module('dataviz.directives').directive('aPie', ['$timeout', 'VizUtils', function($timeout, VizUtils) {
  return {
    restrict: 'E',
    scope: {
      data: '=',
      params: '='
    },
    link: function(scope, element) {
      var o = VizUtils.genOptionGetter(scope,{
        widthPx: 175,
        heightPx: 175,
        minPadding: 10,
        legend: true,
        legendWidth: 'auto',
        legendSquareSizePx: 19,
        legendPadding: 10,
        legendSpacing: 5,
        maxLegendWidth: 200,
        minLegendWidth: 100,
        maxSlices: 4,    // maximum number of slices including 'other' slice
        otherSlice: true,
        donutWidth: 40,
        bgColor: '#3976BF',
        textColor: 'white',
        fillOpacity: '0.8'
      });
      var initialized = false;

      // copied from:
      // http://bl.ocks.org/mbostock/3888852
      // and
      // http://bl.ocks.org/mbostock/3887235
      // and
      // http://bl.ocks.org/mbostock/5682158


      scope.$watch('data', function(data, oldData) {
        if(!initialized) {
          init(data);
        }
        change();
      }, true);

      scope.$watch('params', function(params) {
        //reinit if certain things change like colors
        change();
      }, true);

      var color, pie, arc, svg, path, legendDims, hasLegend, legend, g, keys, opacity;

      function calcLegendDims(data) {
        var slices = _.first(data, o('maxSlices'));
        if (data.length >= slices.length) {
          _.last(slices).key = "Other";
        }

        return {
          width: Math.max(Math.min((2 * o('legendPadding')) +
              o('legendSquareSizePx') +
              o('legendSpacing') + _.max(_(data).map(function(v) {return VizUtils.measure(v.key, element[0], 'legend-text').width;})),
              o('maxLegendWidth')), o('maxLegendWidth')),
          height: (slices.length * o('legendSquareSizePx')) +
              (2 * o('legendPadding')) +
              ((slices.length - 1) * o('legendSpacing'))
        };
      }

      var width,height,padding,radius;

      var calcInfo = function(data) {
        width = o('widthPx');
        height = o('heightPx');
        padding = o('minPadding');
        radius = Math.min(width - padding*2, height - padding*2) / 2; //TODO: possibly change this size based on the legend
        legendDims = calcLegendDims(data);


        /***
         * Options
         *
         * 1) Width > Height, pie < legend : legend on the right
         * 2) Height > Width, pie < legend : legend below
         * 3) Pie >legend, width - pie < legend, height - pie < legend: legend inside donut
         *
         */
        hasLegend = o('legend');
        var diam = 2*radius;

        if (width - padding - diam < legendDims.width && height - padding - diam < legendDims.height) {
          legendDims.width = Math.max(o('minLegendWidth'), width - padding - diam);
          legendDims.width = Math.max(legendDims.width, Math.sqrt(Math.pow(2 * radius, 2)/Math.pow(legendDims.height, 2)));
        }

        // does the legend fit at all?
        if (width - padding - diam < o('minLegendWidth') &&
            height - padding - diam < legendDims.height &&
            Math.pow(legendDims.height, 2) + Math.pow(legendDims.width, 2) > Math.pow(2 * radius, 2)) {
          hasLegend = false;
        }
//        var fullWidth = diam + padding * 2;
//        var fullHeight = diam + padding * 2;

        if (hasLegend) {
          // legend on left/right
          if (width - padding - diam < legendDims.width && height - padding - diam > legendDims.height) {
            legendDims.top = padding + diam;
            legendDims.left = padding;
//            fullHeight += legendDims.height;
          } else if (width - padding - diam > legendDims.width) {
            legendDims.left = padding + diam;
            legendDims.top = padding;
//            fullWidth += legendDims.width;
          } else {
            legendDims.top = padding + radius - legendDims.height/2;
            legendDims.left = padding + radius - legendDims.width/2;
          }
        }
        arc = d3.svg.arc()
            .innerRadius(Math.max(0,radius - o('donutWidth')))
            .outerRadius(radius);
      };

      function init(data) {
        $(element[0]).html('<svg></svg>');

        calcInfo(data);

        color = d3.scale.ordinal().range([
            'rgba(255,255,255)',
            'rgba(255,255,255)',
          'rgba(255,255,255)',
          'rgba(255,255,255)'
          ]);
        opacity = d3.scale.ordinal().range([
          1,0.8,0.6,0.4
        ]);


        pie = d3.layout.pie()
            .value(function(d) {
              return d.value; })
            .sort(null);

        svg = d3.select(element[0]).select("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", o('textColor'))
            .attr("fill-opacity",o('fillOpacity'))
            .style("background-color", o('bgColor'));
        g = svg.append("g")
            .attr("transform", "translate(" + (radius + padding) + "," + (radius + padding) + ")");

        path = g.selectAll("path");

        if (hasLegend) {
          legend = svg.append('g')
              .attr("class", "legend")
              .attr("width", legendDims.width)
              .attr("height", legendDims.height)
              .attr("transform", "translate(" + legendDims.left + "," + legendDims.top + ")");

          keys = legend.selectAll("g");
        }

        initialized = true;
      }

      function change() {
        calcInfo(scope.data);

        svg.transition()
            .duration(300)
            .attr("width", o('widthPx'))
            .attr("height", o('heightPx'))
            .attr("fill", o('textColor'))
            .attr("fill-opacity",o('fillOpacity'))
            .style("background-color", o('bgColor'));

        g.transition()
            .duration(300)
            .attr("transform", "translate(" + (radius + padding) + "," + (radius + padding) + ")");


        var data0 = path.data();
        var pieData = scope.data;
        if (pieData.length >= o('maxSlices')) {
          pieData[o('maxSlices') - 1].key = "Other";
          pieData[o('maxSlices') - 1].value = _(pieData).rest(o('maxSlices') -1).reduce(function(acc, val) {
            return acc + val.value;
          }, 0);
        }

        var data1 = pie(pieData);

        path = path.data(data1, key);

        path.enter().append("path")
            .each(function(d, i) { this._current = findNeighborArc(i, data0, data1, key) || d; })
            .attr("fill", function(d) { return color(d.data.key); })
            .attr("fill-opacity", function(d) { return opacity(d.data.key); })
            .append("title")
            .text(function(d) { return d.data.key; });

        path.exit()
            .datum(function(d, i) { return findNeighborArc(i, data1, data0, key) || d; })
            .transition()
            .duration(750)
            .attrTween("d", arcTween)
            .remove();

        path.transition()
            .duration(750)
            .attrTween("d", arcTween);

        legend.transition().duration(300)
            .attr("width", legendDims.width)
            .attr("height", legendDims.height)
            .attr("transform", "translate(" + legendDims.left + "," + legendDims.top + ")");

        keys = keys.data(data1, key);

        var k = keys.enter().append("g")
            .attr("transform", function(d, i) { return "translate(" + o('legendPadding') + "," + (i * (o('legendSpacing') + o('legendSquareSizePx'))) + ")"; });

        k.append("rect")
            .attr("width", o('legendSquareSizePx'))
            .attr("height", o('legendSquareSizePx'))
            .style("fill", function(d) {
              return color(d.data.key); })
            .attr("fill-opacity", function(d) { return opacity(d.data.key); });

        k.append("text")
            .attr("x", o('legendSquareSizePx') + o('legendPadding') + o('legendSpacing'))
            .attr("y", 9)
            .attr("dy", ".35em")
            .text(function(d) {
              return d.data.key; }).classed('pie-legend', true);

        keys.exit().remove();

        keys.transition().duration(300);
//        keys.attr("fill", function(d) { return color(d.data.key); })
//              .append("title")
//              .text(function(d) { return d.data.key; });
//
//          path.exit()
//              .datum(function(d, i) { return findNeighborArc(i, data1, data0, key) || d; })
//              .transition()
//              .duration(750)
//              .attrTween("d", arcTween)
//              .remove();
//
//          path.transition()
//              .duration(750)
//              .attrTween("d", arcTween);
//
//
//        .attr("transform", "tr")
//              .data(data)
//              .enter().append("g")
//
//          legend
//
//          legend
      }
//      });

      function key(d) {
        return d.data.key;
      }

      function type(d) {
        d.value = +d.value;
        return d;
      }

      function findNeighborArc(i, data0, data1, key) {
        var d;
        return (d = findPreceding(i, data0, data1, key)) ? {startAngle: d.endAngle, endAngle: d.endAngle}
            : (d = findFollowing(i, data0, data1, key)) ? {startAngle: d.startAngle, endAngle: d.startAngle}
            : null;
      }

// Find the element in data0 that joins the highest preceding element in data1.
      function findPreceding(i, data0, data1, key) {
        var m = data0.length;
        while (--i >= 0) {
          var k = key(data1[i]);
          for (var j = 0; j < m; ++j) {
            if (key(data0[j]) === k) return data0[j];
          }
        }
      }

// Find the element in data0 that joins the lowest following element in data1.
      function findFollowing(i, data0, data1, key) {
        var n = data1.length, m = data0.length;
        while (++i < n) {
          var k = key(data1[i]);
          for (var j = 0; j < m; ++j) {
            if (key(data0[j]) === k) return data0[j];
          }
        }
      }

      function arcTween(d) {
        var i = d3.interpolate(this._current, d);
        this._current = i(0);
        return function(t) { return arc(i(t)); };
      }
    }
  };
}]);
