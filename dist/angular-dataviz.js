
angular.module('dataviz.directives', ['ui.map']);
angular.module('dataviz', ['dataviz.directives']);

angular.module('dataviz.directives').directive('barchart', [function() {
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
            'margins': {top:10, left: 10, bottom:20, right: 10},
            'domain' : 'auto',
            'range' : 'auto',
            'bars' : null,
            'realtime' : true,
            'snap' : false
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

          function setBrush(extent) {
            if (!extent) {
              scope.brush.clear();
            } else {
              scope.brush.extent(extent);
              scope.brush(d3.select(this)); //might cause infinite loop?
            }
          }

          $(document).on('keyup keydown', function(e){scope.shifted = e.shiftKey; return true;} );

          scope.brush = d3.svg.brush()
              .on("brush", brushed)
              .on("brushend", brushend);

          function brushed() {
            var extent = scope.brush.extent();
            if (getOption('snap') && extent && extent.length === 2) {
              var domain = getOption('domain');
              var buckets = getOption('bars');
              var range = domain[1] - domain[0];
              var step = range/buckets;
              extent = [Math.round(extent[0]/step) * step, Math.round(extent[1]/step) * step];
              scope.brush.extent(extent);
              scope.brush(d3.select(this)); //apply change
            }

            if (getOption('realtime')) {
              setSelected(extent);
            }
          }
          function brushend() {
            setSelected(scope.brush.extent());
          }

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

              var barWidth = (w/bars) - barPadding;

              var svg = d3.select(element[0]).select('svg');

              var g = svg.append('g')
                  .attr('width', w)
                  .attr('height', h)
                  .attr('transform', 'translate(' + margins.left + ', ' + margins.top + ')');

              var x;
              var y;

              var d = getOption('domain');
              var r = getOption('range');

              if(d === 'auto') {

                var xMax = _.max(_.pluck(data, 'key'));
                var xMin = _.min(_.pluck(data, 'key'));
                x = d3.scale.linear().domain([xMin, xMax]).range([0, w]);
              } else {
                x = d3.scale.linear().domain(d).range([0, w]);
              }

              if(r === 'auto') {
                var yMax = data[0].value;
                //var yMin = data[data.length - 1].value;
                y = d3.scale.linear().domain([0, yMax]).range([h, 0]);
              } else {
                y = d3.scale.linear().domain(r).range([h, 0]);
              }




              scope.brush.x(x);

              var xAxis = d3.svg.axis().scale(x).orient("bottom");


              g.selectAll('rect').data(data).enter().append('rect')
                  .attr('x', function(d, i) { return x(i);})
                  .attr('y', function(d, i) { return y(d.value); })
                  .attr('width', barWidth)
                  .attr('height', function(d, i) { return h - y(d.value); })
                  .attr('stroke-width', getOption('padding')+'px');


              var axis =   svg.append("g")
                  .attr("class", "x axis")
                  .attr("transform", "translate(" + margins.left + ", " + (h + margins.top) + ")")
                  .call(xAxis);

              var brush = g.append("g")
                  .attr("class", "x brush")
                  .call(scope.brush)
                  .selectAll("rect")
                  .attr("y", -6)
                  .attr("height", h+8);

            }

            scope.$watch('data',function(counts) {
              if(counts!==undefined && counts!==null) {
                drawChart(counts);
              }
            }, true);

            scope.$watch('params.filter', function(f) {
              console.log('setting brush');
              setBrush(f[0]);
            }, true);

            scope.$watch('params.options', function() {
              drawChart(scope.data);
            }, true);

        }
    };
}]);

