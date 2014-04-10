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
        maxLegendWidth: 400,  //TODO: enforce
        minLegendWidth: 100,
        maxSlices: 4,    // maximum number of slices including 'other' slice
        otherSlice: true,
        donutWidth: 40,
        bgColor: '#3976BF',
        textColor: 'white',
        fillOpacity: '0.8',
        pieStroke: 'black',
        pieStrokeWidth: '2',
        pieStrokeOpacity: '0.4',
        selectedStroke: 'white',
        selectedStrokeOpacity:'1'

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

      var color, pie, arc, svg, path, legendDims, hasLegend, legend, g, keys, opacity, getArcFunc;

      function calcLegendDims(data) {
        var slices = _.cloneDeep(_.first(data, o('maxSlices')));
        if (data.length >= o('maxSlices')) {
          _.last(slices).key = "Other";
        }

        return {
          width: Math.min(Math.max((2 * o('legendPadding')) +
              o('legendSquareSizePx') +
              o('legendSpacing') + _.max(_(data).map(function(v) {return VizUtils.measure(v.key, element[0], 'legend-text').width;})),
              o('minLegendWidth')), o('maxLegendWidth')),
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
        var oldWidth = legendDims.width;
        if (width - padding - diam < legendDims.width && height - padding - diam < legendDims.height) {
          legendDims.width = Math.max(o('minLegendWidth'), width - padding - diam);
          if (Math.pow(legendDims.height, 2) < Math.pow(2 * (radius - o('donutWidth')), 2)) {
            legendDims.width = Math.max(legendDims.width, Math.sqrt(Math.pow(2 * (radius - o('donutWidth')), 2) - Math.pow(legendDims.height, 2)));
          }
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
          if (width - padding - diam < legendDims.width && height - padding - diam >= legendDims.height) {
            legendDims.top = padding + diam;
            legendDims.left = padding;
            legendDims.width = Math.max(o('minLegendWidth'), width);
//            fullHeight += legendDims.height;
          } else if (width - padding - diam >= legendDims.width) {
            legendDims.left = padding + diam;
            legendDims.top = padding;
            legendDims.width = Math.max(o('minLegendWidth'), width - diam);
//            fullWidth += legendDims.width;
          } else {
            legendDims.width = Math.max(o('minLegendWidth'), Math.min(oldWidth, Math.sqrt(Math.pow(2 * (radius - o('donutWidth')), 2) - Math.pow(legendDims.height, 2))));
            legendDims.top = padding + radius - legendDims.height/2;
            legendDims.left = padding + radius - legendDims.width/2;

          }
        }
        arc = d3.svg.arc()
            .innerRadius(Math.max(0,radius - o('donutWidth')))
            .outerRadius(radius);

        getArcFunc = function(pop) {
          return d3.svg.arc()
              .innerRadius(Math.max(pop,radius - o('donutWidth') + pop))
              .outerRadius(radius + pop);
        };
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
          0.95,0.8,0.65,0.5,0.35,0.1
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
        var pieData = _.cloneDeep(scope.data);
        if (pieData.length >= o('maxSlices')) {
          pieData[o('maxSlices') - 1].other = true;
          pieData[o('maxSlices') - 1].otherKeys = [];
          pieData[o('maxSlices') - 1].value = _(pieData).rest(o('maxSlices') -1).reduce(function(acc, val) {
            pieData[o('maxSlices') - 1].otherKeys.push(val.key);
            return acc + val.value;
          }, 0);
          pieData[o('maxSlices') - 1].key = "Other";
          pieData = _.first(pieData, o('maxSlices'));
        }

        _.each(pieData, function(v, k) {
          v.selected = _.contains(scope.params.filter, v.key) || (v.other && _.intersection(scope.params.filter, v.otherKeys).length > 0);
        });

        var data1 = pie(pieData);

        path = path.data(data1, key);

        path.enter().append("path")
            .each(function(d, i) { this._current = findNeighborArc(i, data0, data1, key) || d; })
            .attr("fill", function(d) { return color(d.data.key); })
            .attr("fill-opacity", function(d) { return opacity(d.data.key); })
            .attr("stroke", function(d) {
              return _.contains(scope.params.filter, d.data.key) || (d.data.other && _.intersection(scope.params.filter, d.data.otherKeys).length > 0) ? o('selectedStroke') : o('pieStroke');
            })
            .attr("stroke-width", o('pieStrokeWidth'))
            .attr("stroke-opacity", function(d) {
              return _.contains(scope.params.filter, d.data.key) || (d.data.other && _.intersection(scope.params.filter, d.data.otherKeys).length > 0) ? o('selectedStrokeOpacity') : o('pieStrokeOpacity');
            })
            .attr("class", function(d) {
              return d.data.key.toLowerCase().replace(/[^\-A-Za-z0-9_]/g,"_") + "-color";
            })
            .on('click', function(d, i) {
              if (d.data.other) {
                if (_.difference(d.data.otherKeys, scope.params.filter).length === 0) { //all keys are in filter
                  if (scope.shifted) {
                    scope.$apply(function() {
                      _.remove(scope.params.filter, function(v) {
                        return _.contains(d.data.otherKeys, v);
                      });
                    });
                  } else {
                    scope.$apply(function() {
                      Array.prototype.splice.apply(scope.params.filter, [0, scope.params.filter.length]);
                    });
                  }
                } else if (_.intersection(d.data.otherKeys, scope.params.filter).length > 0) { //some keys are in filter
                  var diff = _.difference(scope.params.filter, d.data.otherKeys);
                  if (scope.shifted) {
                    scope.$apply(function() {
                      _.each(diff, function(v) {
                        scope.params.filter.push(v);
                      });
                    });
                  } else {
                    scope.$apply(function() {
                      _.remove(scope.params.filter, function(v) {
                        return _.contains(d.data.otherKeys, v);
                      });
                    });
                  }
                } else { // no keys are in filter
                  if (scope.shifted) {
                    scope.$apply(function() {
                      _.each(d.data.otherKeys, function(v) {
                        scope.params.filter.push(v);
                      });
                    });
                  } else {
                    scope.$apply(function() {
                      Array.prototype.splice.apply(scope.params.filter, [0, scope.params.filter.length].concat(d.data.otherKeys));
                    });
                  }
                }
              } else if (_.contains(scope.params.filter, d.data.key)) {
                if (scope.shifted) {
                  scope.$apply(function() {
                    scope.params.filter.splice(scope.params.filter.indexOf(d.data.key), 1);
                  });
                } else {
                  scope.$apply(function() {
                    scope.params.filter.splice(0, scope.params.filter.length);
                  });
                }
              } else {
                if (!scope.shifted) {
                  scope.$apply(function() {
                    scope.params.filter.splice(0, scope.params.filter.length);
                  });
                }
                scope.$apply(function() {
                  scope.params.filter.push(d.data.key);
                });
              }
            });


        path.exit()
            .datum(function(d, i) { return findNeighborArc(i, data1, data0, key) || d; })
            .transition()
            .duration(300)
            .attrTween("d", arcTween)
            .remove();

        path.transition()
            .duration(750)
            .attr("stroke", function(d) {
              return _.contains(scope.params.filter, d.data.key) || (d.data.other && _.intersection(scope.params.filter, d.data.otherKeys).length > 0) ? o('selectedStroke') : o('pieStroke');
            })
            .attr("stroke-opacity", function(d) {
              return _.contains(scope.params.filter, d.data.key) || (d.data.other && _.intersection(scope.params.filter, d.data.otherKeys).length > 0) ? o('selectedStrokeOpacity') : o('pieStrokeOpacity');
            })
            .attrTween("d", arcTween)
            .each('end', function(d) {
              this._current.data.selected = _.contains(scope.params.filter, d.data.key) || (d.data.other && _.intersection(scope.params.filter, d.data.otherKeys).length > 0); //overwrite NaN
            });

        legend.transition().duration(300)
            .attr("width", legendDims.width)
            .attr("height", legendDims.height)
            .attr("transform", "translate(" + legendDims.left + "," + legendDims.top + ")");

        keys = keys.data(data1, key);

        var k = keys.enter().append("g")
            .attr("transform", function(d, i) { console.log(d,i); return "translate(" + o('legendPadding') + "," + (o('legendPadding') + (i * (o('legendSpacing') + o('legendSquareSizePx')))) + ")"; });


        k.append("rect")
            .attr("width", o('legendSquareSizePx'))
            .attr("height", o('legendSquareSizePx'))
            .attr("fill", function(d) {
              return color(d.data.key); })
            .attr("fill-opacity", function(d) { return opacity(d.data.key); })
            .attr("class", function(d) {
              return d.data.key.toLowerCase().replace(/[^\-A-Za-z0-9_]/g,"_") + "-color";
            });

        var nonTextWidth = o('legendSquareSizePx') + (2 * o('legendPadding')) + o('legendSpacing') + padding;
        var textWidth = Math.min((legendDims.width - nonTextWidth), (width - nonTextWidth));

        var tc = d3.rgb(o('textColor'));
        var rgba = [tc.r, tc.g, tc.b,o('fillOpacity')];

        var text = k.append("foreignObject")
            .attr("x", o('legendSquareSizePx') + o('legendPadding') + o('legendSpacing'))
            .attr("y", 0)
            .attr('width', textWidth)
            .attr('height', '1.2em')
            .append("xhtml:div")
            .html(function(d, i) { return "<div style='width:" + textWidth + "px; height:1.2em; overflow:hidden; text-overflow:ellipsis;color: rgba(" + rgba.join(',') + ");white-space:nowrap'>" + d.data.key + "</div>";});
//
        keys.transition().duration(300)
            .attr("transform", function(d, i) { console.log(d,i); return "translate(" + o('legendPadding') + "," + (o('legendPadding') + (i * (o('legendSpacing') + o('legendSquareSizePx')))) + ")"; })
        .call(function() {
          //TODO: incorporate into transition better
          $(this[0]).width(textWidth).find('foreignObject').attr('width', textWidth).find('div').width(textWidth).css('color', "rgba(" + rgba.join(',') + ")");
        });


//        k.append("text")
//            .attr("x", o('legendSquareSizePx') + o('legendPadding') + o('legendSpacing'))
//            .attr("y", 9)
//            .attr("dy", ".35em")
//            .text(function(d) {
//              return d.data.key; }).classed('pie-legend', true);

        keys.exit().remove();

//        keys.transition().duration(300);
      }
//      });

        $(document).on('keyup keydown', function(e){scope.shifted = e.shiftKey; return true;} );


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
        var pop = d3.interpolate(this._current.data && this._current.data.selected ? 10 : 0, d.data && d.data.selected ? 10 : 0 );

        this._current = i(0);
//        if ((d.data.other && _.intersection(d.data.otherKeys, scope.params.filter).length > 0) || _.contains(scope.params.filter, d.data.key)) {
          return function(t) {

            return getArcFunc(pop(t))(i(t)); };
        }
//        return function(t) { return arc(i(t)); };
//      }
    }
  };
}]);
