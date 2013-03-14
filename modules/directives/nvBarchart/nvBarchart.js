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
            'heightPx' : 86
          };

          //TODO: better way to handle options, esp option merging
          function getOption(optionName) {
            return scope.params && scope.params.options && optionName in scope.params.options ? scope.options[optionName] : defaultOptions[optionName];
          }


          //INIT:
          element.append("<svg></svg>");

            function drawChart(data) {
              element.find("svg").width(getOption('widthPx'));
              element.find("svg").height(getOption('heightPx'));

              nv.addGraph(function() {
                var chart = nv.models.discreteBarChart()
                    .x(function(d) { return data.key; })
                    .y(function(d) { return data.value; })
                    .staggerLabels(getOption('staggerLabels'))
                    .tooltips(getOption('tooltips'))
                    .showValues(getOption('showValues'))
                    .staggerLabels(getOption('staggerLabels'));

                ///TODO fix selector
                d3.select(element[0]).select("svg")
                    .datum(data)
                    .transition().duration(500)
                    .call(chart);

                //var labels = d3.select(element).selectAll('g.nv-x g.tick')[0];

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
                 },100);

                d3.select(element[0]).selectAll('.nv-bar').on("click",function(d, i) {
                  //TODO HACK to get around nvd3 not adding labels to the bars
                  var labels = d3.select(element[0]).selectAll('g.nv-x g.tick')[0].sort(function(a,b) {
                    var a_trans = a.transform.animVal.getItem(0).matrix.e;
                    var b_trans = b.transform.animVal.getItem(0).matrix.e;
                    return a_trans - b_trans;
                  });
                  var label = $(labels[i]).text();
                  if( d3.select(this).classed("selected")) {
                    scope.$apply(function() {
                      scope.params.filter = [];
                    });
                    d3.select(element[0]).selectAll("g.nv-bar").classed("selected", false);
                  } else {
                    scope.$apply(function() {
                      scope.params.filter = [label];
                    });
                    d3.select(element[0]).selectAll("g.nv-bar").classed("selected", false);
                    var dThis = d3.select(this);
                    //HACK: nvd3 seems to be overwriting this
                    setTimeout(function() {
                      dThis.classed("selected", true);

                    }, 1);
                  }
                });

                nv.utils.windowResize(chart.update);

                //TODO: add click handler


                return chart;
              });
            }
            scope.$watch('data',function(counts) {
              if(counts!==undefined && counts!==null) {
                drawChart(counts);
              }
            }, true);

            scope.$watch('params.filter', function(f) {
            //TODO: IMPLEMENT SELECTION AS A SEPARATE METHOD

            }, true);

            scope.$watch('params.option', function() {
              drawChart(scope.data);
            }, true);

        }
    };
}]);