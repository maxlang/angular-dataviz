angular.module('dataviz.rewrite')
  .directive('blAxis', function(LayoutDefaults, ChartFactory, Translate, Layout) {
    var drawAxis = function(scale, direction, axisContainer) {
      var axis = d3.svg.axis()
        .scale(scale)
        .orient(direction === 'y' ? 'left' : 'bottom');

      axisContainer.call(axis);
    };

    return new ChartFactory.Component({
      template: '<g ng-attr-height="{{layout.height}}" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}}, {{translate.y}})"></g>',
      scope: {
        direction: '=',
        title: '=?',
        orderBy: '=?'
      },
      link: function(scope, iElem, iAttrs, controllers) {
        // Ensure that the direction is passed in as lowercase
        if (scope.direction !== scope.direction.toLowerCase()) {
          throw new Error('The axis direction must be lowercase or very little will work.');
        }

        var graphCtrl = controllers[0];
        var axisType = scope.direction + 'Axis';

        var axisContainer = d3.select(iElem[0])
          .attr('class', 'bl-axis ' + scope.direction);

        scope.layout = graphCtrl.layout[axisType];
        scope.translate = Translate.axis(graphCtrl.layout, graphCtrl.components.registered, scope.direction);

        graphCtrl.components.register(axisType, {
          direction: scope.direction,
          field: scope.field
        });

        scope.$on(Layout.DRAW, function() {
          console.log('Heard layout.draw');
          scope.layout = graphCtrl.layout[axisType];
          scope.translate = Translate.axis(graphCtrl.layout, graphCtrl.components.registered, scope.direction);
          drawAxis(graphCtrl.scale[scope.direction], scope.direction, axisContainer);
        });
      }
    });
  });