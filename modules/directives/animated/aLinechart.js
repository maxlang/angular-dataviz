angular.module('dataviz.directives').directive('aLinechart', ['$timeout', 'VizUtils', function($timeout, VizUtils) {
  return {
    restrict: 'E',
    scope: {
      data: '=',
      params: '='
    },
    link: function(scope, element) {

      //note: currently the line is meant to be styled with css, for example:
      //stroke-width: 2px;
      //stroke-opacity: 1;
      // stroke: black;



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
        'date': false,
        'multi':false,
        'asPercent':false
      });
      var initialized = false;

      // copied from
      // http://bl.ocks.org/mbostock/1667367


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

      scope.$watch('params', function(params, paramsOld) {
        if (params.options.multi && !paramsOld.options.multi) {
          init(scope.data);
        }

        //reinit if certain things change like colors
        change();
      }, true);

      var width, height, margins, range, max, leftMargin, rightMargin, w, h, bars, barPadding, barWidth, svg, g, x, y, d, xAxis, yAxis, xAxisG, yAxisG, line, path, paths, brush, brushRect, labels, keys, legendDims, legend;

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
        } else {
          max = _.max(_.pluck(data, 'value'));
        }

        leftMargin = margins.left;

        var mmax = max;

        if (o('autoMargin')) {
          //account for possible decimals
          var decimals = Math.ceil(-((Math.log(max/yTicks)/Math.log(10))));
          if (decimals > 0) {
            mmax = Math.floor(max);
            mmax += "." + Math.pow(10, decimals);
          }
          var maxString = mmax;
          //add commas
          if (_.isNumber(max) && !isNaN(max) && ((max + 1)!==max)) {
            maxString += (Array(Math.floor((mmax+"").length/3)).join(","));
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
          var yMax;
          yMax = max;
          //var yMin = data[data.length - 1].value;
          y = d3.scale.linear().domain([0, yMax]).range([h, 0]);
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

        line = d3.svg.line()
            .x(function(d, i) { return x(d.key); })
            .y(function(d, i) { return y(d.value); });

      };

      var calcInfoMulti = function(data) {
        width = o('widthPx');
        height = o('heightPx');
        margins = o('margins');
        range = o('range');

        var flattenedData = _.flatten(_.pluck(data, 'data'));
        labels = _.pluck(data, 'key');
        legendDims = calcLegendDims(labels);

        h = height - margins.top - margins.bottom;

        var yTicks = h/60;

        /**
         *  Max value just used to judge height of y axis
         *  1) defined explicitly
         *  2) highest elt in range
         *  3) highest elt in data
         */
        if (range !== 'auto') {
          max = o('max') || (range && _.isArray(range) && range[1]) || _.max(_.pluck(flattenedData, 'value'));
        } else {
          max = _.max(_.pluck(flattenedData, 'value'));
        }

        leftMargin = margins.left;
        rightMargin = margins.right;

        var mmax = max;

        if (o('autoMargin')) {
          //account for possible decimals
          var decimals = Math.ceil(-((Math.log(max/yTicks)/Math.log(10))));
          if (decimals > 0) {
            mmax = Math.floor(max);
            mmax += "." + Math.pow(10, decimals);
          }
          var maxString = mmax;
          //add commas
          if (_.isNumber(max) && !isNaN(max) && ((max + 1)!==max)) {
            maxString += (Array(Math.floor((mmax+"").length/3)).join(","));
          }

          leftMargin = (margins.left + VizUtils.measure(maxString, element[0], "y axis").width) || margins.left;
          leftMargin = leftMargin === -Infinity ? 0 : leftMargin;
          leftMargin += 9;

          rightMargin = rightMargin || 0;
          rightMargin += legendDims.width;
        }

        w = width - leftMargin - rightMargin;
        if (range !== 'auto') {
          bars = o('bars') || flattenedData.length;
        } else {
          var interval = o('interval') || 1; //TODO: handle case where interval is undefined - perhaps extrapolate from data somehow?
          var keys = _.pluck(flattenedData, 'key');
          var maxKey = _.max(keys);
          var minKey = _.min(keys);
          bars = Math.ceil((maxKey - minKey)/interval) + 1;
        }
        barPadding = o('padding');

        barWidth = (w/bars) - barPadding;

        d = o('domain');

        if(d === 'auto') {

          var xMax = _.max(_.pluck(flattenedData, 'key'));
          var xMin = _.min(_.pluck(flattenedData, 'key'));
          //TODO: use d3 to do this automatically
          xMax += (xMax - xMin)/bars;
          x = d3.scale.linear().domain([xMin, xMax]).range([0, w]);
        } else {
          x = d3.scale.linear().domain(d).range([0, w]);
        }

        if(range === 'auto') {
          var yMax;
          yMax = max;
          //var yMin = data[data.length - 1].value;
          y = d3.scale.linear().domain([0, yMax]).range([h, 0]);
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

        line = d3.svg.line()
            .x(function(d, i) { return x(d.key); })
            .y(function(d, i) { return y(d.value); });

        legendDims.top = margins.top;
        legendDims.left = leftMargin + w;


      };

      var legendSquareSizePx = 15;
      var legendPadding = 10;
      var legendPaddingLeft = 30;
      var legendSpacing = 3;
      var maxLegendWidth = 400;  //TODO: enforce
      var minLegendWidth = 100;


      function calcLegendDims(labels) {
        var slices = labels;
//        if (data.length >= o('maxSlices')) {
//          _.last(slices).key = "Other";
//        }

        return {
          width: Math.min(Math.max(( legendPadding + legendPaddingLeft) +
                  legendSquareSizePx +
                  legendSpacing + _.max(_(slices).map(function(v) {return VizUtils.measure(v, element[0], 'legend-text').width;}).value()),
              minLegendWidth), maxLegendWidth),
          height: (slices.length * legendSquareSizePx) +
              (2 * legendPadding) +
              ((slices.length - 1) * legendSpacing)
        };
      }

      function init(data) {
        $(element[0]).html('<svg></svg>');

        if (o('multi')) {
          calcInfoMulti(data);
        } else {
          calcInfo(data);
        }

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


        if (o('multi')) {
          paths = g.selectAll("path");
//              .data(scope.data, function(d) {return d && d.data;}).enter().append("path")
//              .classed("line", "true")
//              .attr("class", function(d, i) {
//                return "line-" + i;
//              })
//              .attr("fill", "none")
////            .attr("stroke", "black")
////            .attr("stroke-width", 2)
//              .attr("d", line);
        } else {
          path = g.append("path")
              .datum(scope.data)
              .attr("class", "line")
              .attr("fill", "none")
//            .attr("stroke", "black")
//            .attr("stroke-width", 2)
              .attr("d", line);
        }

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


        legend = svg.append('g')
            .attr("class", "legend")
            .attr("width", legendDims.width)
            .attr("height", legendDims.height)
            .attr("transform", "translate(" + legendDims.left + "," + legendDims.top + ")");

        keys = legend.selectAll("g");

        initialized = true;
      }

      function change() {
        if (o('multi')) {
          calcInfoMulti(scope.data);
        } else {
          calcInfo(scope.data);
        }

        if (o('asPercent')) {
          yAxis.tickFormat(function(v) {
            return 100*v + "%";
          });
        } else {
          yAxis.tickFormat(function(v) {
            return v;
          });
        }

        svg.transition().duration(300)
            .attr("width", width)
            .attr("height", height)
            .attr("fill", o('textColor'))
            .attr("fill-opacity",o('fillOpacity'))
            .style("background-color", o('bgColor'));
        g.transition().duration()
            .attr('width', w)
            .attr('height', h)
            .attr('transform', 'translate(' + leftMargin + ', ' + margins.top + ')');

        var line = d3.svg.line()
            .x(function(d) { return x(d.key); })
            .y(function(d) { return y(d.value); });

        if (o('multi')) {
          paths = paths.data(scope.data);
          paths.enter().append("path")
              .attr("class", function(d, i) {return "line-" + i;})
              .classed("line", true)
              .attr("fill", "none")
//            .attr("stroke", "black")
//            .attr("stroke-width", 2)
              .attr("d", function(d, i) {
                return line(d.data);
              });
          paths
              .transition()
              .duration(300)
              .ease("linear")
              .attr("d", function(d, i) {
                return line(d.data);
              });
        } else {
          path.datum(scope.data).transition()
              .duration(300)
              .ease("linear")
              .attr("d", line);
        }

//        lines.exit().transition().duration(300).remove();
//
//        lines.transition().duration(300)
//            .attr("d", line);


//        rects.enter().append('line')
//            .classed('a-line', true)
//            .attr('stroke-width', 2) //o('padding')+'px')
//            .attr('fill', o('barColor'))
//            .attr('fill-opacity', o('barOpacity'))
//            .attr('x', function(d, i) { return _.isNumber(d.key) ? x(d.key) : x(i);})
//            .attr('width', barWidth)
//            .attr('y', h)
//            .attr('height', 0);
////            .transition().delay(2000).duration(3000)
////            .attr('y', function(d, i) { return y(d.value); })
////            .attr('height', function(d, i) { return h - y(d.value); });
//
//
//        rects.exit().transition().duration(300).attr('height', 0).attr('y', h).remove();
//
//        rects.transition().duration(300)
//
//            .attr('x', function(d, i) { return _.isNumber(d.key) ? x(d.key) : x(i);})
//            .attr('y', function(d, i) { return y(d.value); })
//            .attr('width', barWidth)
//            .attr('height', function(d, i) { return h - y(d.value); })
//            .attr('stroke-width', o('padding')+'px')
//            .attr('fill', o('barColor'))
//            .attr('fill-opacity', o('barOpacity'));

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


        legend.transition().duration(300)
            .attr("width", legendDims.width)
            .attr("height", legendDims.height)
            .attr("transform", "translate(" + legendDims.left + "," + legendDims.top + ")");

        keys = keys.data(labels);

        var k = keys.enter().append("g")
            .attr("transform", function(d, i) { /*console.log(d,i);*/ return "translate(" + legendPaddingLeft + "," + (legendPadding + (i * (legendSpacing + legendSquareSizePx))) + ")"; });

        k.append("rect")
            .attr("width", legendSquareSizePx)
            .attr("height", legendSquareSizePx)
            .attr("class", function(d, i) { return "line-" + i; } );

        var nonTextWidth = legendSquareSizePx + (legendPadding + legendPaddingLeft) + legendSpacing;
        var textWidth = Math.min((legendDims.width - nonTextWidth), (width - nonTextWidth));

        var tc = d3.rgb(o('textColor'));
        var rgba = [tc.r, tc.g, tc.b, o('fillOpacity')];

        var text = k.append("foreignObject")
            .attr("x", legendSquareSizePx + legendPadding + legendSpacing)
            .attr("y", 0)
            .attr('width', textWidth)
            .attr('height', '1.2em')
            .append("xhtml:div")
            .html(function(d, i) { return "<div style='width:" + textWidth + "px; height:1.2em; overflow:hidden; text-overflow:ellipsis;color: rgba(" + rgba.join(',') + ");white-space:nowrap'>" + d + "</div>";});
//
        keys.transition().duration(300)
            .attr("transform", function(d, i) { /*console.log(d,i);*/ return "translate(" + legendPaddingLeft + "," + (legendPadding + (i * (legendSpacing + legendSquareSizePx))) + ")"; })
            .call(function() {
              //TODO: incorporate into transition better
              $(this[0]).width(textWidth).find('foreignObject').attr('class','legend-text').attr('width', textWidth).find('div').width(textWidth).css('color', "rgba(" + rgba.join(',') + ")");
            });


//        k.append("text")
//            .attr("x", o('legendSquareSizePx') + o('legendPadding') + o('legendSpacing'))
//            .attr("y", 9)
//            .attr("dy", ".35em")
//            .text(function(d) {
//              return d.data.key; }).classed('pie-legend', true);

        keys.exit().remove();

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
