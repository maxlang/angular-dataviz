
angular.module('dataviz.directives', ['ui.map']);
angular.module('dataviz', ['dataviz.directives']);

angular.module('dataviz.directives').directive('aBarchart', [function() {
  return {
    restrict: 'E',
    scope: {
      //TODO: change expected values to something more reasonable
      'data': '=', //expects an array of selected label strings
      //multidata format
      //  [
      //     {"key":"label1",
      //      "total": <db-total>,
      //      "data":[...data...]
      //     },
      //      ...
      //    ]
      'data2': '=',
      //multi filter format
      /* {
       "field": [... filter values ...],
       "field2": [... filter values ...]
       */

      'params' : '=',  // expects an array of {key:<lable>,value:<count>} pairs
      'filter2' : '='
    },
    link: function(scope, element, attributes) {

      var defaultOptions = {
        'tooltips' : false,
        'showValues': true,
        'staggerLabels': true,
        'widthPx' : 586,
        'heightPx' : 286,
        'padding': 2,
        'margins': {top:10, left: 20, bottom:25, right: 15},
        'autoMargin': true,
//        'domain' : [],
        'range' : 'auto',
        'bars' : null,
        'filterSelector' : false,
        'percent':false,
        'multi':false,
        'mainFilter':0,      // used for multi data - main goes on y axis
        'secondaryFilter':1,  // secondary = split
        'asPercent':false,
        'total': 'auto'
      };

      //FROM: http://stackoverflow.com/questions/14605348/title-and-axis-labels
      function measure(text, classname) {
        if(!text || text.length === 0) return {height: 0, width: 0};

        var container = d3.select('body').append('svg').attr('class', classname);
        container.append('text').attr({x: -1000, y: -1000}).text(text);

        var bbox = container.node().getBBox();
        container.remove();

        return {height: bbox.height, width: bbox.width};
      }



      //TODO: better way to handle options, esp option merging
      function getOption(optionName) {
        return _.defaults(scope.params.options, defaultOptions)[optionName];
        //return (scope.params && scope.params.options && !_scope.params.options[optionName]) || defaultOptions[optionName];
      }


      //INIT:
      element.append("<svg></svg>");

      $(document).on('keyup keydown', function(e){scope.shifted = e.shiftKey; return true;} );


      scope.params.filterNum = 0;

      function drawChart(data, data2) {

        // if multi data, we need to group the data appropriately
        if (getOption('multi')) {
          return drawChartMulti(data);
        }



        element.html('');
        element.append("<svg></svg>");


        var width = getOption('widthPx');
        var height = getOption('heightPx');

        element.find("svg").width(width);
        element.find("svg").height(height);

        var margins = getOption('margins');

        var leftMargin = margins.left;

        if (getOption('autoMargin')) {
          leftMargin = leftMargin + _.max(_.map(_.pluck(data, 'key'), function(key) {
            var size = measure(key, "y axis").width;
            return size;
          })) || leftMargin;
          leftMargin = leftMargin === -Infinity ? 0 : leftMargin;
        }

        var w = width - leftMargin - margins.right;
        var h = height - margins.top - margins.bottom;

        var bars = getOption('bars') || data.length;
        var barPadding = getOption('padding');

        var barWidth = (h/bars) - barPadding;

        var y;
        var x;

        var d = _.pluck(data, 'key');
        var r = getOption('range');

//        if(d === 'auto') {
//
//          var xMax = _.max(_.pluck(data, 'key'));
//          var xMin = _.min(_.pluck(data, 'key'));
//          x = d3.scale.linear().domain([xMin, xMax]).range([0, w]);
//        } else {
//          x = d3.scale.linear().domain(d).range([0, w]);
//        }
        var mergedData = null;
        if (data2) {

          mergedData = {};

          _.each(data, function(d) {
            mergedData[d.key] = {key: d.key, values: [d.value]};
          });

          _.each(data2, function(d) {
            if (mergedData[d.key]) {
              mergedData[d.key].values[1] = d.value;
            } else {
              mergedData[d.key] = {key: d.key, values: [null, d.value]};
            }
          });
          d = _.pluck(mergedData, 'key');

        }

        y = d3.scale.ordinal().domain(d).rangeRoundBands([h, 0],0.1,0);

        if (r === 'auto') {
          var xMax;
          if (mergedData) {
            var xMaxObj = _.max(mergedData, function(d) {
              return (d.values[0] || 0) + (d.values[1] || 0);
            });
            xMax = (xMaxObj.values && (xMaxObj.values[0] || 0) + (xMaxObj.values[1] || 0)) || 1;
          } else {
            xMax = data.length > 0 ? data[0].value : 1;
          }


          x = d3.scale.linear().domain([0, xMax]).range([0, w]);
        } else {
          x = d3.scale.linear().domain(r).range([0, w]);
        }


//              scope.brush.x(x);

        var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(4);
        var yAxis = d3.svg.axis().scale(y).orient("left");

        var svg = d3.select(element[0]).select('svg');


        svg.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(" + leftMargin + ", " + (margins.top + h) + ")")
            .call(d3.svg.axis().scale(x).orient("bottom")
                .tickSize(-height, 0, 0)
                .tickFormat("")
        );

        var g = svg.append('g')
            .attr('width', w)
            .attr('height', h)
            .attr('transform', 'translate(' + leftMargin + ', ' + margins.top + ')');

        function setSelectedLabels(filter, labels) {
          var args = [0, filter.length].concat(labels);
          scope.$apply(function() {
            Array.prototype.splice.apply(filter, args);
          });
        }

        function clickFn(d) {
          var filter = scope.params.filterNum ? scope.filter2 : scope.params.filter;
          var selClass = scope.params.filterNum ? 'selected2' : 'selected';

          if( _.contains(filter, d.key) ) {
            if(scope.shifted) {
              setSelectedLabels(filter, _.without(filter, d.key));
            } else {
              g.selectAll('rect.' + selClass).classed(selClass, false);
              setSelectedLabels(filter, []);
            }
            d3.select(this).classed(selClass, false);
          } else {
            if(scope.shifted) {
              filter.push(d.key);
              setSelectedLabels(filter, filter);
            } else {
              g.selectAll('rect.' + selClass).classed(selClass, false);
              g.selectAll('g.' + selClass).classed(selClass, false);
              setSelectedLabels(filter, [d.key]);
            }
            d3.select(this).classed(selClass, true);
          }
        }

        if (data2) {

          var rectHolder = g.selectAll('g').data(_.values(mergedData)).enter().append('g')
              .classed('bar-holder', true)
              .attr("transform", function(d) { return "translate(" + 0 + ", " + 0 + ")";})
              .attr('width', function(d, i) { return  (d.values[0] ? x(d.values[0]) : 0) + (d.values[1] ? x(d.values[1]) : 0);})
              .attr('height', Math.abs(y.rangeBand()))
              .classed('selected', function(d, i) {
                return _.contains(scope.params.filter, d.key);
              })
              .classed('selected2', function(d, i) {
                return _.contains(scope.filter2, d.key);
              })
              .on('click', function(d, i) {
                clickFn.call(this, d);
              });

          rectHolder.selectAll('rect.d1').data(function(d) { console.log(d); return [d];}).enter().append('rect')
              .classed('bar d1', true)
              .attr('y', function(d, i) {
                return y(d.key);
              })
              .attr('x', 0)
              .attr('width', function(d, i) { return  (d.values[0] ? x(d.values[0]) : 0);})
              .attr('height', Math.abs(y.rangeBand()))
              .attr('stroke-width', getOption('padding')+'px');
          rectHolder.selectAll('rect.d2').data(function(d) { return [d];}).enter().append('rect')
              .classed('bar d2', true)
              .attr('y', function(d, i) { return y(d.key);})
              .attr('x', function(d) { return (d.values[0] ? x(d.values[0]) : 0);})
              .attr('width', function(d, i) { return  (d.values[1] ? x(d.values[1]) : 0);})
              .attr('height', Math.abs(y.rangeBand()))
              .attr('stroke-width', getOption('padding')+'px');

        } else {

          g.selectAll('rect').data(data).enter().append('rect')
              .classed('bar', true)
              .attr('y', function(d, i) { return y(d.key);})
              .attr('x', 0)
              .attr('width', function(d, i) { return  x(d.value);})
              .attr('height', Math.abs(y.rangeBand()))
              .attr('stroke-width', getOption('padding')+'px')
              .classed('selected', function(d, i) {
                return _.contains(scope.params.filter, d.key);
              })
              .on('click', function(d, i) {
                clickFn.call(this, d);
              });

        }

        if (scope.filter2 && getOption('filterSelector')) {
          g.selectAll('rect.compare').data([0,1]).enter().append('rect')
              .attr('x', function(d) {return w - (12 * d) + 2;})
              .attr('y', -8)
              .attr('width', 10)
              .attr('height', 10)
              .attr('stroke-width', 2)
              .classed('compare', true)
              .classed('d1', function(d) {return d;})
              .classed('d2', function(d) {return !d;})
              .on('click', function(d) {
                scope.params.filterNum = d;
              });
        }


        var xaxis =   svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(" + leftMargin + ", " + (h + margins.top) + ")")
            .call(xAxis);

        var yaxis =   svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + leftMargin + ", " + (margins.top) + ")")
            .call(yAxis);



//        var brush = g.append("g")
//            .attr("class", "x brush")
//            .call(scope.brush)
//            .selectAll("rect")
//            .attr("y", -6)
//            .attr("height", h+8);

      }

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
                  legendSpacing + _.max(_(slices).map(function(v) {return measure(v, element[0], 'legend-text').width;}).value()),
              minLegendWidth), maxLegendWidth),
          height: (slices.length * legendSquareSizePx) +
              (2 * legendPadding) +
              ((slices.length - 1) * legendSpacing)
        };
      }


      function drawChartMulti(data) {
//        var mapObject = {};
//        _.each(data.data, function(filteredData, label) {
//          _.each(filteredData, function(d) {
//            mapObject[d.key] = mapObject[d.key] || {key: d.key, data:{}};
//            mapObject[d.key].data[label] = d.value;
//          });
//        });
//
//        _.each(data.total, function(d) {
//          if (mapObject[d.key]) {
//            mapObject[d.key].total = d.value;
//          }
//        });

        var augmentedData = _.map(data, function(d) {
          var curTotal = 0;
          _.each(d.data, function(value) {
            curTotal += value.value;
          });
          return {
            key: d.key,
            total: d.total,
            data: _.cloneDeep(d.data),
            computedTotal: curTotal
          };
        });

        //figure out which max value to use
        var maxKey = 'total';
        var maxes = {
          total: _.max(augmentedData, 'total').total,
          computedTotal: _.max(augmentedData, 'computedTotal').computedTotal

        };
        // if the largest given total is more than 3/4 the largest computed total, use computed totals
        // or if the largest given total is smaller than the largest computed total, use the computed total
        if ((maxes.total * (3/4)) > maxes.computedTotal || maxes.computedTotal > maxes.total) {
          maxKey = 'computedTotal';
        }

        //convert to percents if specified
        if (getOption('asPercent')) {
          maxes.percent = 1;
          _.each(augmentedData, function(d) {
            d.percent = 1;
            var max = d[maxKey];
            _.each(d.data, function(v,l) {
              v.value = v.value/max;
            });
          });
          maxKey = 'percent';
        }


        var max = maxes[maxKey];

        var compare = function(a,b) {
          return a > b ? 1 : (a===b ? 0 : -1);
        };

        //sort the data
        augmentedData.sort(function(a, b) {
          var ak = parseFloat(a.key);
          var bk = parseFloat(b.key);

          if (!_.isNaN(ak) && !_.isNaN(b.key)) {
            return compare(ak, bk);
          }
          if (a[maxKey] === b[maxKey]) {
            if (_.max(a.data,'value').value === _.max(b.data, 'value').value) {
              return -compare(a.key,b.key);
            } else {
              return compare(_.max(a.data,'value').value, _.max(b.data,'value').value);
            }
          }
          return compare(a[maxKey],b[maxKey]);
        });



        //figure out the stacking order
        // sort largest to smallest using the largest entry (last in the array)
        var first = augmentedData[augmentedData.length - 1].data;
        var sortedLabels = _.pluck(_.sortBy(first, 'value'), 'key').reverse();
        _.each(augmentedData, function(d) {
          _.each(_.pluck(d.data,'key'), function(k) {
            if (!_.contains(sortedLabels, k)) {
              sortedLabels.push(k);
            }
          });
        });

        // we only want to take the top 6 - TODO: support more/better alg for selecting top
        sortedLabels = _.take(sortedLabels, 6);


        var sortedPriority = _.invert(sortedLabels);

        var legendDims = calcLegendDims(sortedLabels);


        element.html('');
        element.append("<svg></svg>");


        var width = getOption('widthPx');
        var height = getOption('heightPx');

        element.find("svg").width(width);
        element.find("svg").height(height);

        var margins = getOption('margins');

        var leftMargin = margins.left;
        var rightMargin = margins.right;

        if (getOption('autoMargin')) {
          leftMargin = leftMargin + _.max(_.map(_.pluck(augmentedData, 'key'), function(key) {
            var size = measure(key, "y axis").width;
            return size;
          })) || leftMargin;
          leftMargin = leftMargin === -Infinity ? 0 : leftMargin;

          rightMargin = rightMargin || 0;
          rightMargin += legendDims.width;
        }

        var w = width - leftMargin - rightMargin;
        var h = height - margins.top - margins.bottom;

        var bars = getOption('bars') || augmentedData.length;
        var barPadding = getOption('padding');

        var barWidth = (h/bars) - barPadding;

        var y;
        var x;

        var d = _.pluck(augmentedData, 'key');
        var r = getOption('range');

        y = d3.scale.ordinal().domain(d).rangeRoundBands([h, 0],0.1,0);

        if (r === 'auto') {
          var xMax = augmentedData.length > 0 ? max : 1;
          x = d3.scale.linear().domain([0, xMax]).range([0, w]);
        } else {
          x = d3.scale.linear().domain(r).range([0, w]);
        }


//              scope.brush.x(x);



        var xAxis = d3.svg.axis().scale(x);
        xAxis.orient("bottom").ticks(4);

        if (getOption('asPercent')) {
          xAxis.tickFormat(function(v) {
            console.log(v);
            return v*100 + "%";
          });
        }

        var yAxis = d3.svg.axis().scale(y).orient("left");

        var svg = d3.select(element[0]).select('svg');


        svg.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(" + leftMargin + ", " + (margins.top + h) + ")")
            .call(d3.svg.axis().scale(x).orient("bottom")
                .tickSize(-height, 0, 0)
                .tickFormat("")
        );

        var g = svg.append('g')
            .attr('width', w)
            .attr('height', h)
            .attr('transform', 'translate(' + leftMargin + ', ' + margins.top + ')');

        function setSelectedLabels(filter, labels) {
          var args = [0, filter.length].concat(labels);
          scope.$apply(function() {
            Array.prototype.splice.apply(filter, args);
          });
        }

        function clickFn(d) {
          var filter = scope.params.filter;
          var selClass = 'selected';

          if( _.contains(filter, d.key)) {
            if(scope.shifted) {
              setSelectedLabels(filter, _.without(filter, d.key));
            } else {
              g.selectAll('g.' + selClass).classed(selClass, false);
              setSelectedLabels(filter, []);
            }
            d3.select(this).classed(selClass, false);
          } else {
            if(scope.shifted) {
              filter.push(d.key);
              setSelectedLabels(filter, filter);
            } else {
              g.selectAll('g.' + selClass).classed(selClass, false);
              setSelectedLabels(filter, [d.key]);
            }
            d3.select(this).classed(selClass, true);
          }
        }

//        if (data2) {
//
//          var rectHolder = g.selectAll('g').data(_.values(mergedData)).enter().append('g')
//              .classed('bar-holder', true)
//              .attr("transform", function(d) { return "translate(" + 0 + ", " + 0 + ")";})
//              .attr('width', function(d, i) { return  (d.values[0] ? x(d.values[0]) : 0) + (d.values[1] ? x(d.values[1]) : 0);})
//              .attr('height', Math.abs(y.rangeBand()))
//              .classed('selected', function(d, i) {
//                return _.contains(scope.params.filter, d.key);
//              })
//              .classed('selected2', function(d, i) {
//                return _.contains(scope.filter2, d.key);
//              })
//              .on('click', function(d, i) {
//                clickFn.call(this, d);
//              });
//
//          rectHolder.selectAll('rect.d1').data(function(d) { console.log(d); return [d];}).enter().append('rect')
//              .classed('bar d1', true)
//              .attr('y', function(d, i) {
//                return y(d.key);
//              })
//              .attr('x', 0)
//              .attr('width', function(d, i) { return  (d.values[0] ? x(d.values[0]) : 0);})
//              .attr('height', Math.abs(y.rangeBand()))
//              .attr('stroke-width', getOption('padding')+'px');
//          rectHolder.selectAll('rect.d2').data(function(d) { return [d];}).enter().append('rect')
//              .classed('bar d2', true)
//              .attr('y', function(d, i) { return y(d.key);})
//              .attr('x', function(d) { return (d.values[0] ? x(d.values[0]) : 0);})
//              .attr('width', function(d, i) { return  (d.values[1] ? x(d.values[1]) : 0);})
//              .attr('height', Math.abs(y.rangeBand()))
//              .attr('stroke-width', getOption('padding')+'px');
//
//        } else {

        var barHolders = g.selectAll('g.bar').data(augmentedData).enter().append('g')
            .classed('bar', true)
            .attr('width', function(d) { return x(d[maxKey]);})
            .attr('height', Math.abs(y.rangeBand()))
            .classed('selected', function(d, i) {
              return _.contains(scope.params.filter, d.key);
            })
            .on('click', function(d, i) {
              clickFn.call(this, d);
            });


        barHolders.selectAll('rect')
            .data(function(d) {
//              console.log(d);
              return _.map(d.data, function(obj) {
                obj = obj;
                obj.parent = d;
                return obj;
              }).sort(function(a, b) {
                return compare(sortedPriority[a.key], sortedPriority[b.key]);
              });
            })
            .enter().append('rect')
            .attr('class', function(d, i) { return "bar-" + i;})
            .classed('bar', true)
            .attr('y', function(d, i) { return y(d.parent.key);})
            .attr('x', function(d, i) {
              if (i === 0 || !(d.key in sortedPriority)) {
                return 0;
              }
              var sum = 0;
              _.times(sortedPriority[d.key],function(idx) {
                var segment = _.find(d.parent.data, {key:sortedLabels[idx]});
                if (segment && segment.value) {
                  sum += x(segment.value);
                }
              });
              return sum;
            })
            .attr('width', function(d, i) {
              if (d.key in sortedPriority) {
                return  x(d.value);
              }
              return 0;
            })
            .attr('height', Math.abs(y.rangeBand()))
            .attr('stroke-width', getOption('padding')+'px');


//        if (scope.filter2 && getOption('filterSelector')) {
//          g.selectAll('rect.compare').data([0,1]).enter().append('rect')
//              .attr('x', function(d) {return w - (12 * d) + 2;})
//              .attr('y', -8)
//              .attr('width', 10)
//              .attr('height', 10)
//              .attr('stroke-width', 2)
//              .classed('compare', true)
//              .classed('d1', function(d) {return d;})
//              .classed('d2', function(d) {return !d;})
//              .on('click', function(d) {
//                scope.params.filterNum = d;
//              });
//        }


        var xaxis =   svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(" + leftMargin + ", " + (h + margins.top) + ")")
            .call(xAxis);

        var yaxis =   svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + leftMargin + ", " + (margins.top) + ")")
            .call(yAxis);

        legendDims.top = margins.top;
        legendDims.left = leftMargin + w;

        var legend = svg.append('g')
            .attr("class", "legend")
            .attr("width", legendDims.width)
            .attr("height", legendDims.height)
            .attr("transform", "translate(" + legendDims.left + "," + legendDims.top + ")");

        var keys = legend.selectAll("g");


        keys = keys.data(sortedLabels);

        var k = keys.enter().append("g")
            .attr("transform", function(d, i) { /*console.log(d,i);*/ return "translate(" + legendPaddingLeft + "," + (legendPadding + (i * (legendSpacing + legendSquareSizePx))) + ")"; });

        k.append("rect")
            .attr("width", legendSquareSizePx)
            .attr("height", legendSquareSizePx)
            .attr("class", function(d, i) { return "bar-" + i; } );

        var nonTextWidth = legendSquareSizePx + (legendPadding + legendPaddingLeft) + legendSpacing;
        var textWidth = Math.min((legendDims.width - nonTextWidth), (width - nonTextWidth));

        var tc = d3.rgb(getOption('textColor'));
        var rgba = [tc.r, tc.g, tc.b, getOption('fillOpacity')];

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


      }

      scope.$watch('data',function(counts) {
        if(counts!==undefined && counts!==null) {
          drawChart(counts, scope.data2);
        }
      }, true);

      scope.$watch('data2',function() {
        if(scope.data!==undefined && scope.data!==null) {
          drawChart(scope.data, scope.data2);
        }
      }, true);