(function() {
  'use strict';

  //TODO: add prefixes to directives
  //TODO: fix references to flexbox in css

  angular.module('dataviz.directives').directive('blockCalendar', [function() {
    function isNullOrUndefined(x) {
      return _.isNull(x) || _.isUndefined(x);
    }

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
          cellSizePx: 13,
          cellBorderPx: 2,
          widthPx: 586, //TODO:
          heightPx: 106
        };

        //TODO: better way to handle options, esp option merging
        function getOption(optionName) {
          return (scope.params && scope.params.options && scope.params.options[optionName]) ||
            defaultOptions[optionName];
        }

        //TODO: standardize how filters are changed (don't create a new object) - use extend?
        function setSelectedRanges(ranges) {
          scope.$apply(function () {
            var args = [0, scope.params.filter.length].concat(ranges);
            Array.prototype.splice.apply(scope.params.filter, args);
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
          var yAxisPx = 23;
          var xAxisPx = 25;

          var chartWidth = width - yAxisPx;
          var chartHeight = height - xAxisPx;

          var size = getOption('cellSizePx');
          var border = getOption('cellBorderPx');
          var totalCellSize = size + border;

          var columns = Math.floor(chartWidth/(totalCellSize));

          // current week counts as an extra column
          var start = moment().subtract('weeks',columns - 1).startOf('week');
          scope.start = start;
          var end = moment().startOf('day');
          // current day counts as an extra day, don't count partial days
          var days = end.diff(start,'days', false) + 1;

          var maxCount = _.max(data, function(d) {return d.value;}).value;

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

          //TODO: add mouse events

          // month axis
          //TODO: check this math (might need special case for small widths?)
          var months = Math.round(end.diff(start.clone().startOf("month"),'months', true));

          scope.svg.append("g").attr("width", "100%").attr("class", "x axis")
            .selectAll("text").data(_.range(months)).enter().append("svg:text")
            .text(function(d) {
              return end.clone().subtract("months", d).format("MMM");
            })
            .attr("x", function(d) {
              return width - 8 - 2*totalCellSize +
                (end.clone().subtract("months", d).diff(end, "weeks")) * totalCellSize;
            })
            .attr("y", 0)
            .attr("fill", "black")
            .attr("dy",".9em");
          //weeks

          var weeks = end.diff(start.clone().startOf("week"),'weeks', false) + 1;

          scope.svg.append("g").attr("width", "100%").attr("class", "week-start")
            .selectAll("text").data(_.range(weeks)).enter().append("svg:text")
            .text(function(d) {
              return start.clone().add("weeks", d).format("D");
            })
            .attr("x", function(d) {
              return 5 + yAxisPx + d * totalCellSize;
            })
            .attr("y", 15)
            .attr("dy",".9em");     //TODO: why is this necessary


          // Weekday axis
          scope.svg.append("g").attr("height", "100%").attr("class", "y axis")
            .selectAll("text").data(_.range(7)).enter().append("text")
            .text(function(d) {
              return moment().days(d).format("ddd");
            })
            .attr("dy",".9em")
            .attr("x", 0)
            .attr("y", function(d) {return d * totalCellSize + xAxisPx;});


          // actual chart
          scope.chart = scope.svg.append("g")
            .attr("transform", "translate(" + yAxisPx + "," + xAxisPx + ")");

          scope.chart.selectAll("rect").data(_.range(days)).enter().append("svg:rect")
            .classed("day", true)
            .attr("width", size)
            .attr("height", size)
            .attr("stroke-width",border)
            .attr("x", function(d) { return Math.floor(d / 7) * totalCellSize;})
            .attr("y", function(d) { return Math.floor(d % 7) * totalCellSize;})

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
                  setSelectedRanges([[start.clone().add("days", d), start.clone().add("days", d + 1)]]);
                }
              } else {
                // if lots of cells are selected, always select (TODO: does this behavior make sense?)
                //TODO: add a good way to deselect esp for ranges
                scope.chart.selectAll("rect.day").classed("selected", false);
                rect.classed("selected", true);
                var rangeStartDate = start.clone().add("days", d);
                var rangeEndDate = start.clone().add("days", d + 1);
                var ranges = [[rangeStartDate, rangeEndDate]];
                setSelectedRanges(ranges);
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
            selectRanges(scope.params.filter);
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
            selectRanges(scope.params.filter);
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
    }).directive('widget', function() {
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

//TODO: add prefixes to directives


//TODO: fix references to flexbox in css

angular.module('dataviz.directives').directive('sankey', [function() {
  return {
    restrict: 'E',
    scope: {
      //TODO: DOCUMENT BETTER
      'data': '=',   // expects an array of objects with a key and a value
      'params' : '='   // a parameters object with the current filters, options, and highlighted data
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
            format = function(d) { return formatNumber(d) + " candidates"; },
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
              .sort(function(a, b) { return b.dy - a.dy; });

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

          $(document).on('keyup keydown', function(e){
            scope.shifted = e.shiftKey; return true;}
          );

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
      'params' : '='
    },
    template: '<div id="map_canvas" ui-map="myMap" class="map" ui-options="mapOptions"' +
//        'ui-event="{}"' +
      ' ui-event="{\'map-bounds_changed\': \'boundsChanged($event, $params)\', \'map-deactivate\': \'dragEnd($event, $params)\' }"' +
//    'ui-options="mapOptions">' +
    '></div>',
    'controller': ['$scope', function ($scope) {
      $scope.myMarkers = [];
      $scope.myMap = {};

      var defaultOptions = {
        heatmap : true,
        cluster : true,
        mapOptions: {
          center: new google.maps.LatLng(39.232253,-98.539124),
          zoom: 4,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        }
      };

      var options = defaultOptions;

      $scope.$watch('params.options', function(o) {
        var options = defaultOptions;
        _.extend(options, o);
        $scope.mapOptions = options.mapOptions;
        redrawMarkers($scope.data);
      });

      $scope.boundsChanged = function() {
        redrawMarkers($scope.data);
      };



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
            $scope.params.filter[0] = bnds;
            redrawMarkers($scope.data);
          });
        }

        if (data) {
          var selectedLocations = _(data).filter(function(d) {
                if (!(d.lat && d.lng)) {
                  return false;
                }
                var l = new google.maps.LatLng(d.lat, d.lng);
                return $scope.myMap.getBounds() && $scope.myMap.getBounds().contains(l) && $scope.params.filter[0] && $scope.params.filter[0].contains(l);
              }).map(function(d) {
                if (d.lat && d.lng) {
                  return {location: new google.maps.LatLng(d.lat, d.lng), weight: d.weight || 1};
                }
              }).value();

          var deselectedLocations = _(data).filter(function(d) {
            if (!(d.lat && d.lng)) {
              return false;
            }
            var l = new google.maps.LatLng(d.lat, d.lng);
            return $scope.myMap.getBounds() && $scope.myMap.getBounds().contains(l) && (!$scope.params.filter[0] || !$scope.params.filter[0].contains(l));
          }).map(function(d) {
                if (d.lat && d.lng) {
                  return {location: new google.maps.LatLng(d.lat, d.lng), weight: d.weight || 1};
                }
              }).value();


          if (options.heatmap) {

            var selPointArray = new google.maps.MVCArray(selectedLocations);
            var deselPointArray = new google.maps.MVCArray(deselectedLocations);

            sHeatmap.setData(selPointArray);
            dHeatmap.setData(deselPointArray);

          } else {
            $scope.myMarkers = []; //TODO: remove old markers
            if (options.cluster) {
              var mc = new MarkerClusterer($scope.myMap);
              _.each(locations, function(l) {
                $scope.myMarkers.push(new google.maps.Marker({
                  //map: $scope.myMap,
                  position: l.location
                }));
              });
              mc.addMarkers($scope.myMarkers);
            } else {
              _.each(locations, function(l) {
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