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
        'margins': {top:10, left: 20, bottom:20, right: 15},
        'autoMargin': true,
//        'domain' : [],
        'range' : 'auto',
        'bars' : null
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
        y = d3.scale.ordinal().domain(d).rangeRoundBands([h, 0],0.1,0);

        if(r === 'auto') {
          var xMax = data.length > 0 ? data[0].value : 1;
          x = d3.scale.linear().domain([0, xMax]).range([0, w]);
        } else {
          x = d3.scale.linear().domain(r).range([0, w]);
        }


//              scope.brush.x(x);

        var xAxis = d3.svg.axis().scale(x).orient("bottom");
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


        function setSelectedLabels(labels) {
          var args = [0, scope.params.filter.length].concat(labels);
          Array.prototype.splice.apply(scope.params.filter, args);
        }


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
              if( _.contains(scope.params.filter, d.key) ) {
                if(scope.shifted) {
                  setSelectedLabels(_.without(scope.params.filter, d.key));
                } else {
                  g.selectAll('rect.selected').classed('selected', false);
                  setSelectedLabels([]);
                }
                d3.select(this).classed('selected', false);
              } else {
                if(scope.shifted) {
                  scope.params.filter.push(d.key);
                  setSelectedLabels(scope.params.filter);
                } else {
                  g.selectAll('rect.selected').classed('selected', false);
                  setSelectedLabels([d.key]);
                }
                d3.select(this).classed('selected', true);
              }
            });


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
