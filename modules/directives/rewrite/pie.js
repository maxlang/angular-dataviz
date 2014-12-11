/**
 * @ngdoc directive
 * @name dataviz.rewrite:blPie
 * @restrict E
 * @element bl-pie
 *
 * @description
 * Creates a pie chart.
 *
 * @example
 <example module="dataviz.rewrite">
 <file name="index.html">
 <div>
 <bl-graph>
 <bl-pie></bl-pie>
 </bl-graph>
 </div>
 </file>
 </example>
 */

angular.module('dataviz.rewrite')
    .directive('blPie', function(ChartFactory) {
      return _.extend(ChartFactory.defaults, {
        template: '<svg class="bl-pie chart" width="400px" class="bl-pie" height="400px"></svg>',
        link: function(scope, iElem, iAttrs) {
          // Lovingly borrowed from: http://jsfiddle.net/ragingsquirrel3/qkHK6/
          // With modifications

          var vizConfig = {
            width: parseInt(iAttrs.width, 10),
            height: parseInt(iAttrs.height, 10),
            radius: function() { return this.height/2; }
          };

          var color = d3.scale.category20c();

          var data = [{"label":"Category A", "value":20},
            {"label":"Category B", "value":50},
            {"label":"Category C", "value":30}];


          var vis = d3.select(iElem[0])
              .data([scope.data])
              .attr("width", vizConfig.width)
              .attr("height", vizConfig.height)
              .append("g")
              .attr("transform", "translate(" + vizConfig.radius() + "," + vizConfig.radius() + ")");

          var pie = d3.layout.pie().value(function(d){return d.value;});

          // declare an arc generator function
          var arcGen = d3.svg.arc().outerRadius(vizConfig.radius());

          // select paths, use arc generator to draw
          var arcs = vis.selectAll("g.slice").data(pie).enter().append("g").attr("class", "slice");
          arcs.append("path")
              .attr("fill", function(d, i){
                return color(i);
              })
              .attr("d", function (d) {
                return arcGen(d);
              });

          // add the text
          arcs.append("text")
              .attr("transform", function(d){
                d.innerRadius = 0;
                d.outerRadius = vizConfig.radius();
                return "translate(" + arcGen.centroid(d) + ")";
              })
              .attr("text-anchor", "middle").text( function(d, i) {
                return d.data.key;}
          );
        }
      });
    });



