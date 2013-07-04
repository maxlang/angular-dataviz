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

          function dateXOffset(date) {
            var d_ = moment(date);
            var weeksFromStart = d_.diff(start, 'weeks');

            var offset = weeksFromStart * totalCellSize;
            console.log('weeks diff', weeksFromStart, offset);

            return offset;
          }

          var annotationLineLength = 50;
          var annotationTextHeight = 10;

          var annotationG = scope.svg
            .append("g")
            .selectAll("text")
            .data(scope.params.annotations || []);

          var annotationTextG = annotationG
            .enter()
            .append("g");

          annotationTextG
            .append("svg:a")
            .attr('xlink:href', function(d) {
              return d.path;
            })
            .append('text')
            .text(function(d) {
              return d.title;
            })
            .attr("x", function(d) {
              return dateXOffset(d.date);
            })
            .attr("fill", "black")
            .attr("dy",".9em");

          annotationTextG
            .append("svg:text")
            .text(function(d) {
              return d.subtitle;
            })
            .attr("x", function(d) {
              return dateXOffset(d.date);
            })
            .attr('y', annotationTextHeight)
            .attr("fill", "black")
            .attr("dy",".9em");

          annotationTextG
            .append("svg:text")
            .text(function(d) {
              return moment(d.date).format('MMMM D, YYYY');
            })
            .attr("x", function(d) {
              return dateXOffset(d.date);
            })
            .attr('y', annotationTextHeight * 2)
            .attr("fill", "black")
            .attr("dy",".9em");

          annotationG
            .enter()
            .append("line")
            .attr("y1", 0)
            .attr("y2", annotationLineLength)
            .attr("x1", function(d) {
              return dateXOffset(d.date) - 2;
            })
            .attr("x2", function(d) {
              return dateXOffset(d.date) - 2;
            })
            .attr("fill", "black")
            .attr("stroke", "black")
            .attr("dy",".9em");



          //TODO: add mouse events

          // month axis
          //TODO: check this math (might need special case for small widths?)
          var months = Math.round(end.diff(start.clone().startOf("month"),'months', true));

          var calendarG;
          if (_.isEmpty(scope.params.annotations)) {
            calendarG = scope.svg.append("g")
              .append('g');
          } else {
            calendarG = scope.svg.append("g")
              .attr('transform', 'translate(0, ' + annotationLineLength + ')')
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
            .attr("y", 0)
            .attr("fill", "black")
            .attr("dy",".9em");


          //weeks

          var weeks = end.diff(start.clone().startOf("week"), 'weeks', false) + 1;

          console.log('***end', end, start);
          console.log('***start', start);
          console.log('***weeks', weeks);

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
            .attr("x", 0)
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
