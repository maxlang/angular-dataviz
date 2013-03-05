angular.module('dataviz.directives').directive('blockCalendar', [function() {
    return {
        restrict: 'E',
        scope: {
            'vizSelectedTimeRanges': '=',
            'vizHighlightedTimeRanges': '=',
            'vizTimeUnitCounts' : '=',
            'vizTimeUnit' : '=',
            'vizCountUnit' : '='
        },
        link: function(scope, elem, attrs) {
            console.log("link");

            scope.selectedDates = null;
            scope.selectedDatesUpper = null;
            scope.selectedrange = "";

            var datefromstr = function(datestr, add) {
                var nima = datestr.split("-");
                return new Date(parseInt(nima[0], 10), parseInt(nima[1], 10) - 1, parseInt(nima[2], 10) + add);
            };

            var gitcalendar = {
                format : d3.time.format("%Y-%m-%d"),

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
            function drawChart(data2, element, calendar) {

                console.log(data2);
                var months = 10;

                var data3 = data2;
                var svg = d3.select(element).append("svg:svg").attr("width", "100%").attr("height", "100%");
                var days = calendar.dates(months);
                var weeks = days[days.length - 1].week + 1; //week is 0 indexed
                var totalWidth = 586;
                var totalHeight = 86;
                $("#chart").css("height", totalHeight + "px").css("width", totalWidth + "px");
                var cellWidth = (totalWidth / weeks);
                var cellHeight = totalHeight / 7;
                var cellSize = Math.floor(Math.min(cellWidth, cellHeight));
                var cells = svg.selectAll("rect").data(days).enter().append("svg:rect");

                cells.attr("width", function(d) {return cellSize + "px"; })
                    .attr("height", function(d) {return cellSize + "px"; })
                    .attr("x", function(d) {return (d.week * cellSize) + "px"; })
                    .attr("y", function(d) {return (d.day * cellSize) + "px"; })
                    .on("click", function (d, i) {
                        d3.selectAll("rect").classed("selected", false);
                        var selectedDate = datefromstr(d.Date, 0).getTime();
                        if (selectedDate === scope.selectedDates) {
                            scope.selectedDates = null;
                            scope.selectedDatesUpper = null;
                        } else {
                            $scope.selectedDates = selectedDate;
                            $scope.selectedDatesUpper = datefromstr(d.Date, 1).getTime();
                            d3.select(this).classed("selected", true);
                        }

                        scope.$apply(function() {
                            scope.range = { from: scope.selectedDates, to: scope.selectedDatesUpper };
                        });
                    });

                var data = {};
                var max = 0;
                var dates = {};
                var i = 0;
                for (i = 0; i < data3.length; i += 1) {
                    var date = new Date(data3[i].date);
                    var dateString = data3[i].date;
                    max = Math.max(data3[i].count, max);
                    data[dateString] = data3[i].count;
                    dates[dateString] = date;
                }

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
                            itemString = " : " + count + (count === 1 ? " email" : " emails");
                        }
                        return d.Date + itemString;
                    });
            }
            //var url = "/api/topics/" + scope.topicId + "/dates";
            //var url = "http://localhost:9000/api/topics/ba4595f8d23165cdb34eb68227f9919b/dates";

            var data = [
                {
                    "date": "2013-02-24",
                    "count": 22
                },
                {
                    "date": "2013-02-25",
                    "count": 20
                },
                {
                    "date": "2013-02-26",
                    "count": 10
                },
                {
                    "date": "2013-02-27",
                    "count": 13
                },
                {
                    "date": "2013-02-28",
                    "count": 7
                },
                {
                    "date": "2013-03-01",
                    "count": 4
                },
                {
                    "date": "2013-03-02",
                    "count": 2
                },
                {
                    "date": "2013-03-03",
                    "count": 25
                }
            ];

            //$.get(url).then(function (response) {
                drawChart(data, elem[0], gitcalendar);
            //});

            function dateToYMD(date) {
                var d = date.getDate();
                var m = date.getMonth() + 1;
                var y = date.getFullYear();
                return y.toString() + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d);
            }



        }
    };
}]);