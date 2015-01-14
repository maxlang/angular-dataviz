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
          annotationColumns: 8,
          utc:false
        };

        var utcOptionalMoment = function(val) {
          if (getOption('utc')) {
            return moment.utc(val);
          } else {
            return moment(val);
          }
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

          var start = utcOptionalMoment(endTime).subtract('weeks',columns - 1).startOf('week');
          scope.start = start;
          var end = utcOptionalMoment(endTime).startOf('day');
          // current day counts as an extra day, don't count partial days
          var days = end.diff(start,'days', false) + 1;

          var maxCount = _.max(data, function(d) {return d.value;}).value;

          function weeksFromStart(date) {
            return utcOptionalMoment(date).diff(start, 'weeks') + 2;
          }

          var annotationsByWeek = _(annotations)
                .filter(function(a) {
                  var ws = weeksFromStart(a.date);
                  var we = utcOptionalMoment(a.date).diff(end, 'weeks');
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
            })
              .append('title')
              .text(function(d) {return d.title; });


          // Date.
          annotationTextG
            .append('g')
            .attr('class', 'annotation-date')
            .append("svg:text")
            .text(function(d) {
              return utcOptionalMoment(d.date).format('MMMM D, YYYY');
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
              return utcOptionalMoment(endTime).days(d).format("ddd");
            })
            .attr("y", function(d) {
              return d * totalCellHeight + xAxisHeight;
            });

          // actual chart
          scope.chart = calendarG.append("g")
            .attr("transform", translate(yAxisWidth, xAxisHeight));

          var pastDays = utcOptionalMoment().diff(start, 'days', false);

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