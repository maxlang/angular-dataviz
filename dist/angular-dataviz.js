angular.module('dataviz.rewrite', ['dataviz.rewrite.services']);
//angular.module('dataviz.directives', ['ui.map']);
//angular.module('dataviz', ['dataviz.directives']);

angular.module('dataviz.rewrite')
  .directive('blAxis', function(LayoutDefaults, ChartFactory, Translate, Layout) {
    var getOffsetX = function(direction) {
      return direction === 'x' ? 0 : -12;
    };

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
        .orient(direction === 'y' ? 'left' : 'bottom');

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
          drawAxis(graphCtrl.scale, scope.direction, axisContainer, scope.layout);
        });
      }
    });
  });
angular.module('dataviz.rewrite')
  .directive('blBarchart', function(ChartFactory, Layout, chartTypes, Translate) {

    var clickFn = function(d, addFilter) {
      addFilter('includes', d.key);
    };

    return new ChartFactory.Component({
      template: '<g class="bl-barchart chart" ng-attr-height="{{layout.height}}" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}},{{translate.y}})"></g>',
      scope: {},
      link: function(scope, iElem, iAttrs, controllers) {
        var graphCtrl = controllers[0];
        var COMPONENT_TYPE = chartTypes.barchart;
        var g = d3.select(iElem[0]);

        graphCtrl.components.register(COMPONENT_TYPE);

        function drawChart() {
          scope.layout = graphCtrl.layout.chart;
          scope.translate = Translate.graph(scope.layout, graphCtrl.components.registered, COMPONENT_TYPE);

          var bars = g.selectAll('rect').data(graphCtrl.data.grouped);

          // Do this for all the
          bars.enter().append('rect')
            .classed('bar', true)
            .attr('x', 0)
            .attr('stroke-width', '0px')
            .classed('selected', function(d, i) {
              return true;
              //return _.contains(scope.params.filter, d.key);
            })
            .on('click', function(d, i) {
              var boundAddFilter = graphCtrl.filters.addFilter.bind(graphCtrl.filters);
              clickFn.call(this, d, boundAddFilter);
            });

          bars
            .attr('y', function(d) { return graphCtrl.scale.y(d.key); })
            .attr('width', function(d) { return graphCtrl.scale.x(d.value); })
            .attr('height', Math.abs(graphCtrl.scale.y.rangeBand()));

          bars
            .exit()
            .remove();
        }

        scope.$on(Layout.DRAW, drawChart);
      }
    });
  });
