angular.module('dataviz.directives').directive('aHistogram', ['$timeout', 'VizUtils', function($timeout, VizUtils) {
  return {
    restrict: 'E',
    scope: {
      data: '=',
      params: '='
    },
    link: function(scope, element) {

      var o = VizUtils.genOptionGetter(scope,{
        'tooltips' : false,
        'showValues': true,
        'staggerLabels': true,
        'widthPx' : 586,
        'heightPx' : 286,
        'padding': 2,
        'margins': {top:10, left: 30, bottom:20, right: 10},
        'autoMargin' : true,
        'domain' : 'auto',
        'range' : 'auto',
        'bars' : null,
        'realtime' : true,
        'snap' : false,
        'filterSelector' : false,
        'date' : false
      });
      var initialized = false;

      // copied from:
      // http://bl.ocks.org/mbostock/3888852
      // and
      // http://bl.ocks.org/mbostock/3887235
      // and
      // http://bl.ocks.org/mbostock/5682158


      scope.$watch('data', function(data, oldData) {
        if (o('date')) {
          var ensureDates = _.map(data, function(d) {
            if (!d) {
              return;
            }
            return {
              key:moment(d.key),
              value: d.value
            };
          });
          Array.prototype.splice.apply(scope.data,[0,scope.data.length].concat(ensureDates));
        }

        if(!initialized) {
          init(data);
        }
        change();
      }, true);

      scope.$watch('params', function(params) {
        //reinit if certain things change like colors
        change();
      }, true);

      var width, height, margins, range, max, min, leftMargin, w, h, bars, barPadding, barWidth, svg, g, x, y, d, xAxis, yAxis, xAxisG, yAxisG, rects, brush, brushRect;

      var calcInfo = function(data) {
        width = o('widthPx');
        height = o('heightPx');
        margins = o('margins');
        range = o('range');

        h = height - margins.top - margins.bottom;

        var yTicks = h/60;

        /**
         *  Max value just used to judge width of y axis
         *  1) defined explicitly
         *  2) highest elt in range
         *  3) highest elt in data
         */
        if (range !== 'auto') {
          max = o('max') || (range && _.isArray(range) && range[1]) || _.max(_.pluck(data, 'value'));
          min = o('min') || (range && _.isArray(range) && range[0]) || _.min(_.pluck(data, 'value'));
        } else {
          max = _.max(_.pluck(data, 'value'));
          min = _.min(_.pluck(data, 'value'));
        }

        leftMargin = margins.left;

        if (o('autoMargin')) {
          //account for possible decimals
          var decimals = Math.ceil(-((Math.log(max/yTicks)/Math.log(10))));
          if (decimals > 0) {
            max = Math.floor(max);
            max += "." + Math.pow(10, decimals);
          }
          var maxString = max;
          //add commas
          if (_.isNumber(max) && ((max + 1)!==max)) {
            maxString += (Array(Math.floor((max+"").length/3)).join(","));
          }

          leftMargin = (margins.left + VizUtils.measure(maxString, element[0], "y axis").width) || margins.left;
          leftMargin = leftMargin === -Infinity ? 0 : leftMargin;
          leftMargin += 9;
        }

        w = width - leftMargin - margins.right;
        if (range !== 'auto') {
          bars = o('bars') || data.length;
        } else {
          var interval = o('interval') || 1; //TODO: handle case where interval is undefined - perhaps extrapolate from data somehow?
          var keys = _.pluck(data, 'key');
          var maxKey = _.max(keys);
          var minKey = _.min(keys);
          bars = Math.ceil((maxKey - minKey)/interval) + 1;
        }
        barPadding = o('padding');

        barWidth = (w/bars) - barPadding;

        d = o('domain');

        if(d === 'auto') {

          var xMax = _.max(_.pluck(data, 'key'));
          var xMin = _.min(_.pluck(data, 'key'));
          //TODO: use d3 to do this automatically
          xMax += (xMax - xMin)/bars;
          x = d3.scale.linear().domain([xMin, xMax]).range([0, w]);
        } else {
          x = d3.scale.linear().domain(d).range([0, w]);
        }

        if(range === 'auto') {
          var yMax, yMin;
            yMax = max;
            yMin = Math.min(min, 0);
          y = d3.scale.linear().domain([yMin, yMax]).range([h, 0]);
        } else {
          y = d3.scale.linear().domain(range).range([h, 0]);
        }


        xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(w/100);
        if (o('date')) {
          xAxis.tickFormat(function(d) {
            return moment(d).format('YYYY-MM-DD');
          });
        }

        yAxis = d3.svg.axis().scale(y).orient("left").ticks(yTicks);

      };

      function init(data) {
        $(element[0]).html('<svg></svg>');

        calcInfo(data);

        svg = d3.select(element[0]).select("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", o('textColor'))
            .attr("fill-opacity",o('fillOpacity'))
            .style("background-color", o('bgColor'));
        g = svg.append('g')
            .classed('main', true)
            .attr('width', w)
            .attr('height', h)
            .attr('transform', 'translate(' + leftMargin + ', ' + margins.top + ')');

        scope.brush.x(x);

        rects = g.selectAll('rect');

        xAxisG =   svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(" + leftMargin + ", " + (h + margins.top) + ")")
            .attr('fill', o('axisColor'))
            .attr('fill-opacity', o('axisOpacity'))
            .call(xAxis);

        yAxisG =   svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + leftMargin + ", " + (margins.top) + ")")
            .attr('fill', o('axisColor'))
            .attr('fill-opacity', o('axisOpacity'))
            .call(yAxis);

        brush = g.append("g")
            .attr("class", "x brush")
            .call(scope.brush);

        brushRect = brush.selectAll("rect")
            .attr("y", -6)
            .attr("height", h+8);

        initialized = true;
      }

      function change() {
        calcInfo(scope.data);
//
        svg.transition().duration(300)
            .attr("width", width)
            .attr("height", height)
            .attr("fill", o('textColor'))
            .attr("fill-opacity",o('fillOpacity'))
            .style("background-color", o('bgColor'));
        g.transition().duration(300)
            .attr('width', w)
            .attr('height', h)
            .attr('transform', 'translate(' + leftMargin + ', ' + margins.top + ')');

        rects = rects.data(scope.data, key);

        var rectX = function(d, i) {
          if (o('date')) {
            return x(d.key);
          } else {
            return _.isNumber(d.key) ? x(d.key) : x(i);
          }
        };

        rects.enter().append('rect')
            .classed('a-bar', true)
            .attr('stroke-width', o('padding')+'px')
            .attr('fill', o('barColor'))
            .attr('fill-opacity', o('barOpacity'))
            .attr('x', rectX)
            .attr('width', barWidth)
            .attr('y', h)
            .attr('height', 0)
            .append("title")
            .text(function(d) { return d.key + ":" + d.value; });
//            .transition().delay(2000).duration(3000)
//            .attr('y', function(d, i) { return y(d.value); })
//            .attr('height', function(d, i) { return h - y(d.value); });


        rects.exit().transition().duration(300).attr('height', 0).attr('y', h).remove();

        rects.transition().duration(300)

            .attr('x', rectX)
            .attr('y', function(d, i) { return d.value > 0 ? y(d.value) : y(0); })
            .attr('width', barWidth)
            .attr('height', function(d, i) { return Math.abs(y(0) - y(d.value)); })
            .attr('stroke-width', o('padding')+'px')
            .attr('fill', o('barColor'))
            .attr('fill-opacity', o('barOpacity'));

        xAxisG.transition().duration(300)
            .attr("transform", "translate(" + leftMargin + ", " + (h + margins.top) + ")")
            .attr('fill', o('axisColor'))
            .attr('fill-opacity', o('axisOpacity'))
            .call(xAxis);

        yAxisG.transition().duration(300)
            .attr("transform", "translate(" + leftMargin + ", " + (margins.top) + ")")
            .attr('fill', o('axisColor'))
            .attr('fill-opacity', o('axisOpacity'))
            .call(yAxis);

        scope.brush.x(x);

        brush.transition().duration(300)
            .call(scope.brush.extent(scope.brush.extent()))
            .selectAll('rect')
            .attr("height", h+8);


//        g.transition()
//            .duration(300)
//            .attr("transform", "translate(" + (radius + padding) + "," + (radius + padding) + ")");
//
//
//        var data0 = path.data();
//        var pieData = _.cloneDeep(scope.data);
//        if (pieData.length >= o('maxSlices')) {
//          pieData[o('maxSlices') - 1].key = "Other";
//          pieData[o('maxSlices') - 1].value = _(pieData).rest(o('maxSlices') -1).reduce(function(acc, val) {
//            return acc + val.value;
//          }, 0);
//          pieData = _.first(pieData, o('maxSlices'));
//        }
//
//        var data1 = pie(pieData);
//
//        path = path.data(data1, key);
//
//        path.enter().append("path")
//            .each(function(d, i) { this._current = findNeighborArc(i, data0, data1, key) || d; })
//            .attr("fill", function(d) { return color(d.data.key); })
//            .attr("fill-opacity", function(d) { return opacity(d.data.key); })
//            .append("title")
//            .text(function(d) { return d.data.key; });
//
//        path.exit()
//            .datum(function(d, i) { return findNeighborArc(i, data1, data0, key) || d; })
//            .transition()
//            .duration(750)
//            .attrTween("d", arcTween)
//            .remove();
//
//        path.transition()
//            .duration(750)
//            .attrTween("d", arcTween);
//
//        legend.transition().duration(300)
//            .attr("width", legendDims.width)
//            .attr("height", legendDims.height)
//            .attr("transform", "translate(" + legendDims.left + "," + legendDims.top + ")");
//
//        keys = keys.data(data1, key);
//
//        var k = keys.enter().append("g")
//            .attr("transform", function(d, i) { return "translate(" + o('legendPadding') + "," + (i * (o('legendSpacing') + o('legendSquareSizePx'))) + ")"; });
//
//        k.append("rect")
//            .attr("width", o('legendSquareSizePx'))
//            .attr("height", o('legendSquareSizePx'))
////            .attr("fill", function(d) {
////              return color(d.data.key); })
//            .attr("fill-opacity", function(d) { return opacity(d.data.key); });
//
//        //TODO: figure out text ellipsis issue
////        var textWidth = legendDims.width - o('legendSquareSizePx') + 2* o('legendPadding') + o('legendSpacing');
////
////        var text = k.append("foreignObject")
////            .attr("x", o('legendSquareSizePx') + o('legendPadding') + o('legendSpacing'))
////            .attr("y", 0)
////            .attr('width', textWidth)
////            .attr('height', '1.2em')
////            .append("xhtml:div")
////            .html(function(d, i) { return "<div style='width:" + textWidth + "px; height:1.2em; overflow:hidden; text-overflow:ellipsis;'>" + d.data.key + "</div>";});
////
////        var k2 = keys.transition().duration(300).selectAll('foreignObject');
////
////        k2.attr('width', textWidth);
////            //.html(function(d, i) { return "<div style='width:" + textWidth + "px; height:1.2em; overflow:hidden; text-overflow:ellipsis;'>" + d.data.key + "</div>";});
//
//
//        k.append("text")
//            .attr("x", o('legendSquareSizePx') + o('legendPadding') + o('legendSpacing'))
//            .attr("y", 9)
//            .attr("dy", ".35em")
//            .text(function(d) {
//              return d.data.key; }).classed('pie-legend', true);
//
//        keys.exit().remove();
//
//        keys.transition().duration(300);
      }
//      });

      function key(d) {
        return d.key;
      }

      function setSelected(filter, extent) {
        if (!extent || _.isEmpty(extent) || extent[0] === extent[1]) {
          scope.$apply(function () {
            filter.splice(0, filter.length);
          });
        } else {
          scope.$apply(function () {
            filter.splice(0, filter.length, extent);
          });
        }
      }

      scope.$watch('params.filter', function(f) {
        if (f) {
          console.log('setting brush');
          setBrush(scope.brush, f[0]);
        }
      }, true);

      function setBrush(brush, extent) {
        if (!extent) {
          brush.clear();
        } else {
          brush.extent(extent);
        }
        brush(brush === scope.brush ?  d3.select(element[0]).select('.x.brush') : d3.select(element[0]).select('.x.brush2'));
      }

      $(document).on('keyup keydown', function(e){scope.shifted = e.shiftKey; return true;} );

      scope.brush = d3.svg.brush()
          .on("brush", function() {brushed(scope.brush, this);})
          .on("brushstart", function() {brushstart(scope.brush);})
          .on("brushend", function() {brushend(scope.brush);});


      function brushed(brush) {
        if ((brush === scope.brush && scope.params.filterNum) || (brush === scope.brush2 && !scope.params.filterNum)) {
          brush.extent(brush.oldExtent);
          brush(brush === scope.brush ?  d3.select(element[0]).select('.x.brush') : d3.select(element[0]).select('.x.brush2'));
          return;
        }

        var extent = brush.extent();
        if (o('snap') && extent && extent.length === 2) {
          var domain = o('domain');
          var buckets = o('bars');
          var range = domain[1] - domain[0];
          var step = range/buckets;
          extent = [Math.round(extent[0]/step) * step, Math.round(extent[1]/step) * step];
          brush.extent(extent);
          brush(brush === scope.brush ?  d3.select(element[0]).select('.x.brush') : d3.select(element[0]).select('.x.brush2')); //apply change
        }

        if (o('realtime')) {
          setSelected(scope.params.filterNum ? scope.filter2 : scope.params.filter, extent);
        }
      }

      function brushstart(brush) {
        brush.oldExtent = brush.extent();
      }

      function brushend(brush) {
        if ((brush === scope.brush && scope.params.filterNum) || (brush === scope.brush2 && !scope.params.filterNum)) {
          brush.extent(brush.oldExtent);
          brush(brush === scope.brush ?  d3.select(element[0]).select('.x.brush') : d3.select(element[0]).select('.x.brush2'));
          return;
        }
        setSelected(scope.params.filterNum ? scope.filter2 : scope.params.filter, brush.extent());
      }

    }
  };
}]);
