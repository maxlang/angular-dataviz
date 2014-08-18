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