//            scope.$watch('params.filter', function(f) {
//              if (f) {
//                console.log('setting brush');
//                setBrush(f[0]);
//              }
//            }, true);

      scope.$watch('params.options', function() {
        if (scope.data) {
          drawChart(scope.data, scope.data2);
        }
      }, true);

      scope.$watch('params.filter', function() {
        if (scope.data) {
          drawChart(scope.data, scope.data2);
        }
      }, true);

      scope.$watch('filter2', function() {
        if (scope.data) {
          drawChart(scope.data, scope.data2);
        }
      }, true);

    }
  };
}]);

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

      var width, height, margins, range, max, leftMargin, w, h, bars, barPadding, barWidth, svg, g, x, y, d, xAxis, yAxis, xAxisG, yAxisG, rects, brush, brushRect;

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
        g.transition().duration()
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
            .attr('height', 0);
//            .transition().delay(2000).duration(3000)
//            .attr('y', function(d, i) { return y(d.value); })
//            .attr('height', function(d, i) { return h - y(d.value); });


        rects.exit().transition().duration(300).attr('height', 0).attr('y', h).remove();

        rects.transition().duration(300)

            .attr('x', rectX)
            .attr('y', function(d, i) { return y(d.value); })
            .attr('width', barWidth)
            .attr('height', function(d, i) { return h - y(d.value); })
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

        //calc totals




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

