angular.module('dataviz')
  .directive('blAxis', function(BlLayoutDefaults, BlChartFactory, BlTranslate, blGraphEvents, $log) {
    var getOffsetX = function(direction) {
      return direction === 'x' ? 0 : -12;
    };


    // Note (il): Took this wrap function wholesale from Mike Bostock: http://bl.ocks.org/mbostock/7555321
    var wrap = function(text, maxTextWidth, xOffset) {
      text.each(function() {
        var text = d3.select(this);
        var words = text.text().split(/\s+/).reverse();
        var word;
        var line = [];
        var lineNumber = 0;
        var lineHeight = 1.1; // ems
        var y = 0;
        var dy = parseFloat(text.attr("dy"));
        var tspan = text.text(null).append("tspan").attr("x", xOffset).attr("y", y).attr("dy", dy + "em");

        while (word = words.pop()) {
          line.push(word);
          tspan.text(line.join(" "));
          if (tspan.node().getComputedTextLength() > maxTextWidth) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = text.append("tspan").attr("x", xOffset).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
          }
        }
      });
    };

    var drawAxis = function(scales, direction, axisContainer, layout) {
      var axis = d3.svg.axis()
        .scale(scales[direction])
        .orient(direction === 'y' ? 'left' : 'bottom')
        .tickFormat(d3.format("s"));

      axisContainer.call(axis);

      var xOffset = getOffsetX(direction);
      var maxTextWidth = direction === 'y' ? layout.width + xOffset : 100;

      // We want lines to span the graph for only the y axis
      if (direction === 'y') {
        axisContainer.selectAll('.tick line')
          .attr('x2', scales.x.range()[1]);
      }

      axisContainer.selectAll('.tick text')
        .attr('transform', function() {
          return 'rotate(' + (direction === 'x' ? -90 : 0) + ')';
        })
        .style('text-anchor', function() {
          return (direction === 'x' ? 'end' : 'end');
        })
        .call(wrap, maxTextWidth, xOffset);
    };

    return new BlChartFactory.Component({
      template: '<g ng-attr-height="{{layout.height}}" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}}, {{translate.y}})"></g>',
      scope: {
        direction: '=',
        title: '=?',
        orderBy: '=?'
      },
      link: function(scope, iElem, iAttrs, graphCtrl) {
        // Ensure that the direction is passed in as lowercase
        if (scope.direction !== scope.direction.toLowerCase()) {
          throw new Error('The axis direction must be lowercase or very little will work.');
        }
        var axisType = scope.direction + 'Axis';

        var axisContainer = d3.select(iElem[0])
          .attr('class', 'bl-axis ' + scope.direction)
          .attr('width', BlLayoutDefaults.components.yAxis.width);

        graphCtrl.componentsMgr.register(axisType, {
          direction: scope.direction
        });

        scope.$on(blGraphEvents.DRAW, function() {
          scope.layout = graphCtrl.layoutMgr.layout[axisType];
          scope.translate = BlTranslate.axis(graphCtrl.layoutMgr.layout, graphCtrl.componentsMgr.registered, scope.direction);
          drawAxis(graphCtrl.scaleMgr, scope.direction, axisContainer, scope.layout);
        });
      }
    });
  });