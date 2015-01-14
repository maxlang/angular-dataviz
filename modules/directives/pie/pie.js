/**
 * @ngdoc directive
 * @name dataviz:blPie
 * @restrict E
 * @element bl-pie
 *
 * @description
 * Creates a pie chart.
 *
 * @example
 <example module="dataviz">
 <file name="index.html">
 <div>
   <bl-graph container-width="600" container-height="400">
    <bl-pie></bl-pie>
   </bl-graph>
 </div>
 </file>
 </example>
 */

// Lovingly borrowed from: http://jsfiddle.net/ragingsquirrel3/qkHK6/
angular.module('dataviz')
    .directive('blPie', function(ChartFactory, chartTypes) {
      return new ChartFactory.Component({
        template: '<g class="bl-pie chart" ng-attr-width="{{layout.width}}" ng-attr-height="{{layout.height}}" ng-attr-transform="translate({{translate.x}}, {{translate.y}})" class="bl-pie"></g>',
        link: function(scope, iElem, iAttrs, controllers) {
          var graphCtrl = controllers[0];
          var COMPONENT_TYPE = charts.pie;

          graphCtrl.components.register(COMPONENT_TYPE);

          // With modifications
          var diameter = Math.min(graphCtrl.layout.graph.height, graphCtrl.layout.graph.width);
          scope.layout = {
            width: diameter,
            height: diameter,
            radius: Math.floor(diameter/2)
          };

          scope.translate = {
            x: scope.layout.radius,
            y: scope.layout.radius
          };

          console.log('scope is: ', scope);

          var color = d3.scale.category20c();

          var data = [{"label":"Category A", "value":20},
            {"label":"Category B", "value":50},
            {"label":"Category C", "value":30}];


          var vis = d3.select(iElem[0])
              .data([graphCtrl.data])
              .append("g");

          var pie = d3.layout.pie().value(function(d){return d.value;});

          // declare an arc generator function
          var arcGen = d3.svg.arc().outerRadius(scope.layout.radius);

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
                d.outerRadius = scope.layout.radius;
                return "translate(" + arcGen.centroid(d) + ")";
              })
              .attr("text-anchor", "middle").text( function(d, i) {
                return d.data.key;}
          );
        }
      });
    });