angular.module('dataviz.directives').directive('aNumber', ['$timeout', 'VizUtils', function($timeout, VizUtils) {
  return {
    restrict: 'E',
    scope: {
      data: '=',
      params: '='
    },
    link: function(scope, element) {
//      angular.module('demon.number', []);
//
//      angular.module('demon.number').directive('demonNumberViz', ['$timeout', function($timeout) {
//        return {
//          restrict: 'E',
//          scope: {
//            data: '=',
//            params: '='
//          },
//          template: '<div ng-if=\'params.options.pie=="simple" || params.options.units!="%"\' class="value-holder">' +
//              '<div ng-if="params.options.units == \'$\'" class="num-viz-dollars">$</div>' +
//              '<p class="num-viz-val" ng-bind="data.value"></p>' +
//              '<div ng-if="params.options.units == \'%\'" class="num-viz-percent">%</div>' +
//              '</div>' +
//
//              '<div ng-show=\'params.options.pie=="pie" && params.options.units=="%"\' class="value-holder">' +
//
//              '<div class="chart" data-percent="0">{{ data.value }}%</div>' +
//              '</div>',
//          link: function(scope, element) {
//
//            var originalSize = scope.params && scope.params.options && Math.min(scope.params.options.heightPx, scope.params.options.widthPx) || 175;
//
//
//            $(element[0]).find('.chart').easyPieChart({
//              size:scope.params && scope.params.options && scope.params.options.widthPx || 175,
//              barColor:'#2161A4',
//              animate:500
//            });
//
//            scope.$watch('data.origVal', function(val) {
//              if (_.isNumber(val)) {
//                if ($(element[0]).find('.chart').data('easyPieChart')) {
//                  $(element[0]).find('.chart').data('easyPieChart').update(val * 100);
//                }
//              }
//            }, true);
//
//
//
//            function adjustZoom () {
//              var newSize = scope.params && scope.params.options && Math.min(scope.params.options.heightPx, scope.params.options.widthPx) || 175;
//              var ratio = newSize/originalSize;
//              $(element[0]).find('.chart').css('zoom', ratio);
//            }
//
//            scope.$watch('params.options.heightPx', adjustZoom);
//            scope.$watch('params.options.widthPx', adjustZoom);
//          }
//        };
//      }]);
      var o = VizUtils.genOptionGetter(scope,{
        'widthPx' : 175,
        'heightPx' : 175,
        'margins' : {top: 10, left: 10, right: 10, bottom: 10},
        'pie' : "simple",
        'units': "",
        'fontSize': null,
        'bottomRight': false
      });
      var initialized = false;

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

      var width, height, margins, w, h, svg, g, text, format;

      var calcInfo = function(data) {
        width = o('widthPx');
        height = o('heightPx');
        margins = o('margins');

        w = width - margins.left - margins.right;
        h = height - margins.top - margins.bottom;
        var v = parseFloat(data.value);
        var prefix = d3.formatPrefix(v);
        var scaledValue = prefix.scale(v);
        //var hasDecimal = Math.floor(scaledValue) !== scaledValue;
        var digits = (scaledValue + '').replace(/-\./g,'').length;
        var p = Math.min( digits, 3);
        if (o('units') !== '%') {
          format = d3.format((o('units')==='$' ? '$' : '') +  '.' + p + 's');
        } else {
          p = Math.min( digits, 5);
          p = Math.max(0,p - 2);
          format = d3.format('.' + (p - 2) + '%');
        }

      };

      function resizeText(d, i) {
        var e;
        if (_.isArray(this) && this.size() > 0) {
          e = this[0][0];
        } else if (!_.isArray(this)) {
          e = this;
        } else {
          return;
        }
        var elt = $(e);
        var times = 100;
        var fs = parseInt(window.getComputedStyle(e, null)['font-size'], 10);
          if (!o('fontSize')) {

            if (parseInt(elt.width(), 10) > w || parseInt(elt.height(), 10) > h) {
            while ((parseInt(elt.width(), 10) > w || parseInt(elt.height(), 10) > h) && fs > 30 && times > 0) {
              fs = parseInt(window.getComputedStyle(e, null)['font-size'], 10);
              times -= 1;
              elt.css('font-size', fs - 1);
            }
          } else {
            while ((parseInt(elt.width(), 10) < w && parseInt(elt.height(), 10) < h) && fs < 400 && times > 0) {
              fs = parseInt(window.getComputedStyle(e, null)['font-size'], 10);
              times -= 1;
              elt.css('font-size', fs + 1);
            }
          }
        }
        elt.attr('dy', '1em');
        elt.attr('y', o('bottomRight') ? (h - elt.height()) : ((h/2) - (elt.height()/2)));
      }

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
            .attr('transform', 'translate(' + margins.left + ', ' + margins.top + ')');

        text = g.selectAll('text');

        initialized = true;
      }

      function change() {
        calcInfo(scope.data);

        svg.transition().duration(300)
            .attr("width", width)
            .attr("height", height)
            .attr("fill", o('textColor'))
            .attr("fill-opacity",o('fillOpacity'))
            .style('font-weight', 'bold')
            .style("background-color", o('bgColor'));
        g.transition().duration(300)
            .attr('width', w)
            .attr('height', h)
            .attr('transform', 'translate(' + margins.left + ', ' + margins.top + ')');

        text = text.data([scope.data.value], key);

        text.enter().append('text')
            .classed('value', true)
            .attr('fill', o('textColor'))
            .attr('fill-opacity', o('fillOpacity'))
            .attr('x', o('bottomRight') ? w : w/2)
            .style('font-size',o('font-size') || 250)
            .attr('text-anchor', o('bottomRight') ? 'end' : 'middle')
            .each(function(d){
              this.__lastData = d;
            })
            .text(function(d,i) {
              return format(d);
            }).attr('dy', '1em')
            .call(resizeText);



        text.exit().transition().duration(300).remove();

        //tween copied from: http://phrogz.net/svg/d3-circles-with-html-labels.html

        text.transition().duration(300)
            .attr('fill', o('textColor'))
            .attr('fill-opacity', o('fillOpacity'))
            .attr('x', o('bottomRight') ? w : w/2)
            .tween("text", function(d) {
              var last = this.__lastData;
              var tI = d3.interpolateNumber(parseFloat(last) || 0, parseFloat(d) || 0);
              return function(t){
                this.textContent = format(tI(t));
              };
            })
            .each('end', function(d){
              this.__lastData = d;
                d3.select(this).style('font-size', o('fontSize'));
                d3.select(this).call(resizeText);
            });

      }

      function key(d, i) {
        return i;
      }

    }
  };
}]);

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
            .attr("fill-opacity", function(d) { return opacity(d.data.key); });

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

angular.module('dataviz.directives').service('VizUtils',function() {
  this.measure = function measure(text, elt, classname) {
    if(!text || text.length === 0) {
      return {height: 0, width: 0};
    }

    var container = d3.select(elt).append('svg').attr('class', classname);
    container.append('text').attr({x: -1000, y: -1000}).text(text);

    var bbox = container.node().getBBox();
    container.remove();

    return {height: bbox.height, width: bbox.width};
  };

  this.genOptionGetter = function (scope, defaultOptions) {
    return function(optionName) {
      return _.defaults(scope.params.options, defaultOptions)[optionName];
    };
  };

});

angular.module('dataviz.directives').directive('barchart', [function() {
  return {
    restrict: 'E',
    scope: {
      //TODO: change expected values to something more reasonable
      'data': '=', //expects an array of selected label strings
      'data2': '=',
      'params' : '=',  // expects an array of {key:<lable>,value:<count>} pairs
      'filter2' : '='
    },
    link: function(scope, element, attributes) {

      var defaultOptions = {
        'tooltips' : false,
        'showValues': true,
        'staggerLabels': true,
        'widthPx' : 586,
        'heightPx' : 286,
        'padding': 2,
        'margins': {top:10, left: 20, bottom:20, right: 15},
        'autoMargin': true,
//        'domain' : [],
        'range' : 'auto',
        'bars' : null,
         'filterSelector' : false
      };

      //FROM: http://stackoverflow.com/questions/14605348/title-and-axis-labels
      function measure(text, classname) {
        if(!text || text.length === 0) return {height: 0, width: 0};

        var container = d3.select('body').append('svg').attr('class', classname);
        container.append('text').attr({x: -1000, y: -1000}).text(text);

        var bbox = container.node().getBBox();
        container.remove();

        return {height: bbox.height, width: bbox.width};
      }



      //TODO: better way to handle options, esp option merging
      function getOption(optionName) {
        return _.defaults(scope.params.options, defaultOptions)[optionName];
        //return (scope.params && scope.params.options && !_scope.params.options[optionName]) || defaultOptions[optionName];
      }


      //INIT:
      element.append("<svg></svg>");

      $(document).on('keyup keydown', function(e){scope.shifted = e.shiftKey; return true;} );


      scope.params.filterNum = 0;

      function drawChart(data, data2) {

        element.html('');
        element.append("<svg></svg>");


        var width = getOption('widthPx');
        var height = getOption('heightPx');

        element.find("svg").width(width);
        element.find("svg").height(height);

        var margins = getOption('margins');

        var leftMargin = margins.left;

        if (getOption('autoMargin')) {
          leftMargin = leftMargin + _.max(_.map(_.pluck(data, 'key'), function(key) {
            var size = measure(key, "y axis").width;
            return size;
          })) || leftMargin;
          leftMargin = leftMargin === -Infinity ? 0 : leftMargin;
        }

        var w = width - leftMargin - margins.right;
        var h = height - margins.top - margins.bottom;

        var bars = getOption('bars') || data.length;
        var barPadding = getOption('padding');

        var barWidth = (h/bars) - barPadding;

        var y;
        var x;

        var d = _.pluck(data, 'key');
        var r = getOption('range');

//        if(d === 'auto') {
//
//          var xMax = _.max(_.pluck(data, 'key'));
//          var xMin = _.min(_.pluck(data, 'key'));
//          x = d3.scale.linear().domain([xMin, xMax]).range([0, w]);
//        } else {
//          x = d3.scale.linear().domain(d).range([0, w]);
//        }
        var mergedData = null;
        if (data2) {

          mergedData = {};

          _.each(data, function(d) {
            mergedData[d.key] = {key: d.key, values: [d.value]};
          });

          _.each(data2, function(d) {
            if (mergedData[d.key]) {
              mergedData[d.key].values[1] = d.value;
            } else {
              mergedData[d.key] = {key: d.key, values: [null, d.value]};
            }
          });
          d = _.pluck(mergedData, 'key');

        }

        y = d3.scale.ordinal().domain(d).rangeRoundBands([h, 0],0.1,0);

        if (r === 'auto') {
          var xMax;
          if (mergedData) {
            var xMaxObj = _.max(mergedData, function(d) {
              return (d.values[0] || 0) + (d.values[1] || 0);
            });
            xMax = (xMaxObj.values && (xMaxObj.values[0] || 0) + (xMaxObj.values[1] || 0)) || 1;
          } else {
            xMax = data.length > 0 ? data[0].value : 1;
          }


          x = d3.scale.linear().domain([0, xMax]).range([0, w]);
        } else {
          x = d3.scale.linear().domain(r).range([0, w]);
        }


//              scope.brush.x(x);

        var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(4);
        var yAxis = d3.svg.axis().scale(y).orient("left");

        var svg = d3.select(element[0]).select('svg');


        svg.append("g")
            .attr("class", "grid")
            .attr("transform", "translate(" + leftMargin + ", " + (margins.top + h) + ")")
            .call(d3.svg.axis().scale(x).orient("bottom")
                .tickSize(-height, 0, 0)
                .tickFormat("")
            );

        var g = svg.append('g')
            .attr('width', w)
            .attr('height', h)
            .attr('transform', 'translate(' + leftMargin + ', ' + margins.top + ')');

        function setSelectedLabels(filter, labels) {
          var args = [0, filter.length].concat(labels);
          scope.$apply(function() {
            Array.prototype.splice.apply(filter, args);
          });
        }

        function clickFn(d) {
          var filter = scope.params.filterNum ? scope.filter2 : scope.params.filter;
          var selClass = scope.params.filterNum ? 'selected2' : 'selected';

          if( _.contains(filter, d.key) ) {
            if(scope.shifted) {
              setSelectedLabels(filter, _.without(filter, d.key));
            } else {
              g.selectAll('rect.' + selClass).classed(selClass, false);
              setSelectedLabels(filter, []);
            }
            d3.select(this).classed(selClass, false);
          } else {
            if(scope.shifted) {
              filter.push(d.key);
              setSelectedLabels(filter, filter);
            } else {
              g.selectAll('rect.' + selClass).classed(selClass, false);
              g.selectAll('g.' + selClass).classed(selClass, false);
              setSelectedLabels(filter, [d.key]);
            }
            d3.select(this).classed(selClass, true);
          }
        }

        if (data2) {

         var rectHolder = g.selectAll('g').data(_.values(mergedData)).enter().append('g')
            .classed('bar-holder', true)
            .attr("transform", function(d) { return "translate(" + 0 + ", " + 0 + ")";})
            .attr('width', function(d, i) { return  (d.values[0] ? x(d.values[0]) : 0) + (d.values[1] ? x(d.values[1]) : 0);})
            .attr('height', Math.abs(y.rangeBand()))
            .classed('selected', function(d, i) {
              return _.contains(scope.params.filter, d.key);
            })
           .classed('selected2', function(d, i) {
             return _.contains(scope.filter2, d.key);
           })
            .on('click', function(d, i) {
              clickFn.call(this, d);
            });

          rectHolder.selectAll('rect.d1').data(function(d) { console.log(d); return [d];}).enter().append('rect')
              .classed('bar d1', true)
              .attr('y', function(d, i) {
                return y(d.key);
              })
              .attr('x', 0)
              .attr('width', function(d, i) { return  (d.values[0] ? x(d.values[0]) : 0);})
              .attr('height', Math.abs(y.rangeBand()))
              .attr('stroke-width', getOption('padding')+'px');
          rectHolder.selectAll('rect.d2').data(function(d) { return [d];}).enter().append('rect')
              .classed('bar d2', true)
              .attr('y', function(d, i) { return y(d.key);})
              .attr('x', function(d) { return (d.values[0] ? x(d.values[0]) : 0);})
              .attr('width', function(d, i) { return  (d.values[1] ? x(d.values[1]) : 0);})
              .attr('height', Math.abs(y.rangeBand()))
              .attr('stroke-width', getOption('padding')+'px');

        } else {

        g.selectAll('rect').data(data).enter().append('rect')
            .classed('bar', true)
            .attr('y', function(d, i) { return y(d.key);})
            .attr('x', 0)
            .attr('width', function(d, i) { return  x(d.value);})
            .attr('height', Math.abs(y.rangeBand()))
            .attr('stroke-width', getOption('padding')+'px')
            .classed('selected', function(d, i) {
              return _.contains(scope.params.filter, d.key);
            })
            .on('click', function(d, i) {
              clickFn.call(this, d);
            });

        }

        if (scope.filter2 && getOption('filterSelector')) {
          g.selectAll('rect.compare').data([0,1]).enter().append('rect')
              .attr('x', function(d) {return w - (12 * d) + 2;})
              .attr('y', -8)
              .attr('width', 10)
              .attr('height', 10)
              .attr('stroke-width', 2)
              .classed('compare', true)
              .classed('d1', function(d) {return d;})
              .classed('d2', function(d) {return !d;})
              .on('click', function(d) {
                scope.params.filterNum = d;
              });
        }


        var xaxis =   svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(" + leftMargin + ", " + (h + margins.top) + ")")
            .call(xAxis);

        var yaxis =   svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + leftMargin + ", " + (margins.top) + ")")
            .call(yAxis);



//        var brush = g.append("g")
//            .attr("class", "x brush")
//            .call(scope.brush)
//            .selectAll("rect")
//            .attr("y", -6)
//            .attr("height", h+8);

      }

      scope.$watch('data',function(counts) {
        if(counts!==undefined && counts!==null) {
          drawChart(counts, scope.data2);
        }
      }, true);

      scope.$watch('data2',function() {
        if(scope.data!==undefined && scope.data!==null) {
          drawChart(scope.data, scope.data2);
        }
      }, true);

//            scope.$watch('params.filter', function(f) {
//              if (f) {
//                console.log('setting brush');
//                setBrush(f[0]);
//              }
//            }, true);

      scope.$watch('params.options', function() {
        if (scope.data) {
          drawChart(scope.data, scope.data2);
        }
      }, true);

      scope.$watch('params.filter', function() {
        if (scope.data) {
          drawChart(scope.data, scope.data2);
        }
      }, true);

      scope.$watch('filter2', function() {
        if (scope.data) {
          drawChart(scope.data, scope.data2);
        }
      }, true);

    }
  };
}]);

