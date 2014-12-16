
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

  .factory('Translate', function(LayoutDefaults, Layout, components) {
    var axis = function(layout, registered, direction) {
      var layoutHas = Layout.makeLayoutHas(registered);
      var translateObj;

      if (direction === 'x') {
        translateObj = {
          y: layout.container.height - LayoutDefaults.components.xAxis.height,
          x: (layoutHas(components.yAxis) ? LayoutDefaults.components.yAxis.width : 0)
        };
      } else if (direction === 'y') {
        translateObj = {
          y: layout.container.height - layout.yAxis.height - (layoutHas(components.xAxis) ? LayoutDefaults.components.xAxis.height : 0) + 10, // why?
          x: LayoutDefaults.components.yAxis.width
        };
      } else {
        console.warn('Choose a direction of x or y.');
        return {};
      }

      return translateObj;
    };

    var graph = function(layout, registered, graphType) {
      var layoutHas = Layout.makeLayoutHas(registered);

      return {
        x: (layoutHas(components.yAxis) ? LayoutDefaults.components.yAxis.width : 0),
        y: 10 // why?
      };
    };

    var legend = function(layout, registered) {
      return {
        x: layout.container.width - layout.legend.width, //width of the container minus the width of the legend itself
        y: 0
      };
    };

    return {
      axis: axis,
      graph: graph,
      legend: legend
    };
  })

  .factory('Layout', function(LayoutDefaults, $log, components) {
    var makeLayoutHas = function(registeredComponents) {
      return function(componentName) {
        return _.contains(registeredComponents, componentName);
      };
    };

    var updateLayout = function(registered, layout) {
      var layoutHas = makeLayoutHas(registered);

      // Handle graph width
      if (layoutHas(components.legend) && layoutHas(components.yAxis)) {
        layout.graph.width = layout.container.width - (layout.legend.width + LayoutDefaults.padding.legend.right + LayoutDefaults.components.yAxis.width);
      } else if (layoutHas(components.legend)) {
        layout.graph.width = layout.container.width - (layout.legend.width + LayoutDefaults.padding.legend.right);
      } else if (layoutHas(components.yAxis)) {
        layout.graph.width = layout.container.width - LayoutDefaults.components.yAxis.width;
      }

      // Handle graph height
      if (layoutHas(components.xAxis)) {
        layout.graph.height = layout.container.height - LayoutDefaults.components.xAxis.height;
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
        },
        legend: {
          width: LayoutDefaults.components.legend.width
        }
      };
    };

    return {
      updateLayout: updateLayout,
      getDefaultLayout: getDefaultLayout,
      makeLayoutHas: makeLayoutHas,
      DRAW: 'layout.draw'
    };
  })

  .constant('components', {
    xAxis: 'xAxis',
    yAxis: 'yAxis',
    graph: 'graph',
    legend: 'legend'
  })

  .factory('LayoutDefaults', function() {
    return {
      padding: {
        graph: {
          bottom: 0,
          top: 0,
          right: 15,
          left: 0
        },
        legend: {
          left: 0,
          right: 0,
          bottom: 0,
          top: 0,
          series: {
            bottom: 4,
            top: 0,
            left: 0,
            right: 0
          }
        }
      },
      components: {
        xAxis: {
          height: 20
        },
        yAxis: {
          width: 30
        },
        legend: {
          width: 150
        }
      }
    };
  })

  .service('ThemeService', function() {

  })
;
