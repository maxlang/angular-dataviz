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
      <bl-axis direction="y"></bl-axis>
   </bl-graph>
 </div>
 </file>
 </example>
 */

angular.module('dataviz.rewrite')
  .directive('blLine', function(ChartFactory, Translate, Layout) {
    var setLine = function(xScale, yScale) {
      return d3.svg.line()
        .x(function(d) { return xScale(d.key); })
        .y(function(d) { return yScale(d.value); })
        .interpolate('basis');
    };

    return new ChartFactory.Component({
      template:
      '<g ng-attr-width="{{layout.width}}" ng-attr-height="{{layout.height}}" class="bl-line chart">' +
        '<path ng-attr-transform="translate({{translate.x}}, {{translate.y}})"' +
      '</g>',
      link: function(scope, iElem, iAttrs, controllers) {
        var COMPONENT_TYPE = 'graph';
        var graphCtrl = controllers[0];
        var path = d3.select(iElem[0]).select('path'); // strip off the jquery wrapper

        graphCtrl.components.register(COMPONENT_TYPE);

        function drawLine() {
          scope.line = setLine(graphCtrl.scale.x, graphCtrl.scale.y);
          scope.translate = Translate.getGraphTranslation(graphCtrl.layout, graphCtrl.components.registered, COMPONENT_TYPE);
          path.attr('d', scope.line(graphCtrl.data));
          scope.layout = graphCtrl.layout[COMPONENT_TYPE];
        }

        drawLine();

        scope.$on(Layout.REDRAW, function() {
          drawLine();
        });
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