angular.module('dataviz.rewrite')
  .directive('blGraph', function(Layout, $timeout, RangeFunctions, chartTypes, componentTypes, ChartHelper, LayoutDefaults, FilterService, AQLRunner) {
    var groupCtrl;

    var setScale = function(metadata, xRange, yRange, chartType) {
      var scales = {};
      var getXScale = function(metadata, xRange) {
        // check to see if the data is linear or time-based
        if (!metadata.isTime) {
          return d3.scale.linear()
            .domain(metadata.range)
            .range(xRange);
        } else {
          return d3.time.scale()
            .domain(metadata.range)
            .range(xRange);
        }
      };

      // All charts use a linear scale on x. I doubt this is actually true.
      scales.x = getXScale(metadata, xRange);

      scales.x = d3.scale.linear()
        .domain(metadata.domain)
        .range(xRange);

      // Define the Y scale based on whether the chart type is ordinal or linear
      if (!ChartHelper.isOrdinal(chartType)) {
        console.log('metadata is: ', metadata);
        scales.y = d3.scale.linear()
          .domain(metadata.range)
          .range(yRange);
      } else {
        scales.y = d3.scale.ordinal()
          .domain(metadata.range)
          .rangeRoundBands(yRange, 0.1, 0);
      }

      return scales;
    };

    var isChart = function(componentType) {
      return _.contains(chartTypes, componentType);
    };

    var isAxis = function(componentType) {
      return _.contains(componentType.toLowerCase(), componentTypes.axis);
    };

    var getScaleDims = function(graphLayout) {
      return {
        x: [0, graphLayout.width - LayoutDefaults.padding.graph.right],
        y: [graphLayout.height - 10, 0]
      };
    };

    return {
      restrict: 'E',
      require: ['^blGroup'],
      replace: true,
      transclude: true,
      template:'<svg class="bl-graph" ng-attr-width="{{layout.width}}" ng-attr-height="{{layout.height}}"></svg>',
      scope: {
        resource: '@',
        refresh: '@?',
        containerHeight: '=',
        containerWidth: '=',
        interval: '=?',
        aggregateBy: '@',
        field: '@',
        aggFunction: '@'
      },
      compile: function() {
        return {
          pre: function(scope, iElem, iAttrs, ctrls, transclude) {
            transclude(scope, function(clone) {
              iElem.append(clone);
             });
            groupCtrl = ctrls[0];
          },
          post: function(scope, iElem) {
            scope.componentCount = iElem.children().length;
          }
        };
      },
      controller: function($scope, $element, $attrs) {
        var ctrl = this;
        var hasRun = false;
        this.layout = Layout.getDefaultLayout($scope.containerHeight, $scope.containerWidth);
        $scope.layout = this.layout.container;
        this.interval = $scope.interval;
        this.query = new AQL.SelectQuery($scope.resource);
        this._id = _.uniq();
        this.data = {};
        this.scale = {};
        this.fields = {};
        this.filters = {
          includes: [],
          excludes: [],
          addFilter: function(type, term) {
            // To be clear, 'type' here is going to be either 'includes' or 'excludes'
            // So we're adding inclusion/exclusion filters
            this.toggleTerm(type, term);
            var filter = new AQL.TermFilter($scope.field, this[type]);
            groupCtrl.filters.registerFilter(filter);
          },
          toggleTerm: function(type, term) {
            var termIndex = _.findIndex(this[type], term);

            if (termIndex < 0) {
              this[type].push(term);
            } else {
              this[type].splice(termIndex, 1);
            }
          }
        };

        this.components = {
          registered: [],
          register: function(componentType, params) {
            this.registered.push(componentType);
            var self = this;

            if (isChart(componentType)) {
              var group;
              ctrl.chartType = componentType;

              if (ChartHelper.isOrdinal(componentType)) {
                // It's ordinal, set an interval and use intervalGroup
                group = ctrl.query.termGroup($scope.field);
              } else {
                // Use termGroup
                group = ctrl.query.intervalGroup($scope.field, $scope.interval);
              }

              if ($scope.aggFunction && $scope.aggregateBy) {
                group[$scope.aggFunction + 'Aggregation']($scope.aggregateBy);
              }


            } else if (isAxis(componentType)) {
              ctrl.fields[params.direction] = params.field;
            }

            $timeout(function() {
              if (self.registered.length === $scope.componentCount && !hasRun) {
                hasRun = true;
                AQLRunner(ctrl.query)
                  .success(function(data) {
                    ctrl.data.grouped = data;
                    //if (!ChartHelper.isOrdinal(componentType)) {
                    //  ctrl.data.grouped = _.each(ctrl.data.grouped, function(v) {
                    //    v.key = parseInt(v.key, 10);
                    //  });
                    //}

                    $scope.metadata = RangeFunctions.getMetadata(ctrl.data.grouped, ctrl.chartType);
                    ctrl.layout = Layout.updateLayout(self.registered, ctrl.layout);

                    var scaleDims = getScaleDims(ctrl.layout.graph);
                    ctrl.scale = setScale($scope.metadata, scaleDims.x, scaleDims.y, ctrl.chartType);
                    $scope.$broadcast(Layout.DRAW);
                  })
                  .error(function(err) {
                    console.error('error pulling data: ', err);
                  });
              }
            });
          }
        };

        $scope.$watch('[containerHeight, containerWidth]', function(nv, ov) {
          if (angular.equals(nv, ov)) { return; }

          var height = nv[0];
          var width = nv[1];

          ctrl.layout = Layout.updateLayout(ctrl.components.registered, Layout.getDefaultLayout(height, width));
          $scope.layout = ctrl.layout.container;
          var scaleDims = getScaleDims(ctrl.layout.graph);
          ctrl.scale = setScale($scope.metadata, scaleDims.x, scaleDims.y, ctrl.chartType);
          $scope.$broadcast(Layout.DRAW);
        });

        $scope.$on(FilterService.FILTER_CHANGED, function() {
          // Clear existing filters
          ctrl.query.filters = [];
          $scope.filters = groupCtrl.filters.getAllFilters();

          // Add all filters except for the current field's
          var newFilterSet = FilterService.groupFiltersExcept($scope.field, groupCtrl.filters.getAllFilters());
          console.log('newFilterSet is: ', newFilterSet);

          if (!newFilterSet.value) {
            ctrl.query.filters = [];
          } else {
            ctrl.query.addFilter(FilterService.groupFiltersExcept($scope.field, groupCtrl.filters.getAllFilters()));
          }


          // Repull the data
          AQLRunner(ctrl.query)
            .success(function(data) {
              ctrl.data.grouped = data;
              $scope.metadata = RangeFunctions.getMetadata(ctrl.data.grouped, ctrl.chartType);

              var scaleDims = getScaleDims(ctrl.layout.graph);
              ctrl.scale = setScale($scope.metadata, scaleDims.x, scaleDims.y, ctrl.chartType);

              $scope.$broadcast(Layout.DRAW);

            })
            .error(function(err) {
              console.error('Error running AQL query: ', err);
            });
        });

      }
    };
  })
