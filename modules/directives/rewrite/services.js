
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
          layout.graph.height = layout.container.height - LayoutDefaults.components.xAxis.height;
          break;
        case 'yAxis':
          layout.graph.width = layout.container.width  - LayoutDefaults.components.yAxis.width;
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
          height: attrHeight,
          width: attrWidth
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
      getDefaultLayout: getDefaultLayout,
      REDRAW: 'layout.redraw'
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
