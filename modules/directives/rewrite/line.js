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
   <bl-graph container-height="200" container-width="600">
      <bl-line></bl-line>
      <bl-axis direction="x"></bl-axis>
   </bl-graph>
 </div>
 </file>
 </example>
 */

  //<bl-axis direction="y"></bl-axis>


angular.module('dataviz.rewrite')
  .directive('blLine', function(ChartFactory, Translate) {
    return new ChartFactory.Component({
      template: '<g ng-attr-width="{{layout.width}}" ng-attr-height="{{layout.height}}" class="bl-line chart"></g>',
      link: function(scope, iElem, iAttrs, controllers) {
        var COMPONENT_TYPE = 'graph';
        var graphCtrl = controllers[0];
        var lineContainer = d3.select(iElem[0]); // strip off the jquery wrapper

        graphCtrl.components.register(COMPONENT_TYPE);

        scope.line = d3.svg.line()
          .x(function(d) { return graphCtrl.scale.x(d.key); })
          .y(function(d) { return graphCtrl.scale.y(d.value); })
          .interpolate('basis');

        var translate = Translate.getGraphTranslation(graphCtrl.layout, graphCtrl.components.registered, COMPONENT_TYPE);

        lineContainer.append('path')
          .attr('d', scope.line(graphCtrl.data))
          .attr('transform', 'translate(' + translate.x + ',' + translate.y + ')');

        scope.layout = graphCtrl.layout[COMPONENT_TYPE];
      }
    });
  })

  .directive('blAxis', function(LayoutDefaults, ChartFactory, Translate) {
    return new ChartFactory.Component({
      template: '<g  ng-attr-height="{{layout.height}}" ng-attr-width="{{layout.width}}"></g>',
      link: function(scope, iElem, iAttrs, controllers) {
        // force lowercase
        var graphCtrl = controllers[0];
        var direction = iAttrs.direction.toLowerCase();
        var axisType = iAttrs.direction + 'Axis';
        scope.layout = graphCtrl.layout[axisType];

        var axis = d3.svg.axis()
          .scale(graphCtrl.scale[direction])
          .orient(direction === 'y' ? 'left' : 'bottom');

        var translate = Translate.getAxisTranslation(graphCtrl.layout, graphCtrl.components.registered, direction);

        var axisContainer = d3.select(iElem[0])
          .attr('class', 'bl-axis ' + direction)
          .attr('transform', 'translate(' + translate.x + ', ' + translate.y + ')');

        axisContainer.call(axis);

        graphCtrl.components.register(axisType, LayoutDefaults.components[axisType]);
      }
    });
  })
  .directive('blLegend', function() {
    return {};
  })
;


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

  .factory('Translate', function(LayoutDefaults) {
    var getAxisTranslation = function(layout, registered, direction) {
      var translateObj;

      if (direction === 'x') {
        translateObj = {
          y: layout.container.height - LayoutDefaults.components.xAxis.height,
          x: LayoutDefaults.components.yAxis.width
        };
      } else if (direction === 'y') {
        translateObj = {
          y: layout.container.height - layout.yAxis.height - LayoutDefaults.components.xAxis.height + 10, // why?
          x: LayoutDefaults.components.yAxis.width
        };
      } else {
        console.warn('Choose a direction of x or y.');
        return {};
      }

      return translateObj;
    };

    var getGraphTranslation = function(layout, registered, graphType) {
      return {
        x: LayoutDefaults.components.yAxis.width,
        y: 10 // why?
      };
    };

    return {
      getAxisTranslation: getAxisTranslation,
      getGraphTranslation: getGraphTranslation
    };
  })

  .factory('Layout', function(LayoutDefaults, $log) {
    var updateLayout = function(componentType, componentConfig, layout) {
      // the format for this is as follows:
      // the graph starts at totalWidth - padding

      // xAxis registration subtracts 30px from h
      // yAxis registration subtracts 30px from w

      // updatelayout is aware of what components have been registered

      switch(componentType) {
      case 'xAxis':
        layout.graph.height -= componentConfig.height || LayoutDefaults.components.xAxis.height || 0;
        break;
      case 'yAxis':
        layout.graph.width -= componentConfig.width || LayoutDefaults.components.yAxis.width || 0;
        break;
      case 'graph':
        break;
      default:
        $log.warn('You are updating the layout with an unsupported component type (%s)', componentType);
      }

      if (_.isEmpty(layout[componentType])) {
        layout[componentType] = _.extend(componentConfig, LayoutDefaults.components[componentType]);
      }

      return layout;
    };
    var getDefaultLayout = function(attrHeight, attrWidth) {
      var withoutPadding = function(num, orientation) {
        var trimmed;
        if (orientation === 'h') {
          trimmed = num - (LayoutDefaults.padding.left + LayoutDefaults.padding.right);
        } else if (orientation === 'v') {
          trimmed = num - (LayoutDefaults.padding.top + LayoutDefaults.padding.bottom);
        }
        return trimmed;
      };

      return {
        container: {
          height: attrHeight,
          width: attrWidth
        },
        graph: {
          height: attrHeight - LayoutDefaults.components.xAxis.height,
          width: attrWidth - LayoutDefaults.components.yAxis.width
        },
        xAxis: {
          width: attrWidth - LayoutDefaults.components.yAxis.width,
          height: LayoutDefaults.components.xAxis.height
        },
        yAxis: {
          height: attrHeight - LayoutDefaults.components.xAxis.height,
          width: LayoutDefaults.components.yAxis.width
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
        top: 0,
        bottom: 0,
        right: 0,
        left: 0
      },
      components: {
        xAxis: {
          height: 20
        },
        yAxis: {
          width: 30
        }
      }
    };
  })
;
