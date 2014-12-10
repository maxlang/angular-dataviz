/**
 * @ngdoc directive
 * @name dataviz.rewrite:blLine
 * @restrict E
 * @element bl-line
 *
 * @description
 * Creates a line chart.
 *
 * @example
 <example module="dataviz.rewrite">
 <file name="index.html">
 <div>
 <bl-graph>
 <bl-line></bl-line>
 </bl-graph>
 </div>
 </file>
 </example>
 */
angular.module('dataviz.rewrite')
    .directive('blLine', function() {
      return {
        restrict: 'E',
        replace: true,
        scope: false,
        require: ['^blGraph'],
        template: '<g width="400px" class="bl-line" height="400px"></g>',
        templateNamespace: 'svg', //http://www.benlesh.com/2014/09/working-with-svg-in-angular.html
        link: function(scope, iElem, iAttrs) {
          console.log('Running line link!');

          // NOTE, when using ng-transclude, you need to select the
          // child g element but not
          // if you're overriding the transclude behavior
          // Need to select the child 'g', since the parent is the bl-line el

          var lineContainer = d3.select(iElem[0]); // strip off the jquery wrapper

          scope.line = d3.svg.line()
              .x(function(d) { return d.key; })
              .y(function(d) { return d.value; })
              .interpolate('basis');

          lineContainer.append('path')
              .attr('d', scope.line(scope.data));
        },
        controller: function($scope, $transclude) {

        }
      };
    });