(function() {
  'use strict';

  //TODO: add prefixes to directives
  //TODO: fix references to flexbox in css

  function truncate(str, n) {
    return str.length < n ? str : (str.substr(0, n) + '...');
  }

  function isNullOrUndefined(x) {
    return _.isNull(x) || _.isUndefined(x);
  }

  function translate(x, y) {
    return 'translate(' + x + ', ' + y + ')';
  }

  function overlapCounts(start, end, weekCounts, cols) {
    var h = {};
    var k = {};

    function wc(x) {
      return weekCounts[x] || 0;
    }

    for (var i = end; i > start; --i) {
      h[i] = (k[i] || 0) + wc(i);
      //console.log('i', i, 'k[i]', k[i], 'wc(i)', wc(i), 'h[i]', h[i]);

      if (wc(i) > 0) {
        for (var j = i - 1; j > i - cols; --j) {
          k[j] = h[i];
        }
      }
    }

    return h;
  }

//   function overlapCountsFwd(start, end, weekCounts) {
//     var N = 3;
//     var h = {};
//     var k = {};

//     function wc(x) {
//       return weekCounts[x] || 0;
//     }

//     k[start] = 0;
//     _.range(start, end).forEach(function(i) {
//       h[i] = (k[i] || 0) + wc(i);
//       console.log('i', i, 'k[i]', k[i], 'wc(i)', wc(i), 'h[i]', h[i]);

//       if (wc(i) > 0) {
//       _.range(i + 1, i + N).forEach(function(j) {
//         //k[j] = (k[j] || 0) + wc(i);
//         k[j] = h[i]; //+ wc(i);
//       });
//       }
//     });

//     return h;
//   }

  angular.module('dataviz.directives').directive('blockCalendar', [function() {
    return {
      restrict: 'E',
      scope: {
        //TODO: DOCUMENT BETTER
        data: '=',   // expects an array of objects with a key and a value
        params: '='   // a parameters object with the current filters, options, and highlighted data
      },
      link: function(scope, element) {
        scope.id = element.attr('id') || _.uniqueId(element.prop("tagName") + "-");

        var defaultOptions = {
          cellHeightPx: 13,
          cellWidthPx: 13,
          cellBorderPx: 2,
          widthPx: 586, //TODO:
          heightPx: 106,
          endTime: Date.now(),
          numAnnotationsShownPerGroup: 3,
          annotationColumns: 8
        };

        //TODO: better way to handle options, esp option merging
        function getOption(optionName) {
          return (scope.params && scope.params.options && scope.params.options[optionName]) ||
            defaultOptions[optionName];
        }

        var filter = (scope.params && scope.params.filter) ? scope.params.filter : [];

        //TODO: standardize how filters are changed (don't create a new object) - use extend?
        function setSelectedRanges(ranges) {
          scope.$apply(function () {
            var args = [0, filter.length].concat(ranges);
            Array.prototype.splice.apply(filter, args);
          });
        }

        //TODO: change styles to avoid this

        //INIT
        d3.select(element[0]).classed("chart", true);

        scope.svg = d3.select(element[0]).append("svg:svg").attr("width", "100%")
          .attr("height", "100%");

        //TODO: handle years
        //TODO: multiple rows if height is large enough
        //TODO: visually groupe months, years, and add a nicer border

        function drawChart(data) {
          //TODO: take into account height
          //calculate columns based on width
          var width = getOption('widthPx');
          var height = getOption('heightPx');

          //TODO: options
          var yAxisWidth = 23;
          var xAxisHeight = 6;

          var debugMode = false;

          // Annotation settings.
          var WEEK_GROUPING = 1;
          var ANNOTATION_TEXT_HEIGHT = 13;
          var ANNOTATION_LINES = 2;
          var ANNOTATION_Y_SPACING = 9;
          var ANNOTATION_COLS = getOption('annotationColumns');
          var MAX_TITLE_LEN = getOption('maxTitleLength') || Math.floor(ANNOTATION_COLS * 1.8);

          var chartWidth = width - yAxisWidth;
          var chartHeight = height - xAxisHeight;

          var cellHeight = getOption('cellHeightPx');
          var cellWidth = getOption('cellWidthPx');
          var border = getOption('cellBorderPx');
          var totalCellWidth = cellWidth + border;
          var totalCellHeight = cellHeight + border;

          var columns = Math.floor(chartWidth/(totalCellWidth));

          var numAnnotationsShownPerGroup = getOption('numAnnotationsShownPerGroup');
          var endTime = getOption('endTime');

          var annotations = (scope.params && scope.params.annotations) ? scope.params.annotations : [];

          // current week counts as an extra column
          var start = moment(endTime).subtract('weeks',columns - 1).startOf('week');
          scope.start = start;
          var end = moment(endTime).startOf('day');
          // current day counts as an extra day, don't count partial days
          var days = end.diff(start,'days', false) + 1;

          var maxCount = _.max(data, function(d) {return d.value;}).value;

          function weeksFromStart(date) {
            return moment(date).diff(start, 'weeks') + 2;
          }

          var annotationsByWeek = _(annotations)
                .filter(function(a) {
                  var ws = weeksFromStart(a.date);
                  var we = moment(a.date).diff(end, 'weeks');
                  // NOTE/TODO (em) first 2 weeks after 'start' are not rendered (?)
                  return ws >= 2 && we <= 0;
                })
                .groupBy(function(a) {
                  return Math.floor(weeksFromStart(a.date) / WEEK_GROUPING);
                })
                .map(function(anns, week) {
                  return {
                    week: parseInt(week, 10), // TODO why does this turn into string?
                    annotations: _(anns).sortBy('date').take(numAnnotationsShownPerGroup).value()
                  };
                })
                .value();

          var weekCounts = {};
          annotationsByWeek.forEach(function(s) {
            weekCounts[s.week] = (weekCounts[s.week] || 0) + s.annotations.length;
          });

          var overlapCount = overlapCounts(0, weeksFromStart(end), weekCounts, ANNOTATION_COLS);
          var maxOverlapHeight = _.max(_.values(overlapCount));

          //TODO: feels like there should be a better way
          var dataMapping = {};
          data.forEach(function(d) {
            dataMapping[-start.diff(d.key, "days", false)] = d.value;
          });

          //DRAW IT

          //FIXME TODO: HACK correctly use enter, exit, select instead of clearing/redrawing (also redraw when the bucketed unit of time changes)

          element.html("");

          scope.svg = d3.select(element[0]).append("svg:svg").attr("width", "100%")
            .attr("height", "100%");

          var annotationHeight = ANNOTATION_LINES * ANNOTATION_TEXT_HEIGHT + ANNOTATION_Y_SPACING;
          var maxAnnotationLineLength = annotationHeight * maxOverlapHeight + 20;

          function annotationClass(ann, i) {
            return 'annotation' + (i % 3);
          }

          var annotationSetG = scope.svg
                .append("g")
                .attr('transform', translate(0, maxAnnotationLineLength))
                .selectAll("text")
                .data(annotationsByWeek)
                .enter()
                .append('g')
                .attr('class', annotationClass)
                .attr('transform', function(s) {
                  return translate(s.week * totalCellWidth * WEEK_GROUPING - totalCellWidth / 2 - 1, 0);
                });

          annotationSetG
            .append("line")
            .attr("y1", function(s) {
              var o = overlapCount[s.week] || 0;
              return - (o * annotationHeight + 10);
            })
            .attr("y2", -9)
            .attr('class', annotationClass);

          var annotationG = annotationSetG
                .append('g')
                .attr('transform', function(s) {
                  var o = overlapCount[s.week] || 0;
                  return translate(5, - (o - s.annotations.length + 1) * annotationHeight);
                })
                .selectAll("text")
                .data(function(d) {
                  return d.annotations.reverse();
                })
                .enter()
                .append('g')
                .attr('transform', function(ann, i) {
                  return translate(0, -annotationHeight * i);
                });

          var IMAGE_SIZE = 30;
          annotationG
            .append('image')
            .attr('xlink:href', function(d) {
              return d.imageUrl;
            })
            .attr('width', IMAGE_SIZE)
            .attr('height', IMAGE_SIZE)
            .attr('transform', function(ann, i) {
              return translate(-4, -10);
            });

          var annotationTextG = annotationG
                .append('g')
                .attr('transform', function(s) {
                  return translate(s.imageUrl ? IMAGE_SIZE + 1 : 0, 0);
                });

          // Title.
          annotationTextG
            .append("svg:a")
            .attr('xlink:href', function(d) {
              return d.path;
            })
            .append('text')
            .attr('font-size', 13)
            .text(function(d) {
              // TODO (em) truncate via styling instead of code.
              return truncate(d.title, MAX_TITLE_LEN);
            });

          // Date.
          annotationTextG
            .append('g')
            .attr('class', 'annotation-date')
            .append("svg:text")
            .text(function(d) {
              return moment(d.date).format('MMMM D, YYYY');
            })
            .attr('font-size', 10)
            .attr('y', ANNOTATION_TEXT_HEIGHT);

          //TODO: add mouse events

          // month axis
          //TODO: check this math (might need special case for small widths?)
          var months = Math.round(end.diff(start.clone().startOf("month"),'months', true));

          var calendarG = scope.svg.append("g")
                .attr('transform', translate(0, maxAnnotationLineLength))
                .append('g');

          calendarG
            .append("g")
            .attr("width", "100%")
            .attr("class", "x axis")
            .selectAll("text")
            .data(_.range(months))
            .enter()
            .append("svg:text")
            .text(function(d) {
              return end.clone().subtract("months", d).format("MMM");
            })
            .attr("x", function(d) {
              return width - 8 - 2*totalCellWidth +
                (end.clone().subtract("months", d).diff(end, "weeks")) * totalCellWidth;
            })
            .attr("fill", "black");

          var weeks = end.diff(start.clone().startOf("week"), 'weeks', false) + 1;

          // Weekday axis
          calendarG
            .append("g")
            .attr('transform', translate(18, xAxisHeight + 2))
            .attr("height", "100%")
            .attr('class', 'weekday')
            .selectAll("text")
            .data(_.range(7))
            .enter()
            .append("svg:text")
            .text(function(d) {
              return moment(endTime).days(d).format("ddd");
            })
            .attr("y", function(d) {
              return d * totalCellHeight + xAxisHeight;
            });

          // actual chart
          scope.chart = calendarG.append("g")
            .attr("transform", translate(yAxisWidth, xAxisHeight));

          var pastDays = moment().diff(start, 'days', false);

          function setSelectedRangesForDay(d) {
            var rangeStartDate = start.clone().add("days", d);
            setSelectedRanges([[
              rangeStartDate,
              rangeStartDate.clone().add("days", 1)
            ]]);
          }

          scope.chart.selectAll("rect").data(_.range(days)).enter().append("svg:rect")
            .classed("day", true)
            .classed("future-day", function(d) {
              return d > pastDays;
            })
            .attr("width", cellWidth)
            .attr("height", cellHeight)
            .attr("stroke-width",border)
            .attr("x", function(d) { return Math.floor(d / 7) * totalCellWidth; })
            .attr("y", function(d) { return Math.floor(d % 7) * totalCellHeight; })

          //TODO: change the data over so we don't have to keep doing date math from the startdate

          // TODO: shift click selects a consecutive range
          // TODO: ctrl click selects a disjoint set of ranges

          //TODO TODO! : stop setting the selected class here since we just call the selected ranges method afterwards anyway
            .on("mousedown", function(d) {
              d3.event.stopPropagation();
              scope.mousedown = d;
              var rect = d3.select(this);
              //if only 1 cell is selected
              if (scope.chart.selectAll("rect.day.selected")[0].length===1) {
                //if it's this cell
                if (rect.classed("selected")) {
                  rect.classed("selected", false);
                  setSelectedRanges([]);
                } else {
                  scope.chart.selectAll("rect.day").classed("selected", false);
                  rect.classed("selected", true);
                  setSelectedRangesForDay(d);
                }
              } else {
                // if lots of cells are selected, always select (TODO: does this behavior make sense?)
                //TODO: add a good way to deselect esp for ranges
                scope.chart.selectAll("rect.day").classed("selected", false);
                rect.classed("selected", true);
                setSelectedRangesForDay(d);
              }
            })
          //TODO: doublecheck re: mouseover bubbling concerns
            .on("mouseover", function(d) {
              // if we're in the middle of a click & drag
              if (!isNullOrUndefined(scope.mousedown)) {
                var startRange = Math.min(scope.mousedown, d);
                var endRange = Math.max(scope.mousedown, d);

                scope.chart.selectAll("rect.day").classed("selected", function(rectNumber) {
                  return rectNumber >= startRange && rectNumber <= endRange;
                });

                setSelectedRanges([[
                  start.clone().add("days", startRange), start.clone().add("days", endRange + 1)
                ]]);
              }
            })
            .on("mouseup", function() {
              scope.mousedown = null;
            })
          //TODO: try gradient colors with hsl
            .attr("class", function(d) {
              var curClasses = d3.select(this).attr("class");
              if (_.has(dataMapping, d)) {
                curClasses += " q"+ Math.floor(dataMapping[d]/maxCount * 8) + "-9";
              } else {
                curClasses += " qundefined-9";
              }
              return curClasses;
            })
          //TODO: change to an onhover and make nicer
            .append("svg:title")
            .text(function(d) {
              var dateString = start.clone().add("days", d).format("MMMM DD, YYYY");
              if (_.has(dataMapping, d) && !isNullOrUndefined(dataMapping[d])) {
                var count = dataMapping[d];
                return dateString + " : " + count + (count === 1 ? " item" : " items");
              } else {
                return dateString;
              }
            });

          if (debugMode) {
            scope.chart.selectAll("text")
              .data(_.range(days))
              .enter()
              .append('svg:text')
              .text(function(d) {
                return start.clone().add("days", d).format("DD");
              })
              .attr("x", function(d) { return Math.floor(d / 7) * totalCellWidth; })
              .attr("y", function(d) { return Math.floor(d % 7) * totalCellHeight; })
            ;
          }

          // in case we lift up the mouse somewhere else on the page
          d3.select("html").on("mouseup", function() {
            scope.mousedown = null;
          });
        }

        //TODO: stop using startdate
        //TODO: slightly redundant if we've changed the range
        var selectRanges = function (ranges) {
          if (ranges[0] && ranges[0][0] && ranges[0][1]) {
          }

          d3.select(element[0]).selectAll('rect.day').classed("selected", function(d) {
            return _.some(ranges, function(r) {
              if (r[0] && r[1]) {
                var rangeStart = -scope.start.diff(r[0], "days", true);
                var rangeEnd = -scope.start.diff(r[1], "days", true);
                if (d >= rangeStart && d < rangeEnd) {
                  return true;
                }
              }
              return false;
            });
          });
        };

        scope.$watch('data',function(counts) {
          if (!isNullOrUndefined(counts) && counts.length > 0) {
            drawChart(counts);
            selectRanges(filter);
          }
        }, true);

        //TODO: update the options as well
        scope.$watch('params.filter',function(f) {
          if (!isNullOrUndefined(f)) {
            selectRanges(f);
          }
        }, true);

        scope.$watch('params.options', function(o) {
          //the display options have changed, redraw the chart
          if (!isNullOrUndefined(scope.data) && scope.data.length > 0) {
            drawChart(scope.data);
            selectRanges(filter);
          }
        }, true);

        scope.$watch('params.annotations', function(o) {
          if (!isNullOrUndefined(scope.data) && scope.data.length > 0) {
            drawChart(scope.data);
            selectRanges(filter);
          }
        }, true);
      }
    };
  }]);
}());

