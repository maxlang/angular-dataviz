angular.module('dataviz.directives').directive('betterBarchart', [function() {
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
        'heightPx' : 286,
        'padding': 2,
        'margins': {top:10, left: 30, bottom:20, right: 10},
//        'domain' : [],
        'range' : 'auto',
        'bars' : null
      };



      //TODO: better way to handle options, esp option merging
      function getOption(optionName) {
        return _.defaults(scope.params.options, defaultOptions)[optionName];
        //return (scope.params && scope.params.options && !_scope.params.options[optionName]) || defaultOptions[optionName];
      }


      //INIT:
      element.append("<svg></svg>");

      function setSelected(extent) {
        scope.$apply(function () {
          scope.params.filter.splice(0, scope.params.filter.length, extent);
        });
      }

//          function setBrush(extent) {
//            if (!extent) {
//              scope.brush.clear();
//            } else {
//              scope.brush.extent(extent);
//            }
//            var brush = d3.select(element[0]).select('.x.brush');
//            scope.brush(brush);
//          }

      $(document).on('keyup keydown', function(e){scope.shifted = e.shiftKey; return true;} );

//          scope.brush = d3.svg.brush()
//              .on("brush", brushed)
//              .on("brushend", brushend);

//          function brushed() {
//            var extent = scope.brush.extent();
//            if (getOption('snap') && extent && extent.length === 2) {
//              var domain = getOption('domain');
//              var buckets = getOption('bars');
//              var range = domain[1] - domain[0];
//              var step = range/buckets;
//              extent = [Math.round(extent[0]/step) * step, Math.round(extent[1]/step) * step];
//              scope.brush.extent(extent);
//              scope.brush(d3.select(this)); //apply change
//            }
//
//            if (getOption('realtime')) {
//              setSelected(extent);
//            }
//          }
//          function brushend() {
//            setSelected(scope.brush.extent());
//          }

      function drawChart(data) {

        element.html('');
        element.append("<svg></svg>");


        var width = getOption('widthPx');
        var height = getOption('heightPx');

        element.find("svg").width(width);
        element.find("svg").height(height);

        var margins = getOption('margins');

        var w = width - margins.left - margins.right;
        var h = height - margins.top - margins.bottom;

        var bars = getOption('bars') || data.length;
        var barPadding = getOption('padding');

        var barWidth = (h/bars) - barPadding;

        var svg = d3.select(element[0]).select('svg');

        var g = svg.append('g')
            .attr('width', w)
            .attr('height', h)
            .attr('transform', 'translate(' + margins.left + ', ' + margins.top + ')');

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
        y = d3.scale.ordinal().domain(d).rangeRoundBands([h, 0],0.1,0);

        if(r === 'auto') {
          var xMax = data[0].value;
          x = d3.scale.linear().domain([0, xMax]).range([0, w]);
        } else {
          x = d3.scale.linear().domain(r).range([0, w]);
        }




//              scope.brush.x(x);

        var xAxis = d3.svg.axis().scale(x).orient("bottom");
        var yAxis = d3.svg.axis().scale(y).orient("left");



        g.selectAll('rect').data(data).enter().append('rect')
            .classed('bar', true)
//            .attr('x', function(d, i) { return _.isNumber(d.key) ? x(d.key) : x(i);})
            .attr('y', function(d, i) { return y(d.key);})
            .attr('x', 0)
//            .attr('x', function(d, i) { return x(d.value); })
//            .attr('width', barWidth)
            .attr('width', function(d, i) { return  x(d.value);})
            .attr('height', Math.abs(y.rangeBand()))
//            .attr('height', function (d, i) { return h - y(d.value); })
            .attr('stroke-width', getOption('padding')+'px');


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
          drawChart(counts);
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
          drawChart(scope.data);
        }
      }, true);

    }
  };
}]);