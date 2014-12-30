angular.module('dataviz.rewrite')
  .directive('blAxis', function(LayoutDefaults, ChartFactory, Translate, Layout) {
    var DISTANCE_FROM_AXIS = -12;

    var wrap = function(text, maxTextWidth) {
      text.each(function() {
        var text = d3.select(this);
        var words = text.text().split(/\s+/).reverse();
        var word;
        var line = [];
        var lineNumber = 0;
        var lineHeight = 1.1; // ems
        var y = text.attr("y");
        var dy = parseFloat(text.attr("dy"));
        var tspan = text.text(null).append("tspan").attr("x", DISTANCE_FROM_AXIS).attr("y", y).attr("dy", dy + "em");

        while (word = words.pop()) {
          line.push(word);
          tspan.text(line.join(" "));
          if (tspan.node().getComputedTextLength() > maxTextWidth) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = text.append("tspan").attr("x", DISTANCE_FROM_AXIS).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
          }
        }
      });
    };

    var drawAxis = function(scale, direction, axisContainer, layout) {
      var axis = d3.svg.axis()
        .scale(scale)
        .orient(direction === 'y' ? 'left' : 'bottom');

      axisContainer.call(axis);

      var maxTextWidth = direction === 'y' ? layout.width - 12 : 100;

      console.log('maxTextWidth is: ', maxTextWidth);
      axisContainer.selectAll('.tick text')
        .call(wrap, maxTextWidth);
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
          .attr('class', 'bl-axis ' + scope.direction)
          .attr('width', LayoutDefaults.components.yAxis.width);

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
          drawAxis(graphCtrl.scale[scope.direction], scope.direction, axisContainer, scope.layout);
        });
      }
    });
  });