angular.module('dataviz.directives')
  .directive('viz-gridstr', function($timeout) {
    return {
      restrict: 'E',
      link: function($scope, $element, $attributes, $controller) {
        var gridster;
        var ul = $element.find('ul');
        var defaultOptions = {
          widget_margins: [5, 5],
          widget_base_dimensions: [70, 70]
        };
        var options = angular.extend(defaultOptions, $scope.$eval($attributes.options));

        $timeout(function() {
          gridster = ul.gridster(options).data('gridster');

          gridster.options.draggable.stop = function(event, ui) {
            //update model
            angular.forEach(ul.find('li'), function(item, index) {
              var li = angular.element(item);
              if (li.attr('class') === 'preview-holder') {
                return;
              }
              var widget = $scope.model[index];
              widget.row = li.attr('data-row');
              widget.col = li.attr('data-col');
            });
            $scope.$apply();
          };
        });

        var attachElementToGridster = function(li) {
          //attaches a new element to gridster
          var $w = li.addClass('gs_w').appendTo(gridster.$el).hide();
          gridster.$widgets = gridster.$widgets.add($w);
          gridster.register_widget($w).add_faux_rows(1).set_dom_grid_height();
          $w.fadeIn();
        };
        $scope.$watch('model.length', function(newValue, oldValue) {
          if (newValue !== oldValue+1) {
            return; //not an add
          }
          var li = ul.find('li').eq(newValue-1); //latest li element
          $timeout(function() { attachElementToGridster(li); }); //attach to gridster
        });
      }
    };
  })

  .directive('widget', function() {
    return {
      restrict: 'E',
      scope: { widgetModel: '=' },
      replace: true,
      template:
      '<li data-col="{{widgetModel.col}}" data-row="{{widgetModel.row}}" data-sizex="{{widgetModel.sizex}}" data-sizey="{{widgetModel.sizey}}">'+
        '<div class="dynamic-visualization"><header><h2><input type="text" ng-model="zzzz"></h2> </header><barchart property-id="{{zzzz}}"></barchart></div>'+
        '</li>',
      link: function($scope, $element, $attributes, $controller) {
      }
    };
  }).controller('MainCtrl', function($scope) {
    $scope.widgets = [
      {text:'Widget #1', row:1, col:1, sizex:7, sizey:4},
      {text:'Widget #2', row:5, col:1, sizex:7, sizey:4}
    ];

    $scope.addWidget = function() {
      var randomSizex = 7;
      var randomSizey = 4;
      $scope.widgets.push({text:'Widget #'+($scope.widgets.length+1), row:1+($scope.widgets.length)*4, col:1, sizex:randomSizex, sizey:randomSizey});
    };
  });

