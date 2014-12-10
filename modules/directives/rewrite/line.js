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
    <bl-axis direction="x"></bl-axis>
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
      template: '<svg ng-attr-width="{{layout.graph.height}}" ng-attr-height="{{layout.graph.height}}" class="bl-line"></svg>',
      templateNamespace: 'svg', //http://www.benlesh.com/2014/09/working-with-svg-in-angular.html
      link: function(scope, iElem, iAttrs, controllers) {
        var vizConfig = {
          height: parseInt(iAttrs.height, 10),
          width: parseInt(iAttrs.width, 10)
        };


        var graphCtrl = controllers[0];

        // NOTE, when using ng-transclude, you need to select the
        // child g element but not
        // if you're overriding the transclude behavior
        // Need to select the child 'g', since the parent is the bl-line el

        var lineContainer = d3.select(iElem[0]); // strip off the jquery wrapper

        scope.line = d3.svg.line()
          .x(function(d) { return graphCtrl.scaleX(d.key); })
          .y(function(d) { return graphCtrl.scaleY(d.value); })
          .interpolate('basis');


        lineContainer.append('path')
          .attr('d', scope.line(scope.data));

        graphCtrl.registerComponent('graph', vizConfig);
      },
      controller: function($scope, $transclude) {

      }
    };
  })

  .directive('blAxis', function(LayoutConfig) {
    return {
      restrict: 'E',
      replace: true,
      require: ['^blGraph'],
      templateNamespace: 'svg',
      scope: false,
      template: '<svg class="axis" ng-attr-height="{{config.height}}" ng-attr-width="{{config.width}}" ng-attr-transform="translate({{config.translateX}}, {{config.translateY}})"></svg>',
      link: function(scope, iElem, iAttrs, controllers) {
        scope.config = LayoutConfig.axis.config;
        var graphCtrl = controllers[0];
        var position = iAttrs.position;

        // set the positional class

        var xAxis = d3.svg.axis()
          .scale(graphCtrl.scaleX);

        var axisContainer = d3.select(iElem[0]);
        axisContainer.call(xAxis);

        graphCtrl.registerComponent('xAxis', scope.config);

      }
    };
  });


/**
 * @ngdoc service
 * @name dataviz.rewrite:LayoutService
 *
 * @description
 *
 */


angular.module('dataviz.rewrite.services', [])
  .factory('LayoutConfig', function() {
    var axis = {
      config: {
        height: 30,
        width: '100%',
        translateX: 0,
        translateY: 300
      }
    };

    return {
      axis: axis
    };

  })
  .service('LayoutService', function() {

    return {};
  });
