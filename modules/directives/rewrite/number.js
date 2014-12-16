/**
 * @ngdoc directive
 * @name dataviz.rewrite:blNumber
 * @restrict E
 * @element bl-number
 *
 * @description
 * Shows a large text number.
 *
 * @example
 <example module="dataviz.rewrite">
 <file name="index.html">
 <div>
 Height: <input type="number" ng-model="height"><br />
 Width: <input type="number" ng-model="width">
 </div>
 <div>
   <div class="graph-wrapper" ng-init="width = 500; height = 200;">
     <bl-graph container-height="height" container-width="width">
        <bl-number content="'1234'"></bl-number>
     </bl-graph>
   </div>
 </div>
 </file>
 </example>
 */
angular.module('dataviz.rewrite')
  .directive('blNumber', function(ChartFactory, components, Layout) {

    var resizeText = function(d, i) {
      var iEl = angular.element(this[0]);
      var parent = iEl.closest('svg');
      var maxTries = 100;

      var firstElBigger = function(el1, el2) {
        return el1.width() > el2.width() || el1.height() > el2.height();
      };

      var getFontSize = function(el) {
        return parseInt(el.attr('font-size'), 10);
      };

      var fs = getFontSize(iEl);


      if (firstElBigger(iEl, parent)) {
        // If number is too big for the box, make it progressively smaller
        while (firstElBigger(iEl, parent) && maxTries) {
          maxTries -= 1;
          fs = getFontSize(iEl);
          iEl.attr('font-size', fs - 1)
        }
      } else {
        // If number is too small for the box, make it progressively bigger
        while(!firstElBigger(iEl, parent) && maxTries) {
          maxTries -= 1;
          fs = getFontSize(iEl);
          iEl.attr('font-size', fs + 1);
        }
      }

      iEl.attr('y', function() { return fs });
      iEl.attr('x', function() {
        return (iEl.width() / w) + ((parent.width() - iEl.width()) / 2);
      });
    };

    return new ChartFactory.Component({
      //template: '<text class="bl-number chart" ng-attr-height="{{layout.height}}" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}}, {{translate.y}})">{{text}}</text>',
      template: '<text class="bl-number chart" font-size="250px"></text>',
      scope: {
        content: '='
      },
      link: function(scope, iElem, iAttrs, controllers) {
        var COMPONENT_TYPE = components.graph;
        var graphCtrl = controllers[0];
        graphCtrl.components.register(COMPONENT_TYPE);

        scope.layout = graphCtrl.layout.graph;
        //scope.translate = Translate.graph(graphCtrl.layout, graphCtrl.registered, COMPONENT_TYPE);

        w = scope.layout.height;
        h = scope.layout.width;

        //scope.$watch('content', function(nv, ov) {
        //  if (nv === ov) { return; }
        //});

        // start the font-size at 250, calc the width and see if it's over

        var text = d3.select(iElem[0])
          .attr('font-family', 'Verdana')
          .text(scope.content)
          .call(resizeText);

        scope.$on(Layout.DRAW, function() {
          text.call(resizeText);
        })
      }
    });
  });