angular.module('dataviz.directives').directive('histogram', [function() {
  return {
    restrict: 'E',
    scope: {
      //TODO: change expected values to something more reasonable
      'data': '=', //expects an array of selected label strings
      'data2': '=',
      'params' : '=',  // expects an array of {key:<lable>,value:<count>} pairs
      'filter2' : '='
    },
    link: function(scope, element, attributes) {

      var defaultOptions = {
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
        'filterSelector' : false
      };



      //TODO: better way to handle options, esp option merging
      function getOption(optionName) {
        return _.defaults(scope.params.options, defaultOptions)[optionName];
        //return (scope.params && scope.params.options && !_scope.params.options[optionName]) || defaultOptions[optionName];
      }


      //INIT:
      element.append("<svg></svg>");

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

      scope.brush2 = d3.svg.brush()
          .on("brush", function() {brushed(scope.brush2, this);})
          .on("brushstart", function() {brushstart(scope.brush2);})
          .on("brushend", function() {brushend(scope.brush2);});


      function brushed(brush) {
        if ((brush === scope.brush && scope.params.filterNum) || (brush === scope.brush2 && !scope.params.filterNum)) {
          brush.extent(brush.oldExtent);
          brush(brush === scope.brush ?  d3.select(element[0]).select('.x.brush') : d3.select(element[0]).select('.x.brush2'));
          return;
        }

        var extent = brush.extent();
        if (getOption('snap') && extent && extent.length === 2) {
          var domain = getOption('domain');
          var buckets = getOption('bars');
          var range = domain[1] - domain[0];
          var step = range/buckets;
          extent = [Math.round(extent[0]/step) * step, Math.round(extent[1]/step) * step];
          brush.extent(extent);
          brush(brush === scope.brush ?  d3.select(element[0]).select('.x.brush') : d3.select(element[0]).select('.x.brush2')); //apply change
        }

        if (getOption('realtime')) {
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

      //also in betterBarchart.js - move to a util module
      //FROM: http://stackoverflow.com/questions/14605348/title-and-axis-labels
      function measure(text, classname) {
        if(!text || text.length === 0) return {height: 0, width: 0};

        var container = d3.select('body').append('svg').attr('class', classname);
        container.append('text').attr({x: -1000, y: -1000}).text(text);

        var bbox = container.node().getBBox();
        container.remove();

        return {height: bbox.height, width: bbox.width};
      }

      scope.params.filterNum = 0;

      function drawChart(data, data2) {

        element.html('');
        element.append("<svg></svg>");


        var width = getOption('widthPx');
        var height = getOption('heightPx');

        element.find("svg").width(width);
        element.find("svg").height(height);

        var margins = getOption('margins');

        var r = getOption('range');

        var max = _.isArray(r) && r[1] || _.max(_.pluck(data, 'value'));

        var leftMargin = margins.left;

        if (getOption('autoMargin')) {
          leftMargin = (margins.left + measure(max, "y axis").width) || margins.left;
          leftMargin = leftMargin === -Infinity ? 0 : leftMargin;
        }

        var w = width - leftMargin - margins.right;
        var h = height - margins.top - margins.bottom;

        var bars = getOption('bars') || data.length;
        var barPadding = getOption('padding');

        var barWidth = (w/bars) - barPadding;

        var svg = d3.select(element[0]).select('svg');

        var g = svg.append('g')
            .classed('main', true)
            .attr('width', w)
            .attr('height', h)
            .attr('transform', 'translate(' + leftMargin + ', ' + margins.top + ')');

        var x;
        var y;

        var d = getOption('domain');

        var mergedData = null;
        if (data2) {

          mergedData = {};

          _.each(data, function(d) {
            mergedData[d.key] = {key: d.key, values: [d.value]};
          });

          _.each(data2, function(d) {
            if (mergedData[d.key]) {
              mergedData[d.key].values[1] = d.value;
            } else {
              mergedData[d.key] = {key: d.key, values: [null, d.value]};
            }
          });
//          d = _.pluck(mergedData, 'key');

        }

        if(d === 'auto') {

          var xMax = _.max(_.pluck(data, 'key'));
          var xMin = _.min(_.pluck(data, 'key'));
          //TODO: use d3 to do this automatically
          xMax += (xMax - xMin)/bars;
          x = d3.scale.linear().domain([xMin, xMax]).range([0, w]);
        } else {
          x = d3.scale.linear().domain(d).range([0, w]);
        }

        if(r === 'auto') {
          var yMax;
          if (mergedData) {
            var yMaxObj = _.max(mergedData, function(d) {
              return (d.values[0] || 0) + (d.values[1] || 0);
            });
            yMax = (yMaxObj.values && (yMaxObj.values[0] || 0) + (yMaxObj.values[1] || 0)) || 1;
          } else {
            yMax = data[0].value;
          }
          //var yMin = data[data.length - 1].value;
          y = d3.scale.linear().domain([0, yMax]).range([h, 0]);
        } else {
          y = d3.scale.linear().domain(r).range([h, 0]);
        }




        scope.brush.x(x);
        scope.brush2.x(x);


        var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(w/100);
        var yAxis = d3.svg.axis().scale(y).orient("left").ticks(h/60);

        if (data2) {

          var rectHolder = g.selectAll('g').data(_.values(mergedData)).enter().append('g')
              .classed('bar-holder', true);
//              .attr("transform", function(d) { return "translate(" + 0 + ", " + 0 + ")";})
//              .attr('width', barWidth)
//              .attr('height', function(d,i) { return (d.values[0] ? (h - y(d.values[0])) : 0) + (d.values[1] ? (h - y(d.values[1])) : 0); });

          rectHolder.selectAll('rect.d1').data(function(d) { console.log(d); return [d];}).enter().append('rect')
              .classed('bar d1', true)
              .attr('y', function(d, i) { return d.values[0] ? y(d.values[0]) : 0; })
              .attr('x', function(d, i) { return _.isNumber(d.key) ? x(d.key) : x(i);})
              .attr('width', barWidth)
              .attr('height', function(d, i) { return d.values[0] ? (h - y(d.values[0])): 0; })
              .attr('stroke-width', getOption('padding')+'px');
          rectHolder.selectAll('rect.d2').data(function(d) { return [d];}).enter().append('rect')
              .classed('bar d2', true)
              .attr('x', function(d, i) { return _.isNumber(d.key) ? x(d.key) : x(i);})
              .attr('height', function(d, i) { return d.values[1] ? (h - y(d.values[1])): 0; })
              .attr('width', barWidth)
              .attr('y', function(d, i) {
                console.log(h - y(d.values[0]));
                console.log(h - y(d.values[0]) + h - y(d.values[0]));
                console.log('f', h - (h - y(d.values[0]) + h - y(d.values[0])));
                return (h - ((h - (d.values[0] ? y(d.values[0]) : h)) + (h - (d.values[1] ? y(d.values[1]) : h))));
              })
              .attr('stroke-width', getOption('padding')+'px');



        } else {


          g.selectAll('rect').data(data).enter().append('rect')
              .classed('bar', true)
              .attr('x', function(d, i) { return _.isNumber(d.key) ? x(d.key) : x(i);})
              .attr('y', function(d, i) { return y(d.value); })
              .attr('width', barWidth)
              .attr('height', function(d, i) { return h - y(d.value); })
              .attr('stroke-width', getOption('padding')+'px');

        }

        var xaxis =   svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(" + leftMargin + ", " + (h + margins.top) + ")")
            .call(xAxis);

        var yaxis =   svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + leftMargin + ", " + (margins.top) + ")")
            .call(yAxis);


        var brush2 = g.append("g")
            .attr("class", "x brush2")
            .call(scope.brush2)
            .selectAll("rect")
            .attr("y", -6)
            .attr("height", h+8);

        var brush = g.append("g")
            .attr("class", "x brush")
            .call(scope.brush)
            .selectAll("rect")
            .attr("y", -6)
            .attr("height", h+8);

      }

      scope.$watch('params.filterNum', function(fn) {
        if (fn) {
          $(element[0]).find('g.x.brush2').appendTo($('g.main'));
        } else {
          $(element[0]).find('g.x.brush').appendTo($('g.main'));
        }
      });

      scope.$watch('data',function(counts) {
        if(counts!==undefined && counts!==null) {
          drawChart(counts, scope.data2);
        }
      }, true);

      scope.$watch('data2',function(counts) {
        if(scope.data) {
          drawChart(scope.data, scope.data2);
        }
      }, true);

      scope.$watch('params.filter', function(f) {
        if (f) {
          console.log('setting brush');
          setBrush(scope.brush, f[0]);
        }
      }, true);

      scope.$watch('params.options', function() {
        if (scope.data) {
          drawChart(scope.data, scope.data2);
        }
      }, true);

      scope.$watch('filter2', function(f) {
        if (f) {
          console.log('setting brush');
          setBrush(scope.brush2, f[0]);
        }
      }, true);

    }
  };
}]);

angular.module('dataviz.directives').directive('nvBarchart', [function() {
  return {
    restrict: 'E',
    scope: {
      //TODO: change expected values to something more reasonable
      'data': '=', //expects an array of selected label strings
      'params' : '='  // expects an array of {key:<lable>,value:<count>} pairs
    },
    link: function(scope, element, attributes) {
      var defaultOptions = {
        'tooltips' : false,
        'showValues': true,
        'staggerLabels': true,
        'widthPx' : 586,
        'heightPx' : 286
      };

      //TODO: better way to handle options, esp option merging
      function getOption(optionName) {
        return (scope.params && scope.params.options && scope.params.options[optionName]) || defaultOptions[optionName];
      }


      //INIT:
      element.append("<svg></svg>");

      function setSelectedLabels(labels) {
        scope.$apply(function () {
          var args = [0, scope.params.filter.length].concat(labels);
          Array.prototype.splice.apply(scope.params.filter, args);
        });
      }

      $(document).on('keyup keydown', function(e){scope.shifted = e.shiftKey; return true;} );

      function drawChart(data) {
        data = [{
          key:"Key",
          values:data
        }];


        element.find("svg").width(getOption('widthPx'));
        element.find("svg").height(getOption('heightPx'));

        nv.addGraph(function() {
          var chart = nv.models.discreteBarChart()
                .x(function(d) { return d.key; })
                .y(function(d) { return d.value; })
                .staggerLabels(true)
                .tooltips(false)
                .showValues(true);

          d3.select(element[0]).select("svg")
            .datum(data)
            .transition().duration(500)
            .call(chart);

          setTimeout(function() {

            d3.select(element[0]).selectAll('.nv-bar').classed("selected", function(d,i) {
              //TODO: HACK ATTACK
              var labels = d3.select(element[0]).selectAll('g.nv-x g.tick')[0].sort(function(a,b) {
                var a_trans = a.transform.animVal.getItem(0).matrix.e;
                var b_trans = b.transform.animVal.getItem(0).matrix.e;
                return a_trans - b_trans;
              });
              var label = $(labels[i]).text();
              if(scope.params.filter) {
                var j;
                for(j=0;j<scope.params.filter.length;j++) {
                  if(label === scope.params.filter[j]) {
                    return true;
                  }
                }
              }
              return false;
            });
          },10);

          d3.select(element[0]).selectAll('.nv-bar').on("click",function(d, i) {
            //TODO HACK to get around nvd3 not adding labels to the bars
            var labels = d3.select(element[0]).selectAll('g.nv-x g.tick')[0].sort(function(a,b) {
              var a_trans = a.transform.animVal.getItem(0).matrix.e;
              var b_trans = b.transform.animVal.getItem(0).matrix.e;
              return a_trans - b_trans;
            });
            var label = $(labels[i]).text();
            if( d3.select(this).classed("selected")) {
              if(scope.shifted) {
                setSelectedLabels(_.without(scope.params.filter,label));
              } else {
                setSelectedLabels([]);
                d3.select(element[0]).selectAll("g.nv-bar").classed("selected", false);
              }
            } else {
              if(scope.shifted) {
                scope.params.filter.push(label);
                setSelectedLabels(scope.params.filter);
              } else {
                setSelectedLabels([label]);
                d3.select(element[0]).selectAll("g.nv-bar").classed("selected", false);
              }

            }
            //HACK: nvd3 seems to be overwriting this
            setTimeout(function() {
              //dThis.classed("selected", true);
              selectBars(scope.params.filter);
            }, 1);
          });

          nv.utils.windowResize(chart.update);

          //TODO: add click handler


          return chart;
        });
      }

      function selectBars(selected){
        d3.select(element[0]).selectAll('.nv-bar').classed("selected",function(d, i) {
          //TODO HACK to get around nvd3 not adding labels to the bars
          var labels = d3.select(element[0]).selectAll('g.nv-x g.tick')[0].sort(function(a,b) {
            var a_trans = a.transform.animVal.getItem(0).matrix.e;
            var b_trans = b.transform.animVal.getItem(0).matrix.e;
            return a_trans - b_trans;
          });
          var label = $(labels[i]).text();
          return _.contains(selected, label);
        });


      }


      scope.$watch('data',function(counts) {
        if(counts!==undefined && counts!==null) {
          drawChart(counts);
        }
      }, true);

      scope.$watch('params.filter', function(f) {
        selectBars(f);
      }, true);

      scope.$watch('params.options', function() {
        drawChart(scope.data);
      }, true);

    }
  };
}]);

//
//angular.module('dataviz.directives').directive('pie', ['$timeout', function($timeout) {
//  return {
//    restrict: 'E',
//    scope: {
//      data: '=',
//      params: '='
//    },
//    link: function(scope, element) {
//
//      var initialized = false;
//
//      // copied from:
//      // http://bl.ocks.org/mbostock/3888852
//      // and
//      // http://bl.ocks.org/mbostock/3887235
//      // and
//      // http://bl.ocks.org/mbostock/5682158
//
//      $(element[0]).append('<svg></svg>');
//
//      scope.$watch('data', function(data, oldData) {
//        if (!initialized) {
//          initChart(data);
//        }
//        updateChart(data);
//      }, true);
//
//      scope.$watch('params', function(params) {
//        //reinit if certain things change
//        updateChart(scope.data, scope.data);
//      }, true);
//
//      function measure(text, classname) {
//        if(!text || text.length === 0) {
//          return {height: 0, width: 0};
//        }
//
//        var container = d3.select('body').append('svg').attr('class', classname);
//        container.append('text').attr({x: -1000, y: -1000}).text(text);
//
//        var bbox = container.node().getBBox();
//        container.remove();
//
//        return {height: bbox.height, width: bbox.width};
//      }
//
//      var arc,selarc,textarc,pie,outerSvg,svg;
//
//      function initChart(data) {
//        console.log("pie init");
//        if (data) {
//          data = _.first(data, 4);
//
//          var width = scope.params.options.widthPx || 175, height = scope.params.options.heightPx || 175;
//
//          var largestKeyWidth = _.max(_.map(data, function(v, k) {
//            return measure(v.key, 'pie-legend').width;
//          }));
//
//          if (largestKeyWidth > width/2) {
//            console.log("large pie labels");
//          }
//
//          var legendWidth = Math.min(largestKeyWidth + 25, 100);
//
//          var radius = Math.min((width - legendWidth - largestKeyWidth) / 2, height - 60) / 2;
//
//          var color = d3.scale.ordinal().range([
//            '#00a000',
//            '#ffff00',
//            '#f00000',
//            'grey'
////            '#69AADB',
////            '#B6D8F3',
////            '#1E5784',
////            '#2977B3'
//          ]);
//
//
//          arc = d3.svg.arc()
//              .outerRadius(radius - 10)
//              .innerRadius(Math.max(radius - 40, 0));
//          selarc = d3.svg.arc()
//              .outerRadius(radius + 10)
//              .innerRadius(radius - 20);
//          //TODO: hack
//          textarc = d3.svg.arc()
//              .outerRadius(2*radius + 20)
//              .innerRadius(0);
//
//          pie = d3.layout.pie()
//              .sort(null)
//              .value(function(d) { return d.value; });
//
////          if (!$(element[0]).find('g')) {
//          element.html("<svg></svg>");
//
//          var bgcolor = scope.params.options.bgcolor || 'white';
//          var textcolor = scope.params.options.textcolor || 'white';
//          var fillopacity = scope.params.options.fillopacity || "0.6";
//
//
//          outerSvg = d3.select(element[0]).select("svg")
////              .attr("viewBox", "0 0 " + (width + 150) + " " + (height + 50) )
////              .attr("preserveAspectRatio", "xMinYMin")
////              .attr("width", '100%')
////              .attr("height", '100%');
////              .attr('')
//              .attr("fill", textcolor)
//              .attr("fill-opacity",fillopacity)
//              .attr("width", width)
//              .attr("height", height)
//              .style("background-color", bgcolor);
//
//          svg = outerSvg.append('g').attr('transform',
//              'translate(' + ( radius + (2* legendWidth)) + ',' + (20 +  radius) + ')');
////          }
//
//          //TODO: copy over filters if selected externally
//
//          var g = svg.selectAll(".arc")
//              .data(pie(data))
//              .enter().append("g")
//              .attr("class", "arc");
//
//          g.append("path")
//              .attr("d", function(d) {
//                if (!_.contains(scope.params.filter, d.data.key)) {
//                  return arc.apply(this, arguments);
//                }
//                return selarc.apply(this, arguments);
//              })
//              .classed('selected', function(d) {
//                return _.contains(scope.params.filter, d.data.key);
//              })
//              .style("fill", function(d) { return color(d.data.key); })
//              .on("click", function(d) {
//                if (!_.contains(scope.params.filter, d.data.key)) {
//                  d3.select(this).classed('selected',true)
//                      .attr('d', selarc);
//                  scope.$apply(function() {
//                    scope.params.filter.push(d.data.key);
//                  });
//                } else {
//                  d3.select(this).classed('selected',false)
//                      .attr('d', arc);
//                  scope.$apply(function() {
//                    scope.params.filter.splice(scope.params.filter.indexOf(d.data.key), 1); //TODO: remove all instances
//                  });
//                }
//              });
//
//          g.append("text")
//              .attr("transform", function(d) { return "translate(" + textarc.centroid(d) + ")"; })
//              .attr("dy", ".35em")
//              .style("text-anchor", "middle")
//              .text(function(d) { return d.data.key; })
//              .attr('font-weight', 'bold')
//              .attr('font-size', '13px');
//
//          g.append("text")
//              .attr("transform", function(d) { return "translate(" + textarc.centroid(d) + ")"; })
//              .attr("dy", "1.5em")
//              .style("text-anchor", "middle")
//              .text(function(d) { return d.data.value; })
//              .attr('font-size', '11px');
//
//
//
//          var legend = outerSvg.append('g')
//              .attr("class", "legend")
//              .attr("width", legendWidth)
//              .attr("height", height)
//              .attr("transform", function() {
//                if (width - legendWidth - 120 > 0 ) {
//                  return "translate(300,100)";
//                }
//                return "translate(10,10)";
//              })
//              .selectAll("g")
////              .data(color.domain().slice().reverse())
//              .data(data)
//              .enter().append("g")
//              .attr("transform", function(d, i) { return "translate(0," + i * Math.min(height/data.length,20) + ")"; });
//
//          legend.append("rect")
//              .attr("width", Math.min(height/data.length - 2, 18))
//              .attr("height", Math.min(height/data.length - 2, 18))
//              .style("fill", function(d) {return color(d.key); });
//
//          legend.append("text")
//              .attr("x", 24)
//              .attr("y", Math.min((height/data.length - 2)/2, 9))
//              .attr("dy", ".35em")
//              .text(function(d) {
//                console.log(d);
//                return d.key; }).classed('pie-legend', true);
//
//        }
//      }
//
//      function updateChart(data, oldData) {
//        console.log("pie update");
//        if (data) {
//          data = _.first(data, 4);
//          oldData = oldData && _.first(data, 4) || [];
//
//            var data0 = path.data(),
//                data1 = pie(region.values);
//
//            path = path.data(data1, key);
//
//            path.enter().append("path")
//                .each(function(d, i) { this._current = findNeighborArc(i, data0, data1, key) || d; })
//                .attr("fill", function(d) { return color(d.data.region); })
//                .append("title")
//                .text(function(d) { return d.data.region; });
//
//            path.exit()
//                .datum(function(d, i) { return findNeighborArc(i, data1, data0, key) || d; })
//                .transition()
//                .duration(750)
//                .attrTween("d", arcTween)
//                .remove();
//
//            path.transition()
//                .duration(750)
//                .attrTween("d", arcTween);
//          }
//
//
//
//
//          ////////////////////////////////////////////////
//
//          var width = scope.params.options.widthPx || 175, height = scope.params.options.heightPx || 175;
//
//          var largestKeyWidth = _.max(_.map(data, function(v, k) {
//            return measure(v.key, 'pie-legend').width;
//          }));
//
//          if (largestKeyWidth > width/2) {
//            console.log("large pie labels");
//          }
//
//          var legendWidth = Math.min(largestKeyWidth + 25, 100);
//
//          var radius = Math.min((width - legendWidth - largestKeyWidth) / 2, height - 60) / 2;
//
//          var color = d3.scale.ordinal().range([
//            '#00a000',
//            '#ffff00',
//            '#f00000',
//            'grey'
////            '#69AADB',
////            '#B6D8F3',
////            '#1E5784',
////            '#2977B3'
//          ]);
//
//
//           arc = d3.svg.arc()
//              .outerRadius(radius - 10)
//              .innerRadius(Math.max(radius - 40, 0));
//           selarc = d3.svg.arc()
//              .outerRadius(radius + 10)
//              .innerRadius(radius - 20);
//          //TODO: hack
//           textarc = d3.svg.arc()
//              .outerRadius(2*radius + 20)
//              .innerRadius(0);
//
//           pie = d3.layout.pie()
//              .sort(null)
//              .value(function(d) { return d.value; });
//
////          if (!$(element[0]).find('g')) {
//          element.html("<svg></svg>");
//
//          var bgcolor = scope.params.options.bgcolor || 'white';
//          var textcolor = scope.params.options.textcolor || 'white';
//          var fillopacity = scope.params.options.fillopacity || "0.6";
//
//
//           outerSvg = d3.select(element[0]).select("svg")
////              .attr("viewBox", "0 0 " + (width + 150) + " " + (height + 50) )
////              .attr("preserveAspectRatio", "xMinYMin")
////              .attr("width", '100%')
////              .attr("height", '100%');
////              .attr('')
//              .attr("fill", textcolor)
//              .attr("fill-opacity",fillopacity)
//              .attr("width", width)
//              .attr("height", height)
//              .style("background-color", bgcolor);
//
//           svg = outerSvg.append('g').attr('transform',
//              'translate(' + ( radius + (2* legendWidth)) + ',' + (20 +  radius) + ')');
////          }
//
//          //TODO: copy over filters if selected externally
//
//          var g = svg.selectAll(".arc")
//              .data(pie(data))
//              .enter().append("g")
//              .attr("class", "arc");
//
//          g.append("path")
//              .attr("d", function(d) {
//                if (!_.contains(scope.params.filter, d.data.key)) {
//                  return arc.apply(this, arguments);
//                }
//                return selarc.apply(this, arguments);
//              })
//              .classed('selected', function(d) {
//                return _.contains(scope.params.filter, d.data.key);
//              })
//              .style("fill", function(d) { return color(d.data.key); })
//              .on("click", function(d) {
//                if (!_.contains(scope.params.filter, d.data.key)) {
//                  d3.select(this).classed('selected',true)
//                      .attr('d', selarc);
//                  scope.$apply(function() {
//                    scope.params.filter.push(d.data.key);
//                  });
//                } else {
//                  d3.select(this).classed('selected',false)
//                      .attr('d', arc);
//                  scope.$apply(function() {
//                    scope.params.filter.splice(scope.params.filter.indexOf(d.data.key), 1); //TODO: remove all instances
//                  });
//                }
//              });
//
//          g.append("text")
//              .attr("transform", function(d) { return "translate(" + textarc.centroid(d) + ")"; })
//              .attr("dy", ".35em")
//              .style("text-anchor", "middle")
//              .text(function(d) { return d.data.key; })
//              .attr('font-weight', 'bold')
//              .attr('font-size', '13px');
//
//          g.append("text")
//              .attr("transform", function(d) { return "translate(" + textarc.centroid(d) + ")"; })
//              .attr("dy", "1.5em")
//              .style("text-anchor", "middle")
//              .text(function(d) { return d.data.value; })
//              .attr('font-size', '11px');
//
//
//
//          var legend = outerSvg.append('g')
//              .attr("class", "legend")
//              .attr("width", legendWidth)
//              .attr("height", height)
//              .attr("transform", function() {
//                if (width - legendWidth - 120 > 0 ) {
//                  return "translate(300,100)";
//                }
//                return "translate(10,10)";
//              })
//              .selectAll("g")
////              .data(color.domain().slice().reverse())
//              .data(data)
//              .enter().append("g")
//              .attr("transform", function(d, i) { return "translate(0," + i * Math.min(height/data.length,20) + ")"; });
//
//          legend.append("rect")
//              .attr("width", Math.min(height/data.length - 2, 18))
//              .attr("height", Math.min(height/data.length - 2, 18))
//              .style("fill", function(d) {return color(d.key); });
//
//          legend.append("text")
//              .attr("x", 24)
//              .attr("y", Math.min((height/data.length - 2)/2, 9))
//              .attr("dy", ".35em")
//              .text(function(d) {
//                console.log(d);
//                return d.key; }).classed('pie-legend', true);
//
//        }
//      }
//
//      function key(d) {
//        return d.data.region;
//      }
//
//      function type(d) {
//        d.count = +d.count;
//        return d;
//      }
//
//      function findNeighborArc(i, data0, data1, key) {
//        var d;
//        return (d = findPreceding(i, data0, data1, key)) ? {startAngle: d.endAngle, endAngle: d.endAngle}
//            : (d = findFollowing(i, data0, data1, key)) ? {startAngle: d.startAngle, endAngle: d.startAngle}
//            : null;
//      }
//
//// Find the element in data0 that joins the highest preceding element in data1.
//      function findPreceding(i, data0, data1, key) {
//        var m = data0.length;
//        while (--i >= 0) {
//          var k = key(data1[i]);
//          for (var j = 0; j < m; ++j) {
//            if (key(data0[j]) === k) return data0[j];
//          }
//        }
//      }
//
//// Find the element in data0 that joins the lowest following element in data1.
//      function findFollowing(i, data0, data1, key) {
//        var n = data1.length, m = data0.length;
//        while (++i < n) {
//          var k = key(data1[i]);
//          for (var j = 0; j < m; ++j) {
//            if (key(data0[j]) === k) return data0[j];
//          }
//        }
//      }
//
//      function arcTween(d) {
//        var i = d3.interpolate(this._current, d);
//        this._current = i(0);
//        return function(t) { return arc(i(t)); };
//      }
//
//    }
//  };
//}]);

//TODO: add prefixes to directives


//TODO: fix references to flexbox in css

angular.module('dataviz.directives').directive('sankey', [function() {
  return {
    restrict: 'E',
    scope: {
      //TODO: DOCUMENT BETTER
      'data': '=',   // expects an array of objects with an array of nodes and an array of links
      'data2' : '=',
      'params' : '=',   // a parameters object with the current filters, options, and highlighted data
      'filter2' : '='
    },
    link: function(scope, element) {
      scope.id = element.attr('id') || _.uniqueId(element.prop("tagName") + "-");

      var defaultOptions = {
        'widthPx' : 586,
        'heightPx' : 500
      };

      //TODO: better way to handle options, esp option merging
      function getOption(optionName) {
        return (scope.params && scope.params.options && scope.params.options[optionName]) || defaultOptions[optionName];
      }

      //TODO: standardize how filters are changed (don't create a new object) - use extend?
      function setSelectedLinks(links) {
        scope.$apply(function () {
          var args = [0, scope.params.filter.length].concat(links);
          Array.prototype.splice.apply(scope.params.filter, args);
        });
      }

      //TODO: change styles to avoid this

      //INIT
      d3.select(element[0]).classed("sankey", true);

//      scope.svg = d3.select(element[0]).append("svg:svg").attr("width", "100%").attr("height", "100%");

      //TODO: handle years
      //TODO: multiple rows if height is large enough
      //TODO: visually groupe months, years, and add a nicer border

      function drawChart(data) {

        element.html("");

        //TODO: take into account height
        //calculate columns based on width
        var widthPx = getOption('widthPx');
        var heightPx = getOption('heightPx');

        var margin = {top: 1, right: 1, bottom: 6, left: 1},
            width = widthPx - margin.left - margin.right,
            height = heightPx - margin.top - margin.bottom;

        var formatNumber = d3.format(",.0f"),
            format = function(d) { return formatNumber(d) + " topics"; },
            color = d3.scale.category20();

        var svg = d3.select(element[0]).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var sankey = d3.sankey()
            .nodeWidth(15)
            .nodePadding(10)
            .size([width, height]);

        var path = sankey.link();

          sankey
              .nodes(data.nodes)
              .links(data.links)
              .layout(32);

          var link = svg.append("g").selectAll(".link")
              .data(data.links)
              .enter().append("path")
              .attr("class", "link")
              .attr("d", path)
              .style("stroke-width", function(d) { return Math.max(1, d.dy); })
              .sort(function(a, b) { return b.dy - a.dy; })
              .classed('selected', function(d) {
                var source = d.source;
                var target = d.target;
                var sourceIdx = _.indexOf(scope.params.filter[source.filterId], source.fieldValue);
                var targetIdx = _.indexOf(scope.params.filter[target.filterId], target.fieldValue);
                return sourceIdx > -1 && targetIdx > -1;
              })
              .on("click", function(d) {
                var elt = d3.select(this);
                scope.$apply(function() {
                  var source = d.source;
                  var target = d.target;
                  var sourceIdx = _.indexOf(scope.params.filter[source.filterId], source.fieldValue);
                  var targetIdx = _.indexOf(scope.params.filter[target.filterId], target.fieldValue);
                  if (elt.classed('selected')) {
                    //splice out the one later in the array first, to prevent shifts
                    if (sourceIdx > targetIdx) {
                      scope.params.filter[source.filterId].splice(sourceIdx, 1);
                      scope.params.filter[target.filterId].splice(targetIdx, 1);
                    } else {
                      scope.params.filter[target.filterId].splice(targetIdx, 1);
                      scope.params.filter[source.filterId].splice(sourceIdx, 1);
                    }
                    elt.classed('selected', false);
                  } else {
                    elt.classed('selected', true);
                    scope.params.filter[source.filterId].push(source.fieldValue);
                    scope.params.filter[target.filterId].push(target.fieldValue);
                  }
                });
              });

          link.append("title")
              .text(function(d) { return d.source.name + " → " + d.target.name + "\n" + format(d.value); });

          var node = svg.append("g").selectAll(".node")
              .data(data.nodes)
              .enter().append("g")
              .attr("class", "node")
              .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
              .call(d3.behavior.drag()
                  .origin(function(d) { return d; })
                  .on("dragstart", function() { this.parentNode.appendChild(this); })
                  .on("drag", dragmove));

          node.append("rect")
              .attr("height", function(d) { return d.dy; })
              .attr("width", sankey.nodeWidth())
              .style("fill", function(d) { return d.color = color(d.name.replace(/ .*/, "")); })
              .style("stroke", function(d) { return d3.rgb(d.color).darker(2); })
              .append("title")
              .text(function(d) { return d.name + "\n" + format(d.value); });

          node.append("text")
              .attr("x", -6)
              .attr("y", function(d) { return d.dy / 2; })
              .attr("dy", ".35em")
              .attr("text-anchor", "end")
              .attr("transform", null)
              .text(function(d) { return d.name; })
              .filter(function(d) { return d.x < width / 2; })
              .attr("x", 6 + sankey.nodeWidth())
              .attr("text-anchor", "start");

          function dragmove(d) {
            d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
            sankey.relayout();
            link.attr("d", path);
          }


      }


      scope.$watch('data',function(data) {
        if(data!==undefined && data!==null && data.nodes && data.links && data.nodes.length > 0 && data.links.length > 0) {
          var dataClone = JSON.parse(JSON.stringify(data));
          drawChart(dataClone);
        }
      }, true);


//      //TODO: update the options as well
//      scope.$watch('params.filter',function(f) {
//        if(f!==undefined && f!==null) {
//          selectRanges(f);
//        }
//      }, true);
//
//      scope.$watch('params.options', function(o) {
//        //the display options have changed, redraw the chart
//        if(scope.data!==undefined && scope.data!==null && scope.data.length > 0) {
//          drawChart(scope.data);
//          selectRanges(scope.params.filter);
//        }
//      }, true);
    }
  };
}]);

angular.module('dataviz.directives').directive('sidebar', [function() {
  return {
    restrict: 'E',
    scope: {
      'data': '=', //expects an array of selected label strings
      'params' : '='  // expects an array of {key:<lable>,value:<count>} pairs
    },
    template: '<div class="sidebar-sizer"><div class="sidebars">' +
      '<ul>' +
      '<li ng-repeat="item in data|orderBy:value|limitTo:barLimit" ng-class="{selected: item.selected}"> '  +
      '<div ng-click="select(item)" style="width:100%; position:relative">' +
      '<label>{{item.key}}</label>' +
      '<span class="value" style="width: {{(item.value/maxVal) * 100}}%"><span class="text">{{item.value}}</span></span>' +
      '<span class="cancel x" ng-show="item.selected"></span>' +
      '</div>' +
      '</li>' +
      '</ul>' +
      '</div></div>',
    link: function(scope, element, attributes) {

      var defaultOptions = {
        'barLimit' : 5
      };

      //TODO: better way to handle options, esp option merging
      function getOption(optionName) {
        return (scope.params && scope.params.options && scope.params.options[optionName]) || defaultOptions[optionName];
      }

      //INIT:
      scope.barLimit =getOption('barLimit');

      $(document).on('keyup keydown', function(e) {
        scope.shifted = e.shiftKey; return true;
      });

      function setSelectedLabels(labels) {
        var args = [0, scope.params.filter.length].concat(labels);
        Array.prototype.splice.apply(scope.params.filter, args);
      }

      scope.select = function(item) {
        if( item.selected) {
          if(scope.shifted) {
            setSelectedLabels(_.without(scope.params.filter, item.key));
          } else {
            setSelectedLabels([]);
          }
        } else {
          if(scope.shifted) {
            scope.params.filter.push(item.key);
            setSelectedLabels(scope.params.filter);
          } else {
            setSelectedLabels([item.key]);
          }

        }
        _.each(scope.data, function(datum) {
          datum.selected = _.contains(scope.params.filter, datum.key);
        });

      };



      scope.$watch('data',function(counts) {
        console.log("data!");
        if(counts!==undefined && counts!==null) {
          //update the max value
          scope.maxVal = _.max(counts,function(v) {return v.value; }).value;
          _.each(counts, function(count) {
            count.selected = _.contains(scope.params.filter, count.key);
          });
        }
      }, true);

      scope.$watch('params.options', function() {
        //TODO: UPDATE WIDTH/HEIGHT OF CONTAINER HERE
        var w = getOption("widthPx");
        if(w) {
          element.find(".sidebar-sizer").width(w);
        }
        var h = getOption("heightPx");
        if(h) {
          element.find(".sidebar-sizer").height(h);
          if(!scope.params.options.barLimit) {
            scope.barLimit = Math.floor(h/25);
          } else {
            scope.barLimit = scope.params.options.barLimit;
          }
        }
      }, true);
    }
  };
}]);

angular.module('dataviz.directives').directive('vizMap', [function() {
  return {
    restrict: 'E',
    scope: {
      'data': '=', //expects an array of objects with lat lng and weight
      'data2': '=',
      'params' : '='
    },
    template: '<div id="map_canvas" ui-map="myMap" class="map" ui-options="mapOptions"' +
//        'ui-event="{}"' +
      ' ui-event="{\'bounds_changed\': \'boundsChanged($event, $params)\', \'map-deactivate\': \'dragEnd($event, $params)\' }"' +
//    'ui-options="mapOptions">' +
    '></div>',
    'controller': ['$scope', '$timeout', function ($scope, $timeout) {
      $scope.myMarkers = [];
      $scope.myMap = {};

      var defaultOptions = {
        heatmap : true,
        cluster : true,
        mapOptions: {
          center: new google.maps.LatLng(39.232253,-98.539124),
          zoom: 4,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
        },
        alwaysRedraw: false,
        weightsBasedOnBounds: false,
        latKey: 'lat',
        lngKey: 'lng',
        weightKey: 'weight'
      };

      google.maps.visualRefresh = true;

      var options = defaultOptions;

      $scope.$watch('params.options', function(o) {
        var options = defaultOptions;
        _.extend(options, o);
        $scope.mapOptions = options.mapOptions;
        redrawMarkers($scope.data);
      });

      var bounds = null;

      $scope.boundsChanged = function() {
        $scope.$apply(function() {$scope.params.bounds = $scope.myMap.getBounds();});

        if ((!bounds && $scope.myMap.getBounds()) || options.alwaysRedraw) {
          bounds = $scope.myMap.getBounds();
          redrawMarkers($scope.data);
        }
      };

      $timeout(function() {
        google.maps.event.addListener($scope.myMap, 'bounds_changed', function() {
          $scope.boundsChanged();
        });
      });

      $scope.$watch('params.filter', function(f) {
        if (f) {
          redrawMarkers($scope.data);
        }
      }, true);



      var selectedGradient = [
        'rgba(0, 255, 255, 0)',
        'rgba(0, 255, 255, 1)',
        'rgba(0, 191, 255, 1)',
        'rgba(0, 127, 255, 1)',
        'rgba(0, 63, 255, 1)',
        'rgba(0, 0, 255, 1)',
        'rgba(0, 0, 223, 1)',
        'rgba(0, 0, 191, 1)',
        'rgba(0, 0, 159, 1)',
        'rgba(0, 0, 127, 1)',
        'rgba(63, 0, 91, 1)',
        'rgba(127, 0, 63, 1)',
        'rgba(191, 0, 31, 1)',
        'rgba(255, 0, 0, 1)'
      ];

      var deselectedGradient = "rgba(102, 255, 0, 0);rgba(102, 255, 0, 1);rgba(147, 255, 0, 1);rgba(193, 255, 0, 1);rgba(238, 255, 0, 1);rgba(244, 227, 0, 1);rgba(249, 198, 0, 1);rgba(255, 170, 0, 1);rgba(255, 113, 0, 1);rgba(255, 57, 0, 1);rgba(255, 0, 0, 1)".split(";");

      var dHeatmap;
      var sHeatmap;
      var initHeatmaps = function() {
        sHeatmap = new google.maps.visualization.HeatmapLayer({
          data: []
        });

        dHeatmap= new google.maps.visualization.HeatmapLayer({
          data: []
        });

        dHeatmap.setMap($scope.myMap);
        sHeatmap.setMap($scope.myMap);

        sHeatmap.setOptions({
          gradient: selectedGradient
        });

        dHeatmap.setOptions({
          gradient: deselectedGradient
        });

      };

      var selMC;
      var deselMC;

      var redrawMarkers = function(data) {
        //init heatmaps
        if (!dHeatmap || !sHeatmap) {
          initHeatmaps();
        }

        //init drag zoom
        if ($scope.myMap.getDragZoomObject() === undefined) {
          console.log("enable zoom");
          $scope.myMap.enableKeyDragZoom();
          var dz = $scope.myMap.getDragZoomObject();
//          google.maps.event.addListener(dz, 'activate', function () {
//            console.log('KeyDragZoom Activated');
//          });
//          google.maps.event.addListener(dz, 'deactivate', function () {
//            console.log('KeyDragZoom Deactivated');
//          });
//          google.maps.event.addListener(dz, 'dragstart', function (latlng) {
//            console.log('KeyDragZoom Started: ' + latlng);
//          });
//          google.maps.event.addListener(dz, 'drag', function (startPt, endPt) {
//            console.log('KeyDragZoom Dragging: ' + startPt + endPt);
//          });
          google.maps.event.addListener(dz, 'dragend', function (bnds) {
            console.log('KeyDragZoom Ended: ', bnds);
            var ne = bnds.getNorthEast();
            var sw = bnds.getSouthWest();
            // TODO: broken at the international date line or the poles - FIXME
            $scope.$apply(function() {
              Array.prototype.splice.apply($scope.params.filter[options.latKey], [0, $scope.params.filter[options.latKey].length].concat([[Math.min(sw.lat(), ne.lat()), Math.max(sw.lat(), ne.lat())]]));
              Array.prototype.splice.apply($scope.params.filter[options.lngKey], [0, $scope.params.filter[options.lngKey].length].concat([[Math.min(sw.lng(), ne.lng()), Math.max(sw.lng(), ne.lng())]]));
            });
            redrawMarkers($scope.data);
          });
        }

        // todo: assumes a single selection
        function filterContains(filter, point) {
          return !_.isEmpty(filter[options.latKey]) &&
              !_.isEmpty(filter[options.lngKey]) &&
              filter[options.lngKey][0][0] <= point.lng() &&
              point.lng() <= filter[options.lngKey][0][1] &&
              filter[options.latKey][0][0] <= point.lat() &&
              point.lat() <= filter[options.latKey][0][1];
        }

        if (data) {
          var selectedLocations = _(data).filter(function(d) {
                if (!(d[options.latKey] && d[options.lngKey])) {
                  return false;
                }
                var l = new google.maps.LatLng(d[options.latKey], d[options.lngKey]);
                return $scope.myMap.getBounds() &&
                    ($scope.myMap.getBounds().contains(l) || !options.weightsBasedOnBounds) &&
                    filterContains($scope.params.filter, l);

              }).map(function(d) {
                  return {location: new google.maps.LatLng(d[options.latKey], d[options.lngKey]), weight: d[options.weightKey] || 1};
              }).value();

          var deselectedLocations = _(data).filter(function(d) {
            if (!(d[options.latKey] && d[options.lngKey])) {
              return false;
            }
            var l = new google.maps.LatLng(d[options.latKey], d[options.lngKey]);
            return $scope.myMap.getBounds() && ($scope.myMap.getBounds().contains(l) || !options.weightsBasedOnBounds) && !filterContains($scope.params.filter, l);
          }).map(function(d) {
                  return {location: new google.maps.LatLng(d[options.latKey], d[options.lngKey]), weight: d[options.weightKey] || 1};
              }).value();


          if (options.heatmap) {

            var selPointArray = new google.maps.MVCArray(selectedLocations);
            var deselPointArray = new google.maps.MVCArray(deselectedLocations);

            sHeatmap.setData(selPointArray);
            dHeatmap.setData(deselPointArray);

          } else {
            $scope.selectedMarkers = []; //TODO: remove old markers
            $scope.deselectedMarkers = []; //TODO: remove old markers
            if (options.cluster) {
              _.each(selectedLocations, function(l) {
                $scope.selectedMarkers.push(new google.maps.Marker({
                  position: l.location,
                  title: String(l.weight)
                }));
              });

              _.each(deselectedLocations, function(l) {
                $scope.deselectedMarkers.push(new google.maps.Marker({
                  position: l.location,
                  title: String(l.weight)
                }));
              });
              if (selMC) {
                selMC.clearMarkers();
              }
              selMC = new MarkerClusterer($scope.myMap, $scope.selectedMarkers);
              var styles = selMC.getStyles();
              _.each(styles, function(style) {
                style.fontWeight = 900;
                style.textSize = 18;
//                style.textColor = 'red';
                style.textDecoration = 'underline';
              });
              selMC.setStyles(styles);
              selMC.setZoomOnClick(false);

              if (deselMC) {
                deselMC.clearMarkers();
              }
              deselMC = new MarkerClusterer($scope.myMap, $scope.deselectedMarkers);
              deselMC.setZoomOnClick(false);
            } else {
              _.each(selectedLocations, function(l) {
                $scope.myMarkers.push(new google.maps.Marker({
                  map: $scope.myMap,
                  position: l.location
                }));
              });
              _.each(deselectedLocations, function(l) {
                $scope.myMarkers.push(new google.maps.Marker({
                  map: $scope.myMap,
                  position: l.location
                }));
              });
            }
          }

        }
      };

      $scope.$watch('data', function(data) {
        redrawMarkers(data);
      });

      $scope.mapOptions = options.mapOptions;

//      $scope.addMarker = function($event, $params) {
//        $scope.myMarkers.push(new google.maps.Marker({
//          map: $scope.myMap,
//          position: $params[0].latLng
//        }));
//      };
//
//      $scope.setZoomMessage = function(zoom) {
//        $scope.zoomMessage = 'You just zoomed to '+zoom+'!';
//        console.log(zoom,'zoomed')
//      };
//
//      $scope.openMarkerInfo = function(marker) {
//        $scope.currentMarker = marker;
//        $scope.currentMarkerLat = marker.getPosition().lat();
//        $scope.currentMarkerLng = marker.getPosition().lng();
//        $scope.myInfoWindow.open($scope.myMap, marker);
//      };
//
//      $scope.setMarkerPosition = function(marker, lat, lng) {
//        marker.setPosition(new google.maps.LatLng(lat, lng));
//      };
//
//      $scope.panToMarker = function(marker) {
//        $scope.myMap.panTo(marker.getPosition());
//      }
    }]
  };
}]);
