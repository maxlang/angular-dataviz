
angular.module('dataviz.directives', []);
angular.module('dataviz', ['dataviz.directives']);

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
          var weekGrouping = 1;
          var N_ANNOTATIONS_SHOWN_PER_GROUP = 5;
          var annotationTextHeight = 15;
          var annotationLines = 2;
          var MAX_TITLE_LEN = 18;
          var ANNOTATION_Y_SPACING = 5;
          var ANNOTATION_COLS = 8;

          var chartWidth = width - yAxisPx;
          var chartHeight = height - xAxisPx;

          var size = getOption('cellSizePx');
          var border = getOption('cellBorderPx');
          var totalCellSize = size + border;

          var columns = Math.floor(chartWidth/(totalCellSize));

          var annotations = scope.params.annotations || [];

          // current week counts as an extra column
          var start = moment().subtract('weeks',columns - 1).startOf('week');
          scope.start = start;
          var end = moment().startOf('day');
          // current day counts as an extra day, don't count partial days
          var days = end.diff(start,'days', false) + 1;

          var maxCount = _.max(data, function(d) {return d.value;}).value;

          function weeksFromStart(date) {
            return moment(date).diff(start, 'weeks');
          }

          var annotationsByWeek = _(annotations)
                .groupBy(function(a) {
                  return Math.floor(weeksFromStart(a.date) / weekGrouping);
                })
                .map(function(anns, week) {
                  return {
                    week: parseInt(week, 10), // TODO why does this turn into string?
                    annotations: _(anns).sortBy('date').take(N_ANNOTATIONS_SHOWN_PER_GROUP).value()
                  };
                })
                .value();

          var weekCounts = {};
          annotationsByWeek.forEach(function(a) {
            weekCounts[a.week] = (weekCounts[a.week] || 0) + a.annotations.length;
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

          function weekXOffset(week) {
            return week * totalCellSize;
          }

          function dateXOffset(date) {
            return weekXOffset(weeksFromStart(date));
          }

          var maxNumAnnotationsInWeek;
          if (_.isEmpty(annotationsByWeek)) {
            maxNumAnnotationsInWeek = 1;
          } else {
            var m = _.max(annotationsByWeek, function(x) {
              return x.annotations.length;
            });
            maxNumAnnotationsInWeek = m.annotations.length;
          }

          var annotationHeight = annotationLines * annotationTextHeight + ANNOTATION_Y_SPACING;
          var maxAnnotationLineLength = annotationHeight * maxOverlapHeight + 20;

          function annotationClass(ann, i) {
            return 'annotation' + (i % 3);
          }

          var annotationSetG = scope.svg
                .append("g")
                .attr('transform', 'translate(0, ' + maxAnnotationLineLength + ')')
                .selectAll("text")
                .data(annotationsByWeek)
                .enter()
                .append('g')
                .attr('class', annotationClass)
                .attr('transform', function(ann) {
                  var xOffset = weekXOffset(ann.week) * weekGrouping;
                  return 'translate(' + xOffset + ', 0)';
                });

          annotationSetG
            .append("line")
            .attr("y1", function(d) {
              var o = overlapCount[d.week] || 0;
              return - o * annotationHeight;
            })
            .attr("y2", -5)
            .attr('class', annotationClass);

          annotationSetG
            .append('circle')
            .attr('r', 1)
            .attr('class', annotationClass);

          var annotationTextSetG = annotationSetG
                .append('g')
                .attr('transform', function(ann) {
                  var o = overlapCount[ann.week] || 0;
                  var yOffset = - (o - ann.annotations.length + 1) * annotationHeight;
                  return 'translate(0, ' + yOffset + ')';
                });

          var annotationG = annotationTextSetG
                .selectAll("text")
                .data(function(d) {
                  return d.annotations;
                })
                .enter()
                .append('g')
                .attr('transform', function(ann, i) {
                  var vOffset = -annotationHeight * i;
                  return 'translate(5, ' + vOffset + ')';
                });

          // Title.
          annotationG
            .append("svg:a")
            .attr('xlink:href', function(d) {
              return d.path;
            })
            .append('text')
            .attr('font-size', 13)
            .text(function(d) {
              return truncate(d.title, MAX_TITLE_LEN); // TODO (em) truncate via styling instead of code.
            })
            .attr('class', 'annotationTitle')
            .attr("dy",".9em");

          // Date.
          annotationG
            .append('g')
            .attr('class', 'annotationDate')
            .append("svg:text")
            .text(function(d) {
              return moment(d.date).format('MMMM D, YYYY');
            })
            .attr('class', 'annotationDate')
            .attr('font-size', 10)
            //.style('fill', '#bbb')
            .attr('y', annotationTextHeight)
            .attr("dy",".9em");

          //TODO: add mouse events

          // month axis
          //TODO: check this math (might need special case for small widths?)
          var months = Math.round(end.diff(start.clone().startOf("month"),'months', true));

          var calendarG;
          if (_.isEmpty(annotations)) {
            calendarG = scope.svg.append("g")
              .append('g');
          } else {
            calendarG = scope.svg.append("g")
              .attr('transform', 'translate(0, ' + (maxAnnotationLineLength - 5) + ')')
              .append('g');
          }

          calendarG
            .append("g")
            .attr("width", "100%")
            .attr("class", "x axis")
            .selectAll("text").data(_.range(months)).enter().append("svg:text")
            .text(function(d) {
              return end.clone().subtract("months", d).format("MMM");
            })
            .attr("x", function(d) {
              return width - 8 - 2*totalCellSize +
                (end.clone().subtract("months", d).diff(end, "weeks")) * totalCellSize;
            })
            .attr("fill", "black")
            .attr("dy",".9em");

          var weeks = end.diff(start.clone().startOf("week"), 'weeks', false) + 1;

          calendarG
            .append("g").attr("width", "100%").attr("class", "week-start")
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
          calendarG.append("g").attr("height", "100%").attr("class", "y axis")
            .selectAll("text").data(_.range(7)).enter().append("text")
            .text(function(d) {
              return moment().days(d).format("ddd");
            })
            .attr("dy",".9em")
            .attr("y", function(d) {return d * totalCellSize + xAxisPx;});


          // actual chart
          scope.chart = calendarG.append("g")
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
