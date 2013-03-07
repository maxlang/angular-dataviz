angular.module('dataviz.directives').directive('nvBarchart', [function() {
    return {
        restrict: 'E',
        scope: {
          //TODO: change expected values to something more reasonable
            'selectedLabels': '=', //expects an array of selected labels
            'labeledCounts' : '=',   // expects an array of {<label>:<count>}
            'width'  : '=',  // expects a measurement in pixels
            'height' : '='  // expects a measurement in pixels
        },
        link: function(scope, elem, attrs) {

            function drawChart(data2, element) {
              nv.addGraph(function() {
                var chart = nv.models.discreteBarChart()
                    .x(function(d) { return d.label; })
                    .y(function(d) { return d.value; })
                    .staggerLabels(true)
                    .tooltips(false)
                    .showValues(true);
//
//                chart.dispatch.on("click", function(d,i) {
//                  console.log(d);
//                  console.log(i);
//                  console.log(this);
//                });


                ///TODO fix selector
                d3.select("nv-barchart").select("svg")
                    .datum(data2)
                    .transition().duration(500)
                    .call(chart);

                d3.select("nv-barchart").selectAll('g.nv-x g.tick').on("click",function() {
                  var label = d3.select(this).select("text").text();
                  console.log(d3.select(this).classed("selected"));
                  if( d3.select(this).classed("selected")) {
                    scope.$apply(function() {
                      scope.selectedLabels = [];
                    });
                    d3.select("nv-barchart").selectAll("g.nv-x g.tick").classed("selected", false);
                  } else {
                    scope.$apply(function() {
                      scope.selectedLabels = [label];
                    });
                    d3.select("nv-barchart").selectAll("g.nv-x g.tick").classed("selected", false);
                    d3.select(this).classed("selected");
                  }
                  console.log(scope.selectedLabels);
                });

                nv.utils.windowResize(chart.update);

                //TODO: add click handler


                return chart;
              });
            }
            scope.$watch('labeledCounts',function(counts) {
              console.log("labeled count change");
              console.log(counts);
              if(counts!==undefined && counts!==null) {
                drawChart(counts, elem[0]);
              }
            }, true);

          //TODO: should operate on a label id
          function selectLabels(labels, element) {
            d3.select(element).selectAll('g').classed("selected", function(d) {
              var i;
              for (i=0;i<labels.length;i++) {
                var l = labels[i].toUpperCase();
                if($(this).find("text").text().toUpperCase() === l) {
                    return true;
                  }
              }
              return false;
            });
          }

          scope.$watch('selectedLabels',function(labels) {
            console.log("selected label change");
            console.log(labels);
            if(labels!==undefined && labels!==null) {
              selectLabels(labels, elem[0]);
            }
          }, true);




        }
    };
}]);