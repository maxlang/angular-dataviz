angular.module('dataviz')
  .directive('blTitle', function(BlChartFactory, componentTypes, BlLayoutDefaults, blGraphEvents) {
    return new BlChartFactory.Component({
      template: '<text class="graph-title" ng-attr-transform="translate({{translate.x}}, {{translate.y}})">{{title}}</text>',
      scope: {
        title: '@'
      },
      require: '^blGraph',
      link: function(scope, iElem, iAttrs, graphCtrl) {
        graphCtrl.componentsMgr.register(componentTypes.title);

        // The text needs to be centered and positioned at the top
        function drawTitle(){
          var containerWidth = graphCtrl.layoutMgr.layout.container.width;
          var elemWidth = d3.select(iElem[0]).node().getComputedTextLength();

          scope.translate = {
            x: Math.floor((containerWidth - elemWidth) / 2),
            y: BlLayoutDefaults.padding.title.top
          };
        }

        scope.$on(blGraphEvents.DRAW, drawTitle);
      }
    });
  })
;
