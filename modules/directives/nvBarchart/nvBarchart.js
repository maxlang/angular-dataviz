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
