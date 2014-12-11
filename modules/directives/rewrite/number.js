/**
 * @ngdoc directive
 * @name dataviz.rewrite:blNumber
 * @restrict E
 * @element bl-number
 *
 * @description
 * Shows a large text number.
 *
 * @example
 <example module="dataviz.rewrite">
 <file name="index.html">
 <div>
 <bl-graph>
 <bl-number></bl-number>
 </bl-graph>
 </div>
 </file>
 </example>
 */
angular.module('dataviz.rewrite')
.directive('blNumber', function(ChartFactory) {
      return _.extend(ChartFactory.defaults, {
        template: '<text class="bl-number chart">{{text}}</text>',
        link: function(scope, iElem, iAttrs) {
          console.log('blNumber link!');
          var vizConfig = {
            height: 400,
            width: 400,
            padding: 20
          };

          iElem
              .attr('height', vizConfig.height)
              .attr('width', vizConfig.width)
              .attr('transform', 'translate(' + vizConfig.padding + ', ' + vizConfig.padding * 2 + ')')
              .attr('font-family', 'Verdana')
              .attr('color', 'blue')
              .attr('font-size', 40);
          scope.text = 'AMAZING!!!';

        }
      });
    });
