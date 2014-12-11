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
 <div class="graph-wrapper">
   <bl-graph container-height="400" container-width="400">
      <bl-line></bl-line>
      <bl-axis direction="x"></bl-axis>
      <bl-axis direction="y"></bl-axis>
   </bl-graph>
 </div>
 </file>
 </example>
 */



angular.module('dataviz.rewrite')
  .directive('blLine', function(ChartFactory, Events) {
    return new ChartFactory.Component({
      template: '<svg ng-attr-width="{{layout.width}}" ng-attr-height="{{layout.height}}" class="bl-line chart"></svg>',
      link: function(scope, iElem, iAttrs, controllers) {
        var COMPONENT_TYPE = 'graph';
        var graphCtrl = controllers[0];
        var lineContainer = d3.select(iElem[0]); // strip off the jquery wrapper

        graphCtrl.components.register(COMPONENT_TYPE);


        scope.line = d3.svg.line()
          .x(function(d) { return graphCtrl.scale.x(d.key); })
          .y(function(d) { return graphCtrl.scale.y(d.value); })
          .interpolate('basis');

        lineContainer.append('path')
          .attr('d', scope.line(graphCtrl.data));

        scope.layout = graphCtrl.layout[COMPONENT_TYPE];

        console.log('scope.layout for %s is: ', COMPONENT_TYPE, scope.layout);
      }
    });
  })

  .directive('blAxis', function(LayoutDefaults, ChartFactory, Events) {
    return new ChartFactory.Component({
      template: '<svg class="bl-axis" ng-attr-height="{{layout.height}}" ng-attr-width="{{layout.width}}"></svg>',
      link: function(scope, iElem, iAttrs, controllers) {
        // force lowercase
        var graphCtrl = controllers[0];
        var direction = iAttrs.direction.toLowerCase();
        var axisType = iAttrs.direction + 'Axis';

        var axis = d3.svg.axis()
          .scale(graphCtrl.scale[direction]);

        var axisContainer = d3.select(iElem[0]);

        if (direction === 'y') {
          axis.orient('right');
        }

        axisContainer.call(axis);

        graphCtrl.components.register(axisType, LayoutDefaults.components[axisType]);
        scope.layout = graphCtrl.layout[axisType];
      }
    });
  });


/**
 * @ngdoc service
 * @name dataviz.rewrite:LayoutService
 *
 * @description
 *
 */


angular.module('dataviz.rewrite.services', [])
  .factory('ChartFactory', function() {
    var Component = function(config) {
      return _.defaults(config, {
        restrict: 'E',
        replace: true,
        scope: true,
        require: ['^blGraph'],
        templateNamespace: 'svg'
      });
    };

    return {
      Component: Component
    };
  })
  .service('LayoutService', function(LayoutDefaults, $log) {
    var updateLayout = function(componentType, componentConfig, layout) {
      // the format for this is as follows:
      // the graph starts at totalWidth - padding

      // xAxis registration subtracts 30px from h
      // yAxis registration subtracts 30px from w

      switch(componentType) {
      case 'xAxis':
        layout.graph.height -= componentConfig.height || LayoutDefaults.components.xAxis.height;
        layout[componentType] = componentConfig;
        break;
      case 'yAxis':
        layout.graph.width -= componentConfig.width || LayoutDefaults.components.yAxis.width;
        layout[componentType] = componentConfig;
        break;
      case 'graph':
        break;
      default:
        $log.warn('You are updating the layout with an unsupported component type (%s)', componentType);
      }

      return layout;
    };

    var getDefaultLayout = function(attrHeight, attrWidth) {
      return {
        container: {
          height: attrHeight,
          width: attrWidth
        },
        graph: {
          height: attrHeight - (LayoutDefaults.padding.top + LayoutDefaults.padding.bottom),
          width: attrWidth - (LayoutDefaults.padding.left + LayoutDefaults.padding.right)
        }
      };
    };

    return {
      updateLayout: updateLayout,
      getDefaultLayout: getDefaultLayout
    };
  })
  .factory('LayoutDefaults', function() {


    return {
      padding: {
        top: 15,
        bottom: 15,
        right: 15,
        left: 15
      },
      components: {
        xAxis: {
          height: 30,
          width: '100%'
        },
        yAxis: {
          height: '100%',
          width: 30
        }
      }
    };
  });
;
