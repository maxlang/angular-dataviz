angular.module('dataviz.directives').directive('aNumber', ['$timeout', 'VizUtils', function($timeout, VizUtils) {
  return {
    restrict: 'E',
    scope: {
      data: '=',
      params: '='
    },
    link: function(scope, element) {
//      angular.module('demon.number', []);
//
//      angular.module('demon.number').directive('demonNumberViz', ['$timeout', function($timeout) {
//        return {
//          restrict: 'E',
//          scope: {
//            data: '=',
//            params: '='
//          },
//          template: '<div ng-if=\'params.options.pie=="simple" || params.options.units!="%"\' class="value-holder">' +
//              '<div ng-if="params.options.units == \'$\'" class="num-viz-dollars">$</div>' +
//              '<p class="num-viz-val" ng-bind="data.value"></p>' +
//              '<div ng-if="params.options.units == \'%\'" class="num-viz-percent">%</div>' +
//              '</div>' +
//
//              '<div ng-show=\'params.options.pie=="pie" && params.options.units=="%"\' class="value-holder">' +
//
//              '<div class="chart" data-percent="0">{{ data.value }}%</div>' +
//              '</div>',
//          link: function(scope, element) {
//
//            var originalSize = scope.params && scope.params.options && Math.min(scope.params.options.heightPx, scope.params.options.widthPx) || 175;
//
//
//            $(element[0]).find('.chart').easyPieChart({
//              size:scope.params && scope.params.options && scope.params.options.widthPx || 175,
//              barColor:'#2161A4',
//              animate:500
//            });
//
//            scope.$watch('data.origVal', function(val) {
//              if (_.isNumber(val)) {
//                if ($(element[0]).find('.chart').data('easyPieChart')) {
//                  $(element[0]).find('.chart').data('easyPieChart').update(val * 100);
//                }
//              }
//            }, true);
//
//
//
//            function adjustZoom () {
//              var newSize = scope.params && scope.params.options && Math.min(scope.params.options.heightPx, scope.params.options.widthPx) || 175;
//              var ratio = newSize/originalSize;
//              $(element[0]).find('.chart').css('zoom', ratio);
//            }
//
//            scope.$watch('params.options.heightPx', adjustZoom);
//            scope.$watch('params.options.widthPx', adjustZoom);
//          }
//        };
//      }]);
      var o = VizUtils.genOptionGetter(scope,{
        'widthPx' : 175,
        'heightPx' : 175,
        'margins' : {top: 10, left: 10, right: 10, bottom: 10},
        'pie' : "simple",
        'units': "",
        'fontSize': null,
        'bottomRight': false
      });
      var initialized = false;

      scope.$watch('data', function(data, oldData) {
        if(!initialized) {
          init(data);
        }
        change();
      }, true);

      scope.$watch('params', function(params) {
        //reinit if certain things change like colors
        change();
      }, true);

      var width, height, margins, w, h, svg, g, text, format;

      var calcInfo = function(data) {
        width = o('widthPx');
        height = o('heightPx');
        margins = o('margins');

        w = width - margins.left - margins.right;
        h = height - margins.top - margins.bottom;
        var v = parseFloat(data.value);
        var prefix = d3.formatPrefix(v);
        var scaledValue = prefix.scale(v);
        //var hasDecimal = Math.floor(scaledValue) !== scaledValue;
        var digits = (scaledValue + '').replace(/-\./g,'').length;
        var p = Math.min( digits, 3);
        if (o('units') !== 'time') {
          format = function(value) {
            return moment.duration(value).humanize().replace((/^an?/),'1').replace((/1 few /),'~1')
                .replace((/seconds?/),'s')
                .replace((/minutes?/),'m')
                .replace((/hours?/),'h')
                .replace((/days?/),'d')
                .replace((/weeks?/),'w')
                .replace((/months?/),'mon')
                .replace((/years?/),'y');
          };
        } else if (o('units') !== '%') {
          format = d3.format((o('units')==='$' ? '$' : '') +  '.' + p + 's');
        } else {
          p = Math.min( digits, 5);
          p = Math.max(0,p - 2);
          format = d3.format('.' + (p - 2) + '%');
        }

      };

      function resizeText(d, i) {
        var e;
        if (_.isArray(this) && this.size() > 0) {
          e = this[0][0];
        } else if (!_.isArray(this)) {
          e = this;
        } else {
          return;
        }
        var elt = $(e);
        var times = 100;
        var fs = parseInt(window.getComputedStyle(e, null)['font-size'], 10);
          if (!o('fontSize')) {

            if (parseInt(elt.width() || e.getBBox().width, 10) > w || parseInt(elt.height() || e.getBBox().height, 10) > h) {
            while ((parseInt(e.getBBox().width, 10) > w || parseInt(e.getBBox().height, 10) > h) && fs > 30 && times > 0) {
              fs = parseInt(window.getComputedStyle(e, null)['font-size'], 10);
              times -= 1;
              elt.css('font-size', fs - 1);
            }
          } else {
            while ((parseInt(elt.width() || e.getBBox().width, 10) < w && parseInt(elt.height() || e.getBBox().height, 10) < h) && fs < 400 && times > 0) {
              fs = parseInt(window.getComputedStyle(e, null)['font-size'], 10);
              times -= 1;
              elt.css('font-size', fs + 1);
            }
          }
        }
//        elt.attr('dy', '1em');
        elt.attr('y', (o('bottomRight') ? h : h - (h - fs)/2 ));
      }

      function init(data) {
        $(element[0]).html('<svg></svg>');

        calcInfo(data);

        svg = d3.select(element[0]).select("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", o('textColor'))
            .attr("fill-opacity",o('fillOpacity'))
            .style("background-color", o('bgColor'));
        g = svg.append('g')
            .classed('main', true)
            .attr('width', w)
            .attr('height', h)
            .attr('transform', 'translate(' + margins.left + ', ' + margins.top + ')');

        text = g.selectAll('text');

        initialized = true;
      }

      function change() {
        calcInfo(scope.data);

        svg.transition().duration(300)
            .attr("width", width)
            .attr("height", height)
            .attr("fill", o('textColor'))
            .attr("fill-opacity",o('fillOpacity'))
            .style('font-weight', 'bold')
            .style("background-color", o('bgColor'));
        g.transition().duration(300)
            .attr('width', w)
            .attr('height', h)
            .attr('transform', 'translate(' + margins.left + ', ' + margins.top + ')');

        text = text.data([scope.data.value || 0], key);

        text.enter().append('text')
            .classed('value', true)
            .attr('fill', o('textColor'))
            .attr('fill-opacity', o('fillOpacity'))
            .attr('x', o('bottomRight') ? w : w/2)
            .style('font-size',o('font-size') || "250px")
            .attr('text-anchor', o('bottomRight') ? 'end' : 'middle')
            .each(function(d){
              this.__lastData = d;
            })
            .text(function(d,i) {
              return format(d).replace("G", "B");
            })
//            .attr('dy', '1em')
            .call(resizeText)
            .append("title")
            .text(function(d) {return d3.format(",")(d);});



        text.exit().transition().duration(300).remove();

        //tween copied from: http://phrogz.net/svg/d3-circles-with-html-labels.html

        text.transition().duration(300)
            .attr('fill', o('textColor'))
            .attr('fill-opacity', o('fillOpacity'))
            .attr('x', o('bottomRight') ? w : w/2)
            .tween("text", function(d) {
              var last = this.__lastData;
              var tI = d3.interpolateNumber(parseFloat(last) || 0, parseFloat(d) || 0);
              return function(t){
                this.textContent = format(tI(t)).replace("G","B");
              };
            })
            .each('end', function(d){
              this.__lastData = d;
                d3.select(this).style('font-size', o('fontSize'));
                d3.select(this).call(resizeText);

              d3.select(this).append("title")
                  .text(function(d) {return d3.format(",")(d);});
            });

      }

      function key(d, i) {
        return i;
      }

    }
  };
}]);
