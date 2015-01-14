/**
 * @ngdoc directive
 * @name dataviz.directives:aBarchart
 * @param {Array<KVPair>} data barchart data
 * @param {null} data2 unused
 * @param {ConfigObject} params object with config params
 * @param {null} filter2 unused
 * @restrict E
 * @element a-barchart
 * @scope
 *
 * @description
 * Creates a barchart.
 *
 * @example
 <example module="test">
  <file name="index.html">
    <div ng-controller="dataController">
      data: {{data}}
      viz: <a-barchart data="data" params="params" data2="[]" filter2="[]"></a-barchart>
    </div>
  </file>
 <file name="script.js">
  angular.module('test',['dataviz'])
    .controller('dataController', function($scope) {
      $scope.data = [{key: 1, value:1}, {key:2, value:2}];
      $scope.params = {
        options: {},
        filter: []
      };
    });
 </file>
 </example>
 */

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
        'total': 'auto',
        'sorted': true
      };

      //FROM: http://stackoverflow.com/questions/14605348/title-and-axis-labels
      function measure(text, classname) {
        if(!text || text.length === 0) return {height: 0, width: 0};

        var container = d3.select(element[0]).append('svg').attr('class', classname);
        container.append('text').attr({x: -1000, y: -1000}).text(text);

        var bbox = container.node().getBBox();
        container.remove();

        return {height: bbox.height, width: Math.min(bbox.width,100)};
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
              .attr('class', function(d, i) { return "bar-" + i + " _" + d.key + "-color";})
              .classed('bar d1', true)
              .attr('y', function(d, i) {
                return y(d.key);
              })
              .attr('x', 0)
              .attr('width', function(d, i) { return  (d.values[0] ? x(d.values[0]) : 0);})
              .attr('height', Math.abs(y.rangeBand()))
              .attr('stroke-width', getOption('padding')+'px')
              .append("title")
              .text(function(d) { return d.key + ":" + d.values[0]; });

          rectHolder.selectAll('rect.d2').data(function(d) { return [d];}).enter().append('rect')
              .classed('bar d2', true)
              .attr('y', function(d, i) { return y(d.key);})
              .attr('x', function(d) { return (d.values[0] ? x(d.values[0]) : 0);})
              .attr('width', function(d, i) { return  (d.values[1] ? x(d.values[1]) : 0);})
              .attr('height', Math.abs(y.rangeBand()))
              .attr('stroke-width', getOption('padding')+'px')
              .append("title")
              .text(function(d) { return d.key + ":" + d.values[1]; });

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
              })
              .append("title")
              .text(function(d) { return d.key + ":" + d.value; });

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

        var logOn = false;

        var compare = function(a,b) {
          if (logOn) {
            console.log("A", a);
            console.log("B", b);
            console.log("result", a > b ? 1 : (a === b ? 0 : -1));
          }
          if (a!==undefined && b===undefined) {
            return 1;
          } else if (a===undefined && b!==undefined) {
            return -1;
          } else if (a===b) {
            return 0;
          }

          return a > b ? 1 : -1;
        };

        var numKeys = true;

        if (getOption('sorted')) {

          //sort the data
          augmentedData.sort(function(a, b) {
            var ak = parseFloat(a.key);
            var bk = parseFloat(b.key);

            if (!_.isNaN(ak) && !_.isNaN(b.key)) {
              return compare(ak, bk);
            }
            numKeys = false;
            if (a[maxKey] === b[maxKey]) {
              if (_.max(a.data,'value').value === _.max(b.data, 'value').value) {
                return -compare(a.key,b.key);
              } else {
                return compare(_.max(a.data,'value').value, _.max(b.data,'value').value);
              }
            }
            return compare(a[maxKey],b[maxKey]);
          });
        }


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

        // we only want to take the top 20 - TODO: support more/better alg for selecting top
        sortedLabels = _.take(sortedLabels, 20);

        var sortedPriority = _.invert(sortedLabels);

        logOn = true;

        //TODO: inefficient to sort twice :(
        if (getOption('sorted')) {

          //resort using the new bar stacking order
          augmentedData.sort(function(a, b) {
            console.log("A.key", a.key);
            console.log("B.key", b.key);

            if (numKeys) {
              var ak = parseFloat(a.key);
              var bk = parseFloat(b.key);
              return compare(ak, bk);
            }
            if (a[maxKey] === b[maxKey]) {
              for (var i=0; i<sortedLabels.length;i++) {
                var aval = _.find(a.data,{key:sortedLabels[i]});
                var bval = _.find(b.data,{key:sortedLabels[i]});
                aval = aval && aval.value;
                bval = bval && bval.value;

                if (aval !== bval) {
                  return compare(aval, bval);
                }
              }
              return -compare(a.key,b.key);

            }
            return compare(a[maxKey],b[maxKey]);
          });
        }


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


        //from : https://github.com/mbostock/d3/blob/master/lib/colorbrewer/colorbrewer.js
        var blues = {
          3: ["#deebf7","#9ecae1","#3182bd"],
            4: ["#eff3ff","#bdd7e7","#6baed6","#2171b5"],
            5: ["#eff3ff","#bdd7e7","#6baed6","#3182bd","#08519c"],
            6: ["#eff3ff","#c6dbef","#9ecae1","#6baed6","#3182bd","#08519c"],
            7: ["#eff3ff","#c6dbef","#9ecae1","#6baed6","#4292c6","#2171b5","#084594"],
            8: ["#f7fbff","#deebf7","#c6dbef","#9ecae1","#6baed6","#4292c6","#2171b5","#084594"],
            9: ["#f7fbff","#deebf7","#c6dbef","#9ecae1","#6baed6","#4292c6","#2171b5","#08519c","#08306b"],
          10: d3.scale.category10().range()
        };

        _.times(10, function(i) {
          blues[i + 11] = d3.scale.category20().range();
        });


        //TODO: make configurable
        var color = d3.scale.ordinal().domain(sortedLabels).range(blues[Math.max(Math.min(sortedLabels.length,20),3)].reverse());
