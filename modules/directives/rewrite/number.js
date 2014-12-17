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
 <example module="test">
 <file name="index.html">
 <div ng-controller="dataController">
 <div>
 Data: {{data}}<br />
 Height: <input type="number" ng-model="height"><br />
 Width: <input type="number" ng-model="width">
 </div>
 <div class="graph-wrapper">
 <bl-graph container-height="height" container-width="width" resource="resource">
  <bl-number></bl-axis>
 </bl-graph>
 </div>
 </div>
 </file>
 <file name="script.js">
 angular.module('test', ['dataviz.rewrite'])
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
angular.module('dataviz.rewrite')
  .directive('blNumber', function(ChartFactory, chartTypes, Layout, FormatUtils) {
    return new ChartFactory.Component({
      //template: '<text class="bl-number chart" ng-attr-height="{{layout.height}}" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}}, {{translate.y}})">{{text}}</text>',
      template: '<text class="bl-number chart" font-size="250px"></text>',
      link: function(scope, iElem, iAttrs, controllers) {
        var COMPONENT_TYPE = chartTypes.number;
        var graphCtrl = controllers[0];
        var data = graphCtrl.data;
        var format = FormatUtils.getFormatFunction(data, 'plain');
        graphCtrl.components.register(COMPONENT_TYPE);

        scope.layout = graphCtrl.layout.graph;
        //scope.translate = Translate.graph(graphCtrl.layout, graphCtrl.registered, COMPONENT_TYPE);

        w = scope.layout.height;
        h = scope.layout.width;

        var text = d3.select(iElem[0])
          .attr('font-family', 'Verdana')
          .text(function() { return format(data); })
          .call(FormatUtils.resizeText);

        // If the content unit changes, update the formatting function
        scope.$watch('content', function() {
          format = FormatUtils.getFormatFunction(graphCtrl.data);
        });

        scope.$on(Layout.DRAW, function() {
          text.call(FormatUtils.resizeText);
        });
      }
    });
  })
  .factory('FormatUtils', function() {
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
          iEl.attr('font-size', fs - 1);
        }
      } else {
        // If number is too small for the box, make it progressively bigger
        while(!firstElBigger(iEl, parent) && maxTries) {
          maxTries -= 1;
          fs = getFontSize(iEl);
          iEl.attr('font-size', fs + 1);
        }
      }

      iEl.attr('y', function() {
        var heightDiff = parent.height() - iEl.height();
        return heightDiff / 2 + fs;
      });
      iEl.attr('x', function() {
        return (iEl.width() / w) + ((parent.width() - iEl.width()) / 2);
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
        }
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