;

angular.module('dataviz.rewrite')
  .directive('blGroup', function(FilterService) {
    return {
      restrict: 'E',
      transclude: true,
      replace: true,
      scope: {
        filters: '='
      },
      template: '<div class="bl-group" ng-transclude></div>',
      controller: function($scope) {
        $scope.filters = this.filters = {
          filterStore: {},
          registerFilter: function(aqlFilterObj) {
            this.filterStore[aqlFilterObj.expr] = aqlFilterObj;
            $scope.$broadcast(FilterService.FILTER_CHANGED);
          },
          getAllFilters: function() {
            return this.filterStore;
          }
        };

      }
    };
  })
;

angular.module('dataviz.rewrite')
  .directive('blHistogram', function(ChartFactory, Translate, Layout, chartTypes, HistogramHelpers) {
    var histConfig = {
      bars: {
        minWidth: 1,
        padding: 1
      }
    };

    var clickFn = function(d, addFilter) {
      addFilter('includes', d.key);
    };

    return new ChartFactory.Component({
      template: '<g class="bl-histogram chart" ng-attr-height="{{layout.height}}" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}},{{translate.y}})"></g>',
      scope: {
        numBars: '@?'
      },
      link: function(scope, iElem, iAttrs, controllers) {
        var COMPONENT_TYPE = chartTypes.histogram;
        var graphCtrl = controllers[0];
        graphCtrl.components.register(COMPONENT_TYPE);
        var g = d3.select(iElem[0]);

        function drawHist() {
          scope.layout = graphCtrl.layout.graph;
          scope.translate = Translate.graph(scope.layout, graphCtrl.components.registered, COMPONENT_TYPE);
          var barWidth = HistogramHelpers.getBarWidth(graphCtrl.data.grouped, scope.layout, histConfig);

          var bars = g.selectAll('rect').data(graphCtrl.data.grouped);

          // Do this for all the
          bars.enter().append('rect')
            .classed('bar', true)
            .attr('y', 0)
            .attr('stroke-width', '0px')
            .attr('fill', 'steelblue')
            .classed('selected', function(d, i) {
              return true;
              //return _.contains(scope.params.filter, d.key);
            })
            .on('click', function(d, i) {
              var boundAddFilter = graphCtrl.filters.addFilter.bind(graphCtrl.filters);
              clickFn.call(this, d, boundAddFilter);
            });

          bars
            .transition().duration(300)
            .attr('x', function(d, i) {
              return graphCtrl.scale.x(d.key);
            })
            .attr('width', function(d) { return barWidth; })
            .attr('height', function(d) {
              return graphCtrl.scale.y(d.value);
            })
            .attr('transform', function(d) {
              return 'translate(0,'+ (scope.layout.height - graphCtrl.scale.y(d.value) - 10)  +')';
            });


          bars
            .exit()
            .transition().duration(300)
            .attr('height', 0)
            .remove();
        }

        scope.$on(Layout.DRAW, drawHist);

      }
    });
  })

  .factory('HistogramHelpers', function() {
    var getBarWidth = function(data, layout, histConfig) {
      var idealWidth = Math.floor(layout.width / data.length) - histConfig.bars.padding;
      return (idealWidth > histConfig.bars.minWidth) ? idealWidth : histConfig.bars.minWidth;
    };

    var getNumBars = function(barOverride, data, interval) {
      if (barOverride) { return barOverride || data.length; }

      interval = interval || 1;
      var keys = _.pluck(data, 'key');
      var maxKey = _.max(keys);
      var minKey = _.min(keys);
      return Math.ceil((maxKey - minKey) / interval) + 1;
    };

    return {
      getBarWidth: getBarWidth,
      getNumBars: getNumBars
    };
  })
