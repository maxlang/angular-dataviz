angular.module('dataviz', ['dataviz.services']);

angular.module('dataviz')
  .directive('blAxis', function(LayoutDefaults, ChartFactory, Translate, Layout, $log) {
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

        graphCtrl.components.register(axisType, {
          direction: scope.direction,
          field: scope.field
        });

        scope.$on(Layout.DRAW, function() {
          scope.layout = graphCtrl.layout[axisType];
          scope.translate = Translate.axis(graphCtrl.layout, graphCtrl.components.registered, scope.direction);
          drawAxis(graphCtrl.scale, scope.direction, axisContainer, scope.layout);
        });
      }
    });
  });
angular.module('dataviz')
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
angular.module('dataviz')
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
        y: [graphLayout.height, 0]
      };
    };

    var getChartType = function(registeredComponents) {
      return _.find(registeredComponents, function(c) { return isChart(c.type); }).type;
    };

    var getChartParams = function(registeredComponents, componentType) {
      var chartObj = _.find(registeredComponents, {type: componentType});

      return chartObj ? chartObj.params : {};
    };

    var addAggregate = function(query, aggFunction, field) {
      // aggFunction is going to be: 'count' or 'min'
      if (!_.contains(field, '.num')) { console.warn('Stats aggs only currently work on numeric fields.'); }
      query[aggFunction + 'Aggregation'](field);
      return query;
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
          update: function(componentType, params) {
            var registeredIndex = _.findIndex(registered, {type: componentType});
            if (index < 0) { return console.warn('Can\'t update component type as it wasn\'t found.'); }
            registered[registeredIndex].params = params;
          },
          register: function(componentType, params) {
            var self = this;
            this.registered.push({type: componentType, params: params || {}});
            ctrl.layout = Layout.updateLayout(this.registered, ctrl.layout);

            if (isAxis(componentType)) {
              ctrl.fields[params.direction] = params.field;
            }

            $timeout(function() {
              // If everything is registered and we haven't yet run the initial query
              if (self.registered.length === $scope.componentCount && !hasRun) {

                // First, update the query
                var group;
                ctrl.chartType = getChartType(self.registered);
                if (!ctrl.chartType) {
                  console.warn('No chart type registered.');
                }

                if (ChartHelper.isOrdinal(ctrl.chartType)) {
                  // It's ordinal, set an interval and use intervalGroup
                  group = ctrl.query.termGroup($scope.field);
                } else if ($scope.interval) {
                  // Use termGroup
                  group = ctrl.query.intervalGroup($scope.field, $scope.interval);
                } else if (ctrl.numBuckets) {
                  group = ctrl.query.intervalGroup($scope.field, null, {buckets: ctrl.numBuckets});
                } else {
                  console.warn('There was no interval set and no buckets registered.');
                }

                if ($scope.aggFunction && $scope.aggregateBy) {
                  group[$scope.aggFunction + 'Aggregation']($scope.aggregateBy);
                }

                if (ctrl.chartType === chartTypes.number) {
                  var chartParams = getChartParams(self.registered, ctrl.chartType);
                  ctrl.query = addAggregate(ctrl.query, chartParams.aggregate, $scope.field);
                }

                hasRun = true;
                AQLRunner(ctrl.query)
                  .success(function(data) {
                    ctrl.data.grouped = data;
                    // This is really just to reset the linear or ordinal scale on the x/y axes --
                    // graph dimensions should really already be set at this point.
                    $scope.metadata = RangeFunctions.getMetadata(ctrl.data.grouped, ctrl.chartType, true);
                    ctrl.layout = Layout.updateLayout(self.registered, ctrl.layout);

                    var scaleDims = getScaleDims(ctrl.layout.graph);
                    ctrl.scale = setScale($scope.metadata, scaleDims.x, scaleDims.y, ctrl.chartType);

                    if (Layout.layoutIsValid(ctrl.layout)) {
                      $scope.$broadcast(Layout.DRAW);
                    }
                  })
                  .error(function(err) {
                    console.error('Error pulling data: ', err);
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
          ctrl.query.filters = []; // TODO (ian): There is a method for this now, I think.
          $scope.filters = groupCtrl.filters.getAllFilters();

          // Add all filters except for the current field's
          var newFilterSet = FilterService.groupFiltersExcept($scope.field, groupCtrl.filters.getAllFilters());

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

/*
 WIDTH AUTOFILL SPEC
 Should really only apply if none of the visualizations have their width and height set as non-percent integers
 Steps:
 blGroup should measure its own bounding box and determine the width.
 blGroup should get one of its children and get its calc’d CSS margins
 blGroup should check to see if its childrens' widths are percentages
 if percentages, take its current available width and multiple by each percentage
 if not percentages, divide the current available width by the number of children
 */
angular.module('dataviz')
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

angular.module('dataviz')
  .directive('blHistogram', function(ChartFactory, Translate, Layout, chartTypes, HistogramHelpers) {
    var histConfig = {
      bars: {
        minWidth: 4,
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
        scope.layout = graphCtrl.layout.graph;
        graphCtrl.numBuckets = HistogramHelpers.getBucketsForWidth(scope.numBars, scope.layout.width, histConfig);
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
            .attr('transform', function(d) {
              return 'translate(0,' + (graphCtrl.scale.y(d.value))  +')';
            })
            .attr('x', function(d, i) {
              return graphCtrl.scale.x(d.key);
            })
            .attr('width', function(d) { return barWidth; })
            .transition().duration(300)
            .attr('height', function(d) {
              return scope.layout.height - graphCtrl.scale.y(d.value);
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

    var getBucketsForWidth = function(barOverride, graphWidth, histConfig) {
      // Expect barOverride to be an integer describing the number of bars desired in the graph
      if (barOverride) { return barOverride; }

      return graphWidth / (histConfig.bars.minWidth + histConfig.bars.padding);
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
      getNumBars: getNumBars,
      getBucketsForWidth: getBucketsForWidth
    };
  })
;

angular.module('dataviz')
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
          .text(_.identity);

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

angular.module('dataviz')
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

angular.module('dataviz')
  .directive('blNumber', function(ChartFactory, chartTypes, Layout, FormatUtils) {
    return new ChartFactory.Component({
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
        //scope.translate = Translate.graph(graphCtrl.layout, graphCtrl.registered, COMPONENT_TYPE);

        function drawNumber() {
          text
            .attr('font-family', 'Verdana')
            .text(function() { return format(graphCtrl.data.grouped[scope.aggregate]); })
            .call(FormatUtils.resizeText, scope.layout);
        }

        scope.$watch('aggregate', function(nv, ov) {
          if (nv === ov) { return; }
          graphCtrl.components.update(COMPONENT_TYPE, {aggregate: scope.aggregate});
        });

        scope.$on(Layout.DRAW, drawNumber);
      }
    });
  })
  .factory('FormatUtils', function(LayoutDefaults) {
    var biggerThanBoundingBox = function(el, layoutDims) {
      return el.getBBox().width > layoutDims.width || el.getBBox().height > layoutDims.height;
    };

    var getFontSize = function(iEl) {
      return parseInt(iEl.attr('font-size'), 10);
    };

    var resizeText = function(elem, layoutDims) {
      // Note (il via ml): Get the non-jQuery'd/d3'd element because getBBox (native SVG method) is way more
      // accurate than jQuery's .width() in this case.
      var e = this.node();
      if (!e) { return; }

      var iEl = angular.element(e);
      var svg = iEl.closest('svg')[0];
      var maxTries = 100;
      var numPadding = LayoutDefaults.padding.number;
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
        var totalSVGSpace = svg.getBBox().height;
        var layoutHeight = layoutDims.height;
        var canvasYOffset = totalSVGSpace - layoutHeight;
        var eHeight = e.getBBox().height;
        // Note (il): The strange thing here is that it's the line height of the numbers that requires dividing the
        // canvas offset by two. It's unclear how to modify the line height of SVG text.
        return eHeight + canvasYOffset;
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

// NOTE (il): This bar chart is a work in progress

// Lovingly borrowed from: http://jsfiddle.net/ragingsquirrel3/qkHK6/
angular.module('dataviz')
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




angular.module('dataviz.services', [])
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
        var yTranslate = layout.container.height - layout.yAxis.height;

        if (layoutHas(componentTypes.xAxis)) {
          yTranslate -= LayoutDefaults.components.xAxis.height;
        }

        if (layoutHas(componentTypes.title)) {
          var titlePadding = LayoutDefaults.padding.title;
          yTranslate += (LayoutDefaults.components.title.height + titlePadding.top + titlePadding.bottom);
        }

        translateObj = {
          y: yTranslate, // why?
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
      var titlePadding = LayoutDefaults.padding.title;

      return {
        x: (layoutHas(componentTypes.yAxis) ? LayoutDefaults.components.yAxis.width : 0),
        y: (layoutHas(componentTypes.title) ? (LayoutDefaults.components.title.height + titlePadding.top  + titlePadding.bottom) : 0) // why?
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

  .factory('Layout', function(LayoutDefaults, $log, componentTypes, chartTypes) {
    var makeLayoutHas = function(registeredComponents) {
      return function(componentName) {
        return (_.findIndex(registeredComponents, {type: componentName}) > -1);
      };
    };

    var layoutIsValid = function(layout) {
      var keys = ['height', 'width'];
      var isValidLayoutValue = function(input) {
        return !_.isString(input) && (_.isUndefined(input) || !isNaN(input));
      };

      return _.every(layout, function(layoutItem) {
        return _.every(keys, function(key) {
          return isValidLayoutValue(layoutItem[key]);
        });
      });
    };

    var updateLayout = function(registered, layout) {
      var layoutHas = makeLayoutHas(registered);
      var withoutPadding = function(num, orientation, component) {
        var trimmed;
        if (orientation === 'h') {
          trimmed = num - (LayoutDefaults.padding[component].left + LayoutDefaults.padding[component].right);
        } else if (orientation === 'v') {
          trimmed = num - (LayoutDefaults.padding[component].top + LayoutDefaults.padding[component].bottom);
        }
        return trimmed;
      };

      var paddedWidth = withoutPadding(layout.container.width, 'h', 'graph');
      var paddedHeight = withoutPadding(layout.container.height, 'v', 'graph');

      // Handle graph width
      if (layoutHas(componentTypes.legend) && layoutHas(componentTypes.yAxis)) {
        layout.graph.width = paddedWidth - (layout.legend.width + LayoutDefaults.padding.legend.right + LayoutDefaults.components.yAxis.width);
      } else if (layoutHas(componentTypes.legend)) {
        layout.graph.width = paddedWidth - (layout.legend.width + LayoutDefaults.padding.legend.right);
      } else if (layoutHas(componentTypes.yAxis)) {
        layout.graph.width = paddedWidth - LayoutDefaults.components.yAxis.width;
      } else {
        layout.graph.width = paddedWidth;
      }

      // Handle graph height
      if (layoutHas(componentTypes.xAxis) && layoutHas(componentTypes.title)) {
        layout.graph.height = paddedHeight - LayoutDefaults.components.xAxis.height - (LayoutDefaults.components.title.height + LayoutDefaults.padding.title.top + LayoutDefaults.padding.title.bottom);
      } else if (layoutHas(componentTypes.xAxis)) {
        layout.graph.height = paddedHeight - LayoutDefaults.components.xAxis.height;
      } else if (layoutHas(componentTypes.title)) {
        layout.graph.height = paddedHeight - LayoutDefaults.components.title.height;
      } else {
        layout.graph.height = paddedHeight;
      }

      if (layoutHas(chartTypes.number)) {
        layout.graph.width = withoutPadding(layout.container.width, 'h', 'number');
      }

      return layout;
    };

    var getDefaultLayout = function(attrHeight, attrWidth) {
      return {
        container: {
          height: attrHeight,
          width: attrWidth
        },
        graph: {
          height: attrHeight,
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
        },
        title: {
          height: LayoutDefaults.components.title.height
        }
      };
    };

    return {
      updateLayout: updateLayout,
      getDefaultLayout: getDefaultLayout,
      makeLayoutHas: makeLayoutHas,
      layoutIsValid: layoutIsValid,
      DRAW: 'layout.draw'
    };
  })

  .constant('componentTypes', {
    xAxis: 'xAxis',
    yAxis: 'yAxis',
    legend: 'legend',
    axis: 'axis',
    title: 'title'
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
        },
        title: {
          top: 10,
          bottom: 10
        },
        number: {
          left: 20,
          right: 20
        }
      },
      components: {
        xAxis: {
          height: 70
        },
        yAxis: {
          width: 60
        },
        legend: {
          width: 150
        },
        title: {
          height: 20
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
        metadata.domain = getMinMax(data, 'key', true);
      } else {
        metadata.range = _.pluck(data, 'key');
        metadata.domain = getMinMax(data, 'value', true);
      }

      return metadata;
    };

    return {
      getMinMax: getMinMax,
      getMetadata: getMetadata
    };
  })
;

angular.module('dataviz')
  .directive('blTitle', function(ChartFactory, componentTypes, LayoutDefaults, Layout) {
    return new ChartFactory.Component({
      template: '<text class="graph-title" ng-attr-transform="translate({{translate.x}}, {{translate.y}})">{{title}}</text>',
      scope: {
        title: '@'
      },
      require: '^blGraph',
      link: function(scope, iElem, iAttrs, graphCtrl) {
        graphCtrl.components.register(componentTypes.title);

        // The text needs to be centered and positioned at the top
        function drawTitle(){
          var containerWidth = graphCtrl.layout.container.width;
          var elemWidth = d3.select(iElem[0]).node().getComputedTextLength();

          scope.translate = {
            x: Math.floor((containerWidth - elemWidth) / 2),
            y: LayoutDefaults.padding.title.top
          };
        }

        scope.$on(Layout.DRAW, drawTitle);
      }
    });
  })
;
