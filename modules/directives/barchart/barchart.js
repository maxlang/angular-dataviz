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

        if (getOption('autoMargin')) {
          margins.left = 20 + _.max(_.map(_.pluck(data, 'key'), function(key) {
            var size = measure(key, "y axis").width;
            return size;
          })) || 20;
          margins.left = margins.left === -Infinity ? 0 : margins.left;
        }

        var w = width - margins.left - margins.right;
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
            .attr("transform", "translate(" + margins.left + ", " + (margins.top + h) + ")")
            .call(d3.svg.axis().scale(x).orient("bottom")
                .tickSize(-height, 0, 0)
                .tickFormat("")
            );

        var g = svg.append('g')
            .attr('width', w)
            .attr('height', h)
            .attr('transform', 'translate(' + margins.left + ', ' + margins.top + ')');

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
            .attr("transform", "translate(" + margins.left + ", " + (h + margins.top) + ")")
            .call(xAxis);

        var yaxis =   svg.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(" + margins.left + ", " + (margins.top) + ")")
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