;

angular.module('dataviz.rewrite')
  .directive('blLegend', function(ChartFactory, Translate, Layout, LayoutDefaults, componentTypes) {
    return new ChartFactory.Component({
      template: '<g class="bl-legend" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}}, {{translate.y}})"></g>',
      link: function(scope, iElem, iAttrs, controllers) {
        // graphCtrl is responsible for communicating the keys and values in a fairly simple way to the legend
        var graphCtrl = controllers[0];
        var COMPONENT_TYPE = componentTypes.legend;
        var seriesData = ['Loans'];
        graphCtrl.components.register(COMPONENT_TYPE);
        var RECT_SIZE = 18;

        function drawLegend() {
          scope.layout = graphCtrl.layout.legend;
          scope.translate = Translate.legend(graphCtrl.layout, graphCtrl.components.registered, COMPONENT_TYPE);
        }

        var legend = d3.select(iElem[0])
          .attr('height', function(d) { return 100; });

        // set up the series tags
        var series = legend.selectAll('.series')
          .data(seriesData)
          .enter()
          .append('g')
          .attr('class', 'series')
          .attr('height', function(d) { return RECT_SIZE + LayoutDefaults.padding.legend.series.bottom; })
          .attr('width', '100%')
          .attr('transform', function(d, i) {
            var height = RECT_SIZE + LayoutDefaults.padding.legend.series.bottom;
            var horz = 0;
            var vert = i * height;
            return 'translate(' + horz + ',' + vert + ')';
          });

        series.append('rect')
          .attr('width', RECT_SIZE)
          .attr('height', RECT_SIZE)
          .attr('fill', 'steelblue')
          .attr('stroke', 'none');

        series.append('text')
          .attr('x', RECT_SIZE + 5)
          .attr('font-size', 14)
          .attr('y', 14)
          .text(function(d) { console.log(d); return d; });

        scope.$on(Layout.DRAW, drawLegend);
      }
    });
  })

  .factory('LegendFactory', function() {
    var Legend = function(config) {
      this.label = config.label;
      this.visualization = {
        type: config.vizType,
        color: config.color
      };
    };

    return {
      Legend: Legend
    };
  });

// resource for namespacing all the fields
// the line is declaratively told which field to aggregate on

