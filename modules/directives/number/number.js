/**
 * @ngdoc directive
 * @name dataviz:blNumber
 * @restrict E
 * @element bl-number
 *
 * @description
 * Shows a large text number.
 *
 * @example
 <example module="test">
 <file name="index.html">
 <div ng-controller="dataController">
 <div>
 Data: {{data}}<br />
 Height: <input type="number" ng-model="height"><br />
 Width: <input type="number" ng-model="width">
 </div>
 <div class="graph-wrapper">
 <bl-group>
   <bl-graph container-height="height" container-width="width" resource="resource">
    <bl-number></bl-number>
  </bl-graph>
 </bl-group>
 </div>
 </div>
 </file>
 <file name="script.js">
 angular.module('test', ['dataviz'])
 .controller('dataController', function($scope) {
      $scope.resource = {
        data: 1234
      };
      $scope.width = 500;
      $scope.height = 300;
    });
 </file>
 </example>
 */
angular.module('dataviz')
  .directive('blNumber', function(BlChartFactory, chartTypes, BlLayout, FormatUtils) {
    return new BlChartFactory.Component({
      //template: '<text class="bl-number chart" ng-attr-height="{{layout.height}}" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}}, {{translate.y}})">{{text}}</text>',
      template: '<text class="bl-number chart" font-size="250px"></text>',
      scope: {
        aggregate: '=?' // TODO: This should eventually look like: aggFunc(aggField); e.g. count('_id').
      },
      link: function(scope, iElem, iAttrs, controllers) {
        var COMPONENT_TYPE = chartTypes.number;
        var graphCtrl = controllers[0];

        // If this is an agg, data will look like an object with count, min, max, avg, and sum attributes
        var format = FormatUtils.getFormatFunction(graphCtrl.data.grouped, 'plain');
        graphCtrl.components.register(COMPONENT_TYPE, {aggregate: scope.aggregate});
        scope.layout = graphCtrl.layout.graph;
        var text = d3.select(iElem[0]);
        //scope.translate = BlTranslate.graph(graphCtrl.layout, graphCtrl.registered, COMPONENT_TYPE);

        function drawNumber() {
          text
            .attr('font-family', 'Verdana')
            .text(function() { return format(graphCtrl.data.grouped[scope.aggregate]); })
            .call(FormatUtils.resizeText, graphCtrl.layout);
        }

        scope.$watch('aggregate', function(nv, ov) {
          if (nv === ov) { return; }
          graphCtrl.components.update(COMPONENT_TYPE, {aggregate: scope.aggregate});
        });

        scope.$on(BlLayout.DRAW, drawNumber);
      }
    });
  })
  .factory('FormatUtils', function(BlLayoutDefaults) {
    var biggerThanBoundingBox = function(el, layoutDims) {
      return el.getBBox().width > layoutDims.width || el.getBBox().height > layoutDims.height;
    };

    var getFontSize = function(iEl) {
      return parseInt(iEl.attr('font-size'), 10);
    };

    var resizeText = function(elem, layout) {
      // Note (il via ml): Get the non-jQuery'd/d3'd element because getBBox (native SVG method) is way more
      // accurate than jQuery's .width() in this case.
      var e = this.node();
      if (!e) { return; }
      var layoutDims = layout.graph;

      var iEl = angular.element(e);
      var svg = iEl.closest('svg')[0];
      var maxTries = 100;
      var numPadding = BlLayoutDefaults.padding.number;
      var fs = getFontSize(iEl);

      if (biggerThanBoundingBox(e, layoutDims)) {
        // If number is too big for the box, make it progressively smaller
        while (biggerThanBoundingBox(e, layoutDims) && maxTries) {
          maxTries -= 1;
          fs = getFontSize(iEl);
          iEl.attr('font-size', fs - 1);
        }
      } else {
        // If number is too small for the box, make it progressively bigger
        while(!biggerThanBoundingBox(e, layoutDims) && maxTries) {
          maxTries -= 1;
          fs = getFontSize(iEl);
          iEl.attr('font-size', fs + 1);
        }
      }

      iEl.attr('y', function() {
        return layoutDims.height - (layoutDims.height - fs)/2;
      });

      iEl.attr('x', function() {
        var eWidth = e.getBBox().width;
        var widthDiff = layoutDims.width - eWidth;
        return widthDiff / 2 + numPadding.left;
      });
    };

    var getFormatFunction = function(numToParse, forcedType) {
      // Determine whether unit type is: 'time' / '$', '', '%'
      // Returns a d3-style function return

      var v = parseFloat(numToParse);
      var prefix = d3.formatPrefix(v);
      var scaledValue = prefix.scale(v);
      var digits = (scaledValue + '').replace(/-\./g,'').length;
      var p = Math.min(digits, 3);

      if (forcedType === 'plain') {
        return function(value) {
          return value;
        };
      }

      if (moment(numToParse).isValid()) {
        // Date
        return function(value) {
          return moment.duration(value).humanize().replace((/^an?/),'1').replace((/1 few /),'~1')
            .replace((/seconds?/),'s')
            .replace((/minutes?/),'m')
            .replace((/hours?/),'h')
            .replace((/days?/),'d')
            .replace((/weeks?/),'w')
            .replace((/months?/),'mon')
            .replace((/years?/),'y');
        };
      } else {
        p = Math.min( digits, 5);
        p = Math.max(0,p - 2);
        return d3.format('.' + (p - 2) + '%');
      }
    };

    return {
      resizeText: resizeText,
      getFormatFunction: getFormatFunction
    };
  })
;
