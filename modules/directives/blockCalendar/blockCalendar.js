angular.module('dataviz.directives').directive('blockCalendar', [function() {
    return {
        restrict: 'E',
        scope: {
          //TODO: change expected values to something more reasonable
            'selectedRanges': '=',   // expects an array of {start:<timestamp>, end:<timestamp>} objects
            //'highlightedRanges': '=',
            'counts' : '=',   // expects an map of {<YYYY-mm-dd>:<count>}
            'width'  : '=',  // expects a measurement in pixels
            'height' : '='  // expects a measurement in pixels
        },
        link: function(scope, elem, attrs) {
            console.log("link");
            var datefromstr = function(datestr, add) {
                var nima = datestr.split("-");
                return new Date(parseInt(nima[0], 10), parseInt(nima[1], 10) - 1, parseInt(nima[2], 10) + add);
            };

            var gitcalendar = {
                format : d3.time.format("%Y-%-m-%-d"),

                dates : function (monthsBack) {
                    var dates = [],
                        week = 0,
                        day;

                    var today = new Date();
                    var date2 = new Date(today.getFullYear(), 1 - monthsBack, 1);

                    for (date2; date2 <= today; date2.setDate(date2.getDate() + 1)) {
                        dates.push({
                            day : day = date2.getDay(),
                            week : day === 0 ? week += 1 : week,
                            month : date2.getMonth(),
                            Date : gitcalendar.format(date2)
                        });
                    }
                    return dates;
                }

            };

          //TODO: optimize and clean
          var selectRanges = function (ranges, element) {
            d3.select(element).selectAll('rect.day').classed("selected", function(d) {
              var i;
              for (i=0;i<ranges.length;i++) {
                var r = ranges[i];
                var dayStart = datefromstr(d.Date, 0).getTime();
                var dayEnd = datefromstr(d.Date, 1).getTime();
                if ((r.start < dayEnd && r.start >= dayStart) ||
                    (r.end <= dayEnd && r.end > dayStart) ||
                    (r.end > dayEnd && r.start < dayStart)) {
                  return true;
                }
              }
              return false;
            });
          };


          //TODO: needs to factor in selectedRanges
            function drawChart(data2, element, calendar) {

                console.log(data2);
                var months = 10;

                var data3 = data2;
                var svg = d3.select(element).append("svg:svg").attr("width", "100%").attr("height", "100%");
                var days = calendar.dates(months);
                var weeks = days[days.length - 1].week + 1; //week is 0 indexed
                var totalWidth = 586;
                var totalHeight = 86;
                $(element).find(".chart").css("height", totalHeight + "px").css("width", totalWidth + "px");
                var cellWidth = (totalWidth / weeks);
                var cellHeight = totalHeight / 7;
                var cellSize = Math.floor(Math.min(cellWidth, cellHeight));
                var cells = svg.selectAll("rect").data(days).enter().append("svg:rect");

                cells.attr("width", function(d) {return cellSize + "px"; })
                    .attr("height", function(d) {return cellSize + "px"; })
                    .attr("x", function(d) {return (d.week * cellSize) + "px"; })
                    .attr("y", function(d) {return (d.day * cellSize) + "px"; })
                    .on("click", function (d, i) {
                      console.log("click");
                      var dThis = d3.select(this);
                      //TODO: change behavior if this is part of a large selection?
                      if (dThis.classed("selected")) {
                        console.log("selected");
                        d3.selectAll("rect").classed("selected", false);
                        scope.$apply(function() {
                          scope.selectedRanges = [];
                        });
                      } else {
                        console.log("not selected");
                        d3.selectAll("rect").classed("selected", false);
                        dThis.classed("selected", true);
                        //HACK: clear then push so that watchers know there is a change
                        //maybe use apply?
                        scope.$apply(function() {
                          scope.selectedRanges = [{
                            start: datefromstr(d.Date, 0).getTime(),
                            end: datefromstr(d.Date, 1).getTime()
                          }];
                        });
                        console.log(scope.selectedRanges);
                      }

                      //TODO: why do we need to use apply here again?

                    });
              // TODO: change to mousedown, mousemove, and mouseup to select ranges
              // shift click selects a consecutive range
              // ctrl click selects a disjoint set of ranges
              //

                var data = {};
                var max = 0;
                var dates = {};
                var i;
                for (i=0;i<data3.length;i++) {
                    var date = new Date(data3[i].key);
                    var dateString = data3[i].key;
                    max = Math.max(data3[i].count, max);
                    data[dateString] = data3[i].count;
                    dates[dateString] = date;
                }
              console.log("cal processing");
              console.log(data);
              console.log(dates);

                var color = d3.scale.quantize().domain([0, max]).range(d3.range(9));

                svg.selectAll("rect").attr("class", function (d) {
                    var colorClass = "q" + color(data[d.Date]) + "-9";
                    return colorClass;
                })
                    .classed("day", true)
                    .append("svg:title")
                    .text(function(d, i) {
                        var count = data[d.Date];
                        var itemString = "";
                        if (count !== undefined) {
                            itemString = " : " + count + (count === 1 ? " item" : " items");
                        }
                        return d.Date + itemString;
                    });
              console.log("selecting ranges");
              console.log(scope.selectedRanges);

              selectRanges(scope.selectedRanges, element);
            }
                scope.$watch('counts',function(counts) {
                  console.log("count change");
                  console.log(counts);
                  //HACK - remove everything in the div for right now
                  elem.html("");
                  if(counts!==undefined && counts!==null) {
                    drawChart(counts, elem[0], gitcalendar);
                  }
                }, true);



          scope.$watch('selectedRanges',function(ranges) {
            console.log("range change");
            console.log(ranges);
            if(ranges!==undefined && ranges!==null) {
              selectRanges(ranges, elem[0]);
            }
          }, true);



            function dateToYMD(date) {
                var d = date.getDate();
                var m = date.getMonth() + 1;
                var y = date.getFullYear();
                return y.toString() + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);
            }



        }
    };
}]);