angular.module('dataviz.rewrite')
  .directive('blLine', function(ChartFactory, Translate, Layout, chartTypes) {

    // setLine expects scales = {x: d3Scale, y: d3Scale}, fields: {x: 'fieldName', y: 'fieldName'}
    var setLine = function(scales, fields) {
      return d3.svg.line()
        .x(function(d) { return scales.x(d[fields.x]); })
        .y(function(d) { return scales.y(d[fields.y]); })
        .interpolate('linear');
    };

    var lineConfig = {
      circleRadius: 3
    };

    return new ChartFactory.Component({
      template:
      '<g ng-attr-width="{{layout.width}}" ng-attr-height="{{layout.height}}" class="bl-line chart">' +
        '<path ng-attr-transform="translate({{translate.x}}, {{translate.y}})"></path>' +
      '</g>',
      scope: {
        fieldX: '=',
        fieldY: '='
      },
      link: function(scope, iElem, iAttrs, controllers) {
        var COMPONENT_TYPE = chartTypes.linechart;
        var graphCtrl = controllers[0];
        graphCtrl.components.register(COMPONENT_TYPE);
        scope.layout = graphCtrl.layout.graph;
        var path = d3.select(iElem[0]).select('path'); // strip off the jquery wrapper
        var groupEl = d3.select(iElem[0]); // get the group element to append dots to

        function drawLine() {
          scope.layout = graphCtrl.layout.graph;
          scope.line = setLine(graphCtrl.scale, {x: scope.fieldX, y: scope.fieldY});
          scope.translate = Translate.graph(graphCtrl.layout, graphCtrl.components.registered, COMPONENT_TYPE);
          path
            .transition().duration(300)
            .attr('d', scope.line(graphCtrl.data.grouped));

          var tip = d3.tip()
            .attr('class', 'viz-tooltip')
            .offset([-30, 0])
            .html(function(d) {
              return '<span class="tip-text">' + d[scope.fieldX] + '</span>' +
                '<span class="tip-text">' + d[scope.fieldY] + '</span>';
            });

          var dots = groupEl.selectAll('g.dot')
            .data(graphCtrl.data.grouped)
            .enter().append('g')
            .attr('class', 'dot')
            .selectAll('circle')
            .data(graphCtrl.data.grouped)
            .enter().append('circle')
            .attr('r', lineConfig.circleRadius);

          groupEl.call(tip);

          groupEl.selectAll('g.dot circle')
            .attr('cx', function(d) { return graphCtrl.scale.x(d[scope.fieldX]); })
            .attr('cy', function(d) { return graphCtrl.scale.y(d[scope.fieldY]); })
            .attr('transform', function() { return 'translate(' + scope.translate.x + ', ' + scope.translate.y + ')'; })
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);

          dots
            .data(graphCtrl.data.grouped)
            .exit().remove();
        }

        scope.$on(Layout.DRAW, drawLine);
      }
    });
  })
;

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

