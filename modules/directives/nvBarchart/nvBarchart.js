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
          elem.width(scope.width);
          elem.height(scope.width);



            function drawChart(data2, element, selected) {
              nv.addGraph(function() {
                var chart = nv.models.discreteBarChart()
                    .x(function(d) { return d.key; })
                    .y(function(d) { return d.count; })
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
                d3.select(element).select("svg")
                    .datum(data2)
                    .transition().duration(500)
                    .call(chart);

                //var labels = d3.select(element).selectAll('g.nv-x g.tick')[0];
                console.log("classing");

                setTimeout(function() {

                d3.select(element).selectAll('.nv-bar').classed("selected", function(d,i) {
                  console.log(i);
                  console.log(d3.select(element).selectAll('g.nv-x g.tick')[0]);
                  //TODO: HACK ATTACK
                  var labels = d3.select(element).selectAll('g.nv-x g.tick')[0].sort(function(a,b) {
                    var a_trans = a.transform.animVal.getItem(0).matrix.e;
                    var b_trans = b.transform.animVal.getItem(0).matrix.e;
                    return a_trans - b_trans;
                  });
                  console.log(labels);
                  var label = $(labels[i]).text();
                  if(scope.selectedLabels) {
                    console.log("check");
                    console.log(scope.selectedLabels);
                    console.log(label);
                    var j;
                    for(j=0;j<scope.selectedLabels.length;j++) {
                      if(label === scope.selectedLabels[j]) {
                        console.log(true);
                        return true;
                      }
                    }
                  }
                  console.log("false");
                  return false;
                });
                 },100);

                d3.select(element).selectAll('.nv-bar').on("click",function(d, i) {
                  //TODO HACK to get around nvd3 not adding labels to the bars
                  var labels = d3.select(element).selectAll('g.nv-x g.tick')[0].sort(function(a,b) {
                    var a_trans = a.transform.animVal.getItem(0).matrix.e;
                    var b_trans = b.transform.animVal.getItem(0).matrix.e;
                    return a_trans - b_trans;
                  });
                  var label = $(labels[i]).text();
                  console.log("is selected?");
                  console.log(d3.select(this).classed("selected"));
                  console.log(d3.select(this));
                  if( d3.select(this).classed("selected")) {
                    console.log("if");
                    scope.$apply(function() {
                      scope.selectedLabels = [];
                    });
                    d3.select(element).selectAll("g.nv-bar").classed("selected", false);
                  } else {
                    console.log("else");
                    scope.$apply(function() {
                      scope.selectedLabels = [label];
                    });
                    d3.select(element).selectAll("g.nv-bar").classed("selected", false);
                    console.log("after de selecting all");
                    console.log(d3.select(this));
                    console.log(d3.select(this).classed("selected"));
                    var dThis = d3.select(this);
                    //HACK: nvd3 seems to be overwriting this
                    setTimeout(function() {
                      dThis.classed("selected", true);

                      console.log(dThis.classed("selected"));
                    }, 1);
                    console.log(dThis.classed("selected"));
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

//          //TODO: should operate on a label id
//          function selectLabels(labels, element) {
//            d3.select(element).selectAll('g').classed("selected", function(d) {
//              var i;
//              for (i=0;i<labels.length;i++) {
//                var l = labels[i].toUpperCase();
//                if($(this).find("text").text().toUpperCase() === l) {
//                    return true;
//                  }
//              }
//              return false;
//            });
//          }
//
//          scope.$watch('selectedLabels',function(labels) {
//            console.log("selected label change");
//            console.log(labels);
//            if(labels!==undefined && labels!==null) {
//              selectLabels(labels, elem[0]);
//            }
//          }, true);




        }
    };
}]);