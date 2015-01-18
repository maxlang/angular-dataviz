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