// Lovingly borrowed from: http://jsfiddle.net/ragingsquirrel3/qkHK6/
angular.module('dataviz.rewrite')
    .directive('blPie', function(ChartFactory, chartTypes) {
      return new ChartFactory.Component({
        template: '<g class="bl-pie chart" ng-attr-width="{{layout.width}}" ng-attr-height="{{layout.height}}" ng-attr-transform="translate({{translate.x}}, {{translate.y}})" class="bl-pie"></g>',
        link: function(scope, iElem, iAttrs, controllers) {
          var graphCtrl = controllers[0];
          var COMPONENT_TYPE = charts.pie;

          graphCtrl.components.register(COMPONENT_TYPE);

          // With modifications
          var diameter = Math.min(graphCtrl.layout.graph.height, graphCtrl.layout.graph.width);
          scope.layout = {
            width: diameter,
            height: diameter,
            radius: Math.floor(diameter/2)
          };

          scope.translate = {
            x: scope.layout.radius,
            y: scope.layout.radius
          };

          console.log('scope is: ', scope);

          var color = d3.scale.category20c();

          var data = [{"label":"Category A", "value":20},
            {"label":"Category B", "value":50},
            {"label":"Category C", "value":30}];


          var vis = d3.select(iElem[0])
              .data([graphCtrl.data])
              .append("g");

          var pie = d3.layout.pie().value(function(d){return d.value;});

          // declare an arc generator function
          var arcGen = d3.svg.arc().outerRadius(scope.layout.radius);

          // select paths, use arc generator to draw
          var arcs = vis.selectAll("g.slice").data(pie).enter().append("g").attr("class", "slice");
          arcs.append("path")
              .attr("fill", function(d, i){
                return color(i);
              })
              .attr("d", function (d) {
                return arcGen(d);
              });

          // add the text
          arcs.append("text")
              .attr("transform", function(d){
                d.innerRadius = 0;
                d.outerRadius = scope.layout.radius;
                return "translate(" + arcGen.centroid(d) + ")";
              })
              .attr("text-anchor", "middle").text( function(d, i) {
                return d.data.key;}
          );
        }
      });
    });




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

  .factory('Translate', function(LayoutDefaults, Layout, componentTypes) {
    var axis = function(layout, registered, direction) {
      var layoutHas = Layout.makeLayoutHas(registered);
      var translateObj;

      if (direction === 'x') {
        translateObj = {
          y: layout.container.height - LayoutDefaults.components.xAxis.height + LayoutDefaults.padding.graph.bottom,
          x: (layoutHas(componentTypes.yAxis) ? LayoutDefaults.components.yAxis.width : 0)
        };
      } else if (direction === 'y') {
        translateObj = {
          y: layout.container.height - layout.yAxis.height - (layoutHas(componentTypes.xAxis) ? LayoutDefaults.components.xAxis.height : 0) + 10, // why?
          x: LayoutDefaults.components.yAxis.width
        };
      } else {
        console.warn('Choose a direction of x or y.');
        return {};
      }

      return translateObj;
    };

    var graph = function(layout, registered, graphType) {
      var layoutHas = Layout.makeLayoutHas(registered);

      return {
        x: (layoutHas(componentTypes.yAxis) ? LayoutDefaults.components.yAxis.width : 0),
        y: 10 // why?
      };
    };

    var legend = function(layout, registered) {
      return {
        x: layout.container.width - layout.legend.width, //width of the container minus the width of the legend itself
        y: 0
      };
    };

    return {
      axis: axis,
      graph: graph,
      legend: legend
    };
  })

  .factory('Layout', function(LayoutDefaults, $log, componentTypes) {
    var makeLayoutHas = function(registeredComponents) {
      return function(componentName) {
        return _.contains(registeredComponents, componentName);
      };
    };

    var updateLayout = function(registered, layout) {
      var layoutHas = makeLayoutHas(registered);

      // Handle graph width
      if (layoutHas(componentTypes.legend) && layoutHas(componentTypes.yAxis)) {
        layout.graph.width = layout.container.width - (layout.legend.width + LayoutDefaults.padding.legend.right + LayoutDefaults.components.yAxis.width);
      } else if (layoutHas(componentTypes.legend)) {
        layout.graph.width = layout.container.width - (layout.legend.width + LayoutDefaults.padding.legend.right);
      } else if (layoutHas(componentTypes.yAxis)) {
        layout.graph.width = layout.container.width - LayoutDefaults.components.yAxis.width;
      }

      // Handle graph height
      if (layoutHas(componentTypes.xAxis)) {
        layout.graph.height = layout.container.height - LayoutDefaults.components.xAxis.height;
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
          height: withoutPadding(attrHeight, 'v'),
          width: attrWidth
        },
        xAxis: {
          width: attrWidth - LayoutDefaults.components.yAxis.width,
          height: LayoutDefaults.components.xAxis.height
        },
        yAxis: {
          height: attrHeight - LayoutDefaults.components.xAxis.height,
          width: LayoutDefaults.components.yAxis.width
        },
        legend: {
          width: LayoutDefaults.components.legend.width
        }
      };
    };

    return {
      updateLayout: updateLayout,
      getDefaultLayout: getDefaultLayout,
      makeLayoutHas: makeLayoutHas,
      DRAW: 'layout.draw'
    };
  })

  .constant('componentTypes', {
    xAxis: 'xAxis',
    yAxis: 'yAxis',
    legend: 'legend',
    axis: 'axis'
  })

  .constant('chartTypes', {
    barchart: 'barchart',
    linechart: 'linechart',
    pie: 'pie',
    number: 'number',
    histogram: 'histogram'
  })

  .factory('ChartHelper', function(chartTypes) {
    var ordinalCharts = [chartTypes.barchart];

    var isOrdinal = function(chartType) {
      return _.contains(ordinalCharts, chartType);
    };

    return {
      isOrdinal: isOrdinal
    };
  })

  .factory('LayoutDefaults', function() {
    return {
      padding: {
        graph: {
          bottom: 10,
          top: 0,
          right: 15,
          left: 0
        },
        legend: {
          left: 0,
          right: 0,
          bottom: 0,
          top: 0,
          series: {
            bottom: 4,
            top: 0,
            left: 0,
            right: 0
          }
        }
      },
      components: {
        xAxis: {
          height: 80
        },
        yAxis: {
          width: 100
        },
        legend: {
          width: 150
        }
      }
    };
  })
  .service('FilterService', function() {
    var groupFiltersExcept = function(exprs, filterGroup) {
      var resFilter = new AQL.AndFilter();

      _.each(filterGroup, function(f) {
        if (_.contains(exprs, f.expr)) { return; }
        resFilter.addFilter(f);
      });

      return resFilter;
    };

    return {
      groupFiltersExcept: groupFiltersExcept,
      FILTER_CHANGED: 'filters.filterChanged'
    };
  })
  .provider('AQLRunner', function() {
    var resources = [];

    var getResourceConfig = function(resourceStr) {
      return _.find(resources, function(rs) {
        return rs.matcher.test(resourceStr);
      });
    };

    this.resource = function(pattern, configObj) {
      var getFields = function(pattern) {
        return _.map(_.filter(pattern.split('/'), function(segment) { return segment[0] === ':'; }), function(token) { return token.slice(1); });
      };

      var makeMatcher = function(pattern) {
        // TODO: Potential issue if someone passes in .* (or any other regex chars)
        return new RegExp('^' + _.map(pattern.split('/'), function(v) { return v[0] === ':' ? '([^/]*)' : v;}).join('/') + '$');
      };

      resources.push({
        matcher: makeMatcher(pattern),
        config: configObj,
        fields: getFields(pattern)
      });

      return this;
    };

    this.$get = function($http) { // AQLRunner(query).success)func
      return function(query) {
        var resource = getResourceConfig(query.resourceId);
        var queryFields = query.resourceId.match(resource.matcher).slice(1);

        return $http.post(resource.config.url, {
          params: _.zipObject(resource.fields, queryFields),
          query: query
        });
      };
    };
  })

  .factory('RangeFunctions', function(ChartHelper) {
    /**
     * Returns an object with the following parameters:
     * count - the total number of elements in the dataset
     * range - the range of the VALUES of the dataset
     * domain - the range of the KEYS of the dataset
     */

    var getMinMax = function(data, key, startFromZero) {
      var max = _.max(data,key)[key];

      if (startFromZero) {
        return [0, max];
      } else {
        var min = _.min(data, key)[key];
        return [min, max];
      }
    };

    var getMetadata = function(data, chartType) {
      var metadata = {
        count: data.length
      };

      if (!ChartHelper.isOrdinal(chartType)) {
        metadata.range = getMinMax(data, 'value', true);
        metadata.domain = getMinMax(data, 'key');
      } else {
        metadata.range = _.pluck(data, 'key');
        metadata.domain = getMinMax(data, 'value');
      }

      return metadata;
    };

    return {
      getMinMax: getMinMax,
      getMetadata: getMetadata
    };
  })
;