//        opacity = d3.scale.ordinal().range([
//          0.95,0.8,0.65,0.5,0.35,0.1
//        ]);

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
            .attr('class', function(d, i) { return "bar-" + i + " _" + d.parent.key + "-color" + " _" + d.key + "-color";})
            .classed('bar', true)
            .attr('style', function(d, i) { return "fill:" + color(d.key); })
            .attr('y', function(d, i) { return y(d.parent.key);})
            .attr('x', function(d, i) {
              if (!(d.key in sortedPriority)) {
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
            .attr('stroke-width', getOption('padding')+'px')
            .append('title')
            .text(function(d) {
              return d.parent.key + ", " + d.key + " : " + d.value;
            });


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
            .attr('style', function(d) { return "fill:" + color(d); })
            .attr('class', function(d, i) { return "bar-" + i + " _" + d + "-color";});

        var nonTextWidth = legendSquareSizePx + (legendPadding + legendPaddingLeft) + legendSpacing;
        var textWidth = Math.min((legendDims.width - nonTextWidth), (width - nonTextWidth));

        var tc = d3.rgb(getOption('textColor'));
        var rgba = [tc.r, tc.g, tc.b, getOption('fillOpacity')];

//        var text = k.append("foreignObject")
//            .attr("x", legendSquareSizePx + legendPadding + legendSpacing)
//            .attr("y", 0)
//            .attr('width', textWidth)
//            .attr('height', '1.2em')
//            .append("xhtml:div")
//            .html(function(d, i) { return "<div style='width:" + textWidth + "px; height:1.2em; overflow:hidden; text-overflow:ellipsis;color: rgba(" + rgba.join(',') + ");white-space:nowrap'>" + d + "</div>";});
//
//        keys.transition().duration(300)
//            .attr("transform", function(d, i) { /*console.log(d,i);*/ return "translate(" + legendPaddingLeft + "," + (legendPadding + (i * (legendSpacing + legendSquareSizePx))) + ")"; })
//            .call(function() {
//              //TODO: incorporate into transition better
//              $(this[0]).width(textWidth).find('foreignObject').attr('class','legend-text').attr('width', textWidth).find('div').width(textWidth).css('color', "rgba(" + rgba.join(',') + ")");
//            });

//        var text = k.append("text")
//            .attr("x", legendSquareSizePx + legendPadding + legendSpacing)
//            .attr("y", 0)
//            .attr('width', textWidth)
//            .attr('height', '1.2em')
//            .attr('fill',"rgba(" + rgba.join(',') + ")");
//            .append("xhtml:div")
//            .html(function(d, i) { return "<div style='width:" + textWidth + "px; height:1.2em; overflow:hidden; text-overflow:ellipsis;color: rgba(" + rgba.join(',') + ");white-space:nowrap'>" + d + "</div>";});


        var text = k.append("text")
            .attr("x", legendSquareSizePx + legendPadding + legendSpacing)
            .attr("y", '1em')
            .attr('width', textWidth)
            .attr('height', '1.2em')
            .attr('fill', "rgba(" + rgba.join(',') + ")")
            .text(function(d, i) { return  d ;});


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