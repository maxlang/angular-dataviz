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
      link: function(scope, iElem, iAttrs, controllers) {
        // force lowercase
        var graphCtrl = controllers[0];
        var direction = iAttrs.direction.toLowerCase();
        var axisType = iAttrs.direction + 'Axis';

        console.log('Link function for %s', axisType);

        var axisContainer = d3.select(iElem[0])
          .attr('class', 'bl-axis ' + direction);

        scope.layout = graphCtrl.layout[axisType];
        scope.translate = Translate.axis(graphCtrl.layout, graphCtrl.components.registered, direction);

        graphCtrl.components.register(axisType, LayoutDefaults.components[axisType]);

        scope.$on(Layout.DRAW, function() {
          console.log('Heard layout.draw');
          scope.layout = graphCtrl.layout[axisType];
          scope.translate = Translate.axis(graphCtrl.layout, graphCtrl.components.registered, direction);
          drawAxis(graphCtrl.scale[direction], direction, axisContainer);
        });
      }
    });
  });