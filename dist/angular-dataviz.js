angular.module('dataviz', ['dataviz.services', 'dataviz.factories']);

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
/**
 * TODO:
 * - Selection brush
 * - Update to match new library structure
 */

angular.module('dataviz')
  .directive('blBarchart', function(BlChartFactory, BlLayout, chartTypes, BlTranslate, blGraphEvents) {

    var clickFn = function(d, addFilter) {
      addFilter('includes', d.key);
    };

    return new BlChartFactory.Component({
      template: '<g class="bl-barchart chart" ng-attr-height="{{layout.height}}" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}},{{translate.y}})"></g>',
      scope: {},
      link: function(scope, iElem, iAttrs, graphCtrl) {
        var COMPONENT_TYPE = chartTypes.barchart;
        var g = d3.select(iElem[0]);

        graphCtrl.componentsMgr.register(COMPONENT_TYPE);

        function drawChart() {
          scope.layout = graphCtrl.layoutMgr.layout.chart;
          scope.translate = BlTranslate.graph(scope.layout, graphCtrl.componentsMgr.registered, COMPONENT_TYPE);

          var bars = g.selectAll('rect').data(graphCtrl.dataMgr.data);

          bars.enter().append('rect')
            .classed('bar', true)
            .attr('x', 0)
            .attr('stroke-width', '0px')
            //.classed('selected', function(d, i) { return false; }) // add selection logic back in
            .on('click', function(d, i) {
              var boundAddFilter = graphCtrl.filters.addFilter.bind(graphCtrl.filters);
              clickFn.call(this, d, boundAddFilter);
            });

          bars
            .attr('y', function(d) { return graphCtrl.scaleMgr.y(d.key); })
            .attr('width', function(d) { return graphCtrl.scaleMgr.x(d.value); })
            .attr('height', Math.abs(graphCtrl.scaleMgr.y.rangeBand()));

          bars
            .exit()
            .remove();
        }

        scope.$on(blGraphEvents.DRAW, drawChart);
      }
    });
  });
angular.module('dataviz')
  .factory('blGraphEvents', function() {
    return {
      DRAW: 'graph.DRAW',
      ALL_COMPONENTS_REGISTERED: 'graph.ALL_COMPONENTS_REGISTERED'
    };
  })

  .directive('blGraph', function(BlLayout, $timeout, RangeFunctions, chartTypes, componentTypes, ChartHelper, BlLayoutDefaults, BlFilterService, $log, DataMgrFactory, ScaleMgrFactory, FilterMgrFactory, QueryMgrFactory, ComponentMgrFactory, LayoutMgrFactory, blGraphEvents) {
    var groupCtrl;

    var addAggregate = function(query, aggFunction, field) {
      // aggFunction is going to be: 'count' or 'min'
      if (!_.contains(field, '.num')) { $log.warn('Stats aggs only currently work on numeric fields.'); }
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
        this.layoutMgr = new LayoutMgrFactory($scope.containerHeight, $scope.containerWidth);
        $scope.layout = ctrl.layoutMgr.layout.container;
        ctrl.interval = $scope.interval;
        ctrl.queryMgr = new QueryMgrFactory($scope.resource);
        ctrl.dataMgr = new DataMgrFactory();
        ctrl.scaleMgr = new ScaleMgrFactory();
        ctrl.filterMgr = new FilterMgrFactory();
        ctrl.componentsMgr = new ComponentMgrFactory($scope, $element);

        $scope.$on(blGraphEvents.ALL_COMPONENTS_REGISTERED, function() {
          $timeout(function() {
            var group;

            if (!ctrl.componentsMgr.chart) { $log.warn('No chart registered.'); }

            if (ChartHelper.isOrdinal(ctrl.componentsMgr.chart.type)) {
              // It's ordinal, set an interval and use intervalGroup
              group = ctrl.queryMgr.query.termGroup($scope.field);
            } else if ($scope.interval) {
              // Use termGroup
              group = ctrl.queryMgr.query.intervalGroup($scope.field, $scope.interval);
            } else if (ctrl.numBuckets) {
              group = ctrl.queryMgr.query.intervalGroup(
                $scope.field, null, {buckets: ctrl.componentsMgr.chart.params.numBuckets}
              );
            } else {
              $log.warn('There was no interval set and no buckets registered.');
            }

            if ($scope.aggFunction && $scope.aggregateBy) {
              group[$scope.aggFunction + 'Aggregation']($scope.aggregateBy);
            }

            if (ctrl.componentsMgr.chartType === chartTypes.number) {
              var chartParams = ctrl.componentsMgr.chart.params;
              ctrl.queryMgr.query = addAggregate(ctrl.query, chartParams.aggregate, $scope.field);
            }

            ctrl.dataMgr.refresh(ctrl.queryMgr.query)
              .then(function(data) {
                // TODO (il): Empty state
                if (!data) { return; }

                ctrl.layoutMgr.update(ctrl.componentsMgr.registered);
                ctrl.scaleMgr.update(ctrl.layoutMgr.layout, ctrl.dataMgr.metadata, ctrl.componentsMgr.chart.type);
                $scope.$broadcast(blGraphEvents.DRAW);
              });
          });
        });


        $scope.$watch('[containerHeight, containerWidth]', function(nv, ov) {
          if (angular.equals(nv, ov)) { return; }

          var height = nv[0];
          var width = nv[1];

          ctrl.layoutMgr.update(ctrl.componentsMgr.registered, BlLayout.getDefaultLayout(height, width));
          $scope.layout = ctrl.layoutMgr.layout.container;
          ctrl.scaleMgr.update(ctrl.layoutMgr.layout, ctrl.dataMgr.metadata, ctrl.componentsMgr.chart.type);
          $scope.$broadcast(blGraphEvents.DRAW);
        });

        $scope.$on(BlFilterService.FILTER_CHANGED, function() {
          ctrl.queryMgr.query.clear(); // TODO (ian): There is a method for this now, I think.
          $scope.filters = groupCtrl.filters.getAllFilters();

          // Add all filters except for the current field's
          var newFilterSet = BlFilterService.groupFiltersExcept($scope.field, groupCtrl.filters.getAllFilters());

          if (!newFilterSet.isEmpty()) {
            ctrl.query.addFilter(BlFilterService.groupFiltersExcept($scope.field, groupCtrl.filters.getAllFilters()));
          }

          ctrl.dataMgr.refresh()
            .then(function() {
              var chartType = ctrl.componentsMgr.chart.type;
              ctrl.scaleMgr.update(ctrl.layoutMgr.layout, ctrl.dataMgr.metadata, chartType);
              $scope.$broadcast(blGraphEvents.DRAW);
            });

        });

      }
    };
  })
;

var module = angular.module('dataviz.factories', []);

var DataMgrFactory = function(AQLRunner, RangeFunctions) {
  var DataMgr = function () {
    this.data = [];
    this.metadata = {};
  };

  DataMgr.prototype.refresh = function (query) {
    var self = this;
    return AQLRunner(query)
      .success(function (data) {
        self.data = data;
        self.metadata = RangeFunctions.getMetadata(data);
        return data;
      })
      .error(function(err) {
        $log.error('Error pulling data: ', err);
      });
  };

  return DataMgr;
};

var ScaleMgrFactory = function(BlLayoutDefaults, ChartHelper) {
  var getScaleDims = function(graphLayout) {
    return {
      x: [0, graphLayout.width - BlLayoutDefaults.padding.graph.right],
      y: [graphLayout.height, 0]
    };
  };

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

  var ScaleMgr = function() {
    this.x = function() {};
    this.y = function() {};
  };

  ScaleMgr.prototype.update = function(layout, metadata, chartType) {
    var scaleDims = getScaleDims(layout.graph);
    var newScale = setScale(metadata, scaleDims.x, scaleDims.y, chartType);
    this.x = newScale.x;
    this.y = newScale.y;
  };

  return ScaleMgr;
};

var FilterMgrFactory = function() {
  var FILTER_ADDED = 'filters.filterAdded';

  var FilterMgr = function() {
    this.includes = [];
    this.excludes = [];
  };

  FilterMgr.prototype.addFilter = function(field, term, scopeObj) {
    this.toggleTerm(type, term);
    var filter = new AQL.TermFilter(field, term);
    scopeObj.$broadcast(FILTER_ADDED);
    // hm. going to need to think through this in light of the new
    // developments. all filtering will now be done at a group level, really,
    // and the individual graphs will just handle displaying their own data
  };

  FilterMgr.prototype.toggleTerm = function(type, term) {
    var termIndex = _.findIndex(this[type], term);

    if (termIndex < 0) {
      this[type].push(term);
    } else {
      this[type].splice(termIndex, 1);
    }
  };

  return FilterMgr;
};

var QueryMgrFactory = function() {
  var QueryMgr = function(resourceName) {
    this.query = new AQL.SelectQuery(resourceName);
  };

  return QueryMgr;
};

var ComponentMgrFactory = function(blGraphEvents, $log, chartTypes) {

  var isChart = function(componentType) {
    return _.contains(chartTypes, componentType);
  };

  var ComponentMgr = function(scopeObj, element) {
    this.registered = [];
    this.scope = scopeObj;
    this.componentCount = 0;
    this.element = element;
    this.chartType = null;
  };

  ComponentMgr.prototype.update = function(componentId, params) {
    var registeredIndex = _.findIndex(registered, {_id: componentId});
    if (index < 0) { return $log.warn('Component to update wasn\'t found.'); }
    registered[registeredIndex].params = params;
    return registered[registeredIndex];
  };

  ComponentMgr.prototype.register = function(componentType, params) {
    if (!this.componentCount) {
      this.componentCount = this.element.children().length;
    }
    var component = {
      type: componentType,
      _id: this.registered.length,
      params: params || {}
    };
    this.registered.push(component);

    if (isChart(componentType)) {
      this.chart = component;
    }

    if (this.registered.length !== this.componentCount) { return; }
    this.scope.$emit(blGraphEvents.ALL_COMPONENTS_REGISTERED);
  };

  return ComponentMgr;
};

var LayoutMgrFactory = function(BlLayout) {
  var LayoutMgr = function(height, width) {
    this.layout = BlLayout.getDefaultLayout(height, width);
  };

  LayoutMgr.prototype.update = function(registeredComponents, newLayout) {
    this.layout = BlLayout.updateLayout(registeredComponents, newLayout || this.layout);
  };

  return LayoutMgr;
};

module.factory('DataMgrFactory', DataMgrFactory);
module.factory('ScaleMgrFactory', ScaleMgrFactory);
module.factory('FilterMgrFactory', FilterMgrFactory);
module.factory('QueryMgrFactory', QueryMgrFactory);
module.factory('ComponentMgrFactory', ComponentMgrFactory);
module.factory('LayoutMgrFactory', LayoutMgrFactory);

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
  .directive('blGroup', function(BlFilterService) {
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
            var doBroadcast = false;
            var currentFilterOfType = this.filterStore[aqlFilterObj.expr];

            // If there's already a filter at this.filterStore[blah], register & broadcast only if the value is different
            if (currentFilterOfType && !angular.equals(currentFilterOfType, aqlFilterObj.value)) {
              doBroadcast = true;
              this.filterStore[aqlFilterObj.expr] = aqlFilterObj;

              // if it's not, or if it's the first filter of its kind and its value is null, set it but don't broadcast
            } else if (!currentFilterOfType && !aqlFilterObj.value) {
              this.filterStore[aqlFilterObj.expr] = aqlFilterObj;
            }

            if (!doBroadcast) { return; }
            $scope.$broadcast(BlFilterService.FILTER_CHANGED);
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
  .directive('blHistogram', function(BlChartFactory, BlTranslate, BlLayout, chartTypes, HistogramHelpers, blGraphEvents) {
    var histConfig = {
      bars: {
        minWidth: 4,
        padding: 1
      }
    };

    var clickFn = function(d, addFilter) {
      addFilter('includes', d.key);
    };

    return new BlChartFactory.Component({
      template: '<g class="bl-histogram chart" ng-attr-height="{{layout.height}}" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}},{{translate.y}})"></g>',
      scope: {
        numBars: '@?'
      },
      link: function(scope, iElem, iAttrs, graphCtrl) {
        var COMPONENT_TYPE = chartTypes.histogram;
        graphCtrl.componentsMgr.register(COMPONENT_TYPE);
        scope.layout = graphCtrl.layoutMgr.layout.graph;
        graphCtrl.numBuckets = HistogramHelpers.getBucketsForWidth(scope.numBars, scope.layout.width, histConfig);
        var g = d3.select(iElem[0]);

        function drawHist() {
          scope.layout = graphCtrl.layoutMgr.layout.graph;
          scope.translate = BlTranslate.graph(scope.layout, graphCtrl.componentsMgr.registered, COMPONENT_TYPE);
          var barWidth = HistogramHelpers.getBarWidth(graphCtrl.dataMgr.data, scope.layout, histConfig);

          var bars = g.selectAll('rect').data(graphCtrl.dataMgr.data);

          // Do this for all the
          bars.enter().append('rect')
            .classed('bar', true)
            .attr('y', 0)
            .attr('stroke-width', '0px')
            .attr('fill', 'steelblue')
            //.classed('selected', function(d, i) { return true; }) // TODO (il): Add this back in
            .on('click', function(d, i) {
              var boundAddFilter = graphCtrl.filters.addFilter.bind(graphCtrl.filters);
              clickFn.call(this, d, boundAddFilter);
            });

          bars
            .attr('transform', function(d) {
              return 'translate(0,' + (graphCtrl.scaleMgr.y(d.value))  +')';
            })
            .attr('x', function(d, i) {
              return graphCtrl.scaleMgr.x(d.key);
            })
            .attr('width', function(d) { return barWidth; })
            .attr('height', function(d) {
              return scope.layout.height - graphCtrl.scaleMgr.y(d.value);
            });


          bars
            .exit()
            .attr('height', 0)
            .remove();
        }

        scope.$on(blGraphEvents.DRAW, drawHist);

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

    return {
      getBarWidth: getBarWidth,
      getBucketsForWidth: getBucketsForWidth
    };
  })
;

angular.module('dataviz')
  .directive('blLegend', function(BlChartFactory, BlTranslate, BlLayout, BlLayoutDefaults, componentTypes, blGraphEvents) {
    return new BlChartFactory.Component({
      template: '<g class="bl-legend" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}}, {{translate.y}})"></g>',
      link: function(scope, iElem, iAttrs, graphCtrl) {
        // graphCtrl is responsible for communicating the keys and values in a fairly simple way to the legend
        var COMPONENT_TYPE = componentTypes.legend;
        var seriesData = ['Loans'];
        graphCtrl.componentsMgr.register(COMPONENT_TYPE);
        var RECT_SIZE = 18;

        function drawLegend() {
          scope.layout = graphCtrl.layoutMgr.layout.legend;
          scope.translate = BlTranslate.legend(graphCtrl.layoutMgr.layout, graphCtrl.componentsMgr.registered, COMPONENT_TYPE);
        }

        var legend = d3.select(iElem[0])
          .attr('height', function(d) { return 100; });

        // set up the series tags
        var series = legend.selectAll('.series')
          .data(seriesData)
          .enter()
          .append('g')
          .attr('class', 'series')
          .attr('height', function(d) { return RECT_SIZE + BlLayoutDefaults.padding.legend.series.bottom; })
          .attr('width', '100%')
          .attr('transform', function(d, i) {
            var height = RECT_SIZE + BlLayoutDefaults.padding.legend.series.bottom;
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

        scope.$on(blGraphEvents.DRAW, drawLegend);
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
  .directive('blLine', function(BlChartFactory, BlTranslate, BlLayout, chartTypes, blGraphEvents) {

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

    return new BlChartFactory.Component({
      template:
      '<g ng-attr-width="{{layout.width}}" ng-attr-height="{{layout.height}}" class="bl-line chart">' +
        '<path ng-attr-transform="translate({{translate.x}}, {{translate.y}})"></path>' +
      '</g>',
      scope: {
        fieldX: '=',
        fieldY: '='
      },
      link: function(scope, iElem, iAttrs, graphCtrl) {
        var COMPONENT_TYPE = chartTypes.linechart;
        graphCtrl.componentsMgr.register(COMPONENT_TYPE);
        scope.layout = graphCtrl.layoutMgr.layout.graph;
        var path = d3.select(iElem[0]).select('path'); // strip off the jquery wrapper
        var groupEl = d3.select(iElem[0]); // get the group element to append dots to

        function drawLine() {
          scope.layout = graphCtrl.layoutMgr.layout.graph;
          scope.line = setLine(graphCtrl.scaleMgr, {x: scope.fieldX, y: scope.fieldY});
          scope.translate = BlTranslate.graph(graphCtrl.layoutMgr.layout, graphCtrl.componentsMgr.registered, COMPONENT_TYPE);
          path
            .attr('d', scope.line(graphCtrl.dataMgr.data));

          var tip = d3.tip()
            .attr('class', 'viz-tooltip')
            .offset([-30, 0])
            .html(function(d) {
              return '<span class="tip-text">' + d[scope.fieldX] + '</span>' +
                '<span class="tip-text">' + d[scope.fieldY] + '</span>';
            });

          var dots = groupEl.selectAll('g.dot')
            .data(graphCtrl.dataMgr.data)
            .enter().append('g')
            .attr('class', 'dot')
            .selectAll('circle')
            .data(graphCtrl.dataMgr.data)
            .enter().append('circle')
            .attr('r', lineConfig.circleRadius);

          groupEl.call(tip);

          groupEl.selectAll('g.dot circle')
            .attr('cx', function(d) { return graphCtrl.scaleMgr.x(d[scope.fieldX]); })
            .attr('cy', function(d) { return graphCtrl.scaleMgr.y(d[scope.fieldY]); })
            .attr('transform', function() { return 'translate(' + scope.translate.x + ', ' + scope.translate.y + ')'; })
            .on('mouseover', tip.show)
            .on('mouseout', tip.hide);

          dots
            .data(graphCtrl.dataMgr.data)
            .exit().remove();
        }

        scope.$on(blGraphEvents.DRAW, drawLine);
      }
    });
  })
;

angular.module('dataviz')
  .directive('blNumber', function(BlChartFactory, chartTypes, BlLayout, FormatUtils, blGraphEvents) {
    return new BlChartFactory.Component({
      //template: '<text class="bl-number chart" ng-attr-height="{{layout.height}}" ng-attr-width="{{layout.width}}" ng-attr-transform="translate({{translate.x}}, {{translate.y}})">{{text}}</text>',
      template: '<text class="bl-number chart" font-size="250px"></text>',
      scope: {
        aggregate: '=?' // TODO: This should eventually look like: aggFunc(aggField); e.g. count('_id').
      },
      link: function(scope, iElem, iAttrs, graphCtrl) {
        var COMPONENT_TYPE = chartTypes.number;

        // If this is an agg, data will look like an object with count, min, max, avg, and sum attributes
        var format = FormatUtils.getFormatFunction(graphCtrl.dataMgr.data, 'plain');
        graphCtrl.componentsMgr.register(COMPONENT_TYPE, {aggregate: scope.aggregate});
        scope.layout = graphCtrl.layoutMgr.layout.graph;
        var text = d3.select(iElem[0]);
        //scope.translate = BlTranslate.graph(graphCtrl.layout, graphCtrl.registered, COMPONENT_TYPE);

        function drawNumber() {
          text
            .attr('font-family', 'Verdana')
            .text(function() { return format(graphCtrl.dataMgr.data[scope.aggregate]); })
            .call(FormatUtils.resizeText, graphCtrl.layoutMgr.layout);
        }

        scope.$watch('aggregate', function(nv, ov) {
          if (nv === ov) { return; }
          graphCtrl.componentsMgr.update(COMPONENT_TYPE, {aggregate: scope.aggregate});
        });

        scope.$on(blGraphEvents.DRAW, drawNumber);
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

// NOTE (il): This bar chart is a work in progress

// Lovingly borrowed from: http://jsfiddle.net/ragingsquirrel3/qkHK6/
angular.module('dataviz')
    .directive('blPie', function(BlChartFactory, blGraphEvents) {
      return new BlChartFactory.Component({
        template: '<g class="bl-pie chart" ng-attr-width="{{layout.width}}" ng-attr-height="{{layout.height}}" ng-attr-transform="translate({{translate.x}}, {{translate.y}})" class="bl-pie"></g>',
        link: function(scope, iElem, iAttrs, graphCtrl) {
          var COMPONENT_TYPE = charts.pie;

          graphCtrl.componentsMgr.register(COMPONENT_TYPE);

          // With modifications
          var diameter = Math.min(graphCtrl.layoutMgr.layout.graph.height, graphCtrl.layoutMgr.layout.graph.width);
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

angular.module('dataviz.services', [])
  .factory('BlChartFactory', function() {
    var Component = function(config) {
      return _.defaults(config, {
        restrict: 'E',
        replace: true,
        scope: true,
        require: '^blGraph',
        templateNamespace: 'svg'
      });
    };

    return {
      Component: Component
    };
  })

  .factory('BlTranslate', function(BlLayoutDefaults, BlLayout, componentTypes, $log) {
    var axis = function(layout, registered, direction) {
      var layoutHas = BlLayout.makeLayoutHas(registered);
      var translateObj;

      if (direction === 'x') {
        translateObj = {
          y: layout.container.height - BlLayoutDefaults.components.xAxis.height + BlLayoutDefaults.padding.graph.bottom,
          x: (layoutHas(componentTypes.yAxis) ? BlLayoutDefaults.components.yAxis.width : BlLayoutDefaults.padding.graph.left)
        };
      } else if (direction === 'y') {
        var yTranslate = 0;

        if (layoutHas(componentTypes.title)) {
          var titlePadding = BlLayoutDefaults.padding.title;
          yTranslate += (BlLayoutDefaults.components.title.height + titlePadding.top + titlePadding.bottom);
        }

        translateObj = {
          y: yTranslate,
          x: BlLayoutDefaults.components.yAxis.width
        };
      } else {
        $log.warn('Choose a direction of x or y.');
        return {};
      }

      return translateObj;
    };

    var graph = function(layout, registered, graphType) {
      var layoutHas = BlLayout.makeLayoutHas(registered);
      var titlePadding = BlLayoutDefaults.padding.title;

      return {
        x: (layoutHas(componentTypes.yAxis) ? BlLayoutDefaults.components.yAxis.width : BlLayoutDefaults.padding.graph.left),
        y: (layoutHas(componentTypes.title) ? (BlLayoutDefaults.components.title.height + titlePadding.top  + titlePadding.bottom) : 0)
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

  .factory('BlLayout', function(BlLayoutDefaults, $log, componentTypes, chartTypes) {
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
          trimmed = num - (BlLayoutDefaults.padding[component].left + BlLayoutDefaults.padding[component].right);
        } else if (orientation === 'v') {
          trimmed = num - (BlLayoutDefaults.padding[component].top + BlLayoutDefaults.padding[component].bottom);
        }
        return trimmed;
      };

      var paddedWidth = withoutPadding(layout.container.width, 'h', 'graph');
      var paddedHeight = withoutPadding(layout.container.height, 'v', 'graph');

      // Handle graph width
      if (layoutHas(componentTypes.legend) && layoutHas(componentTypes.yAxis)) {
        layout.graph.width = paddedWidth - (layout.legend.width + BlLayoutDefaults.padding.legend.right + BlLayoutDefaults.components.yAxis.width);
      } else if (layoutHas(componentTypes.legend)) {
        layout.graph.width = paddedWidth - (layout.legend.width + BlLayoutDefaults.padding.legend.right);
      } else if (layoutHas(componentTypes.yAxis)) {
        layout.graph.width = paddedWidth - BlLayoutDefaults.components.yAxis.width;
      } else {
        layout.graph.width = paddedWidth;
      }

      // Handle graph height
      if (layoutHas(componentTypes.xAxis) && layoutHas(componentTypes.title)) {
        layout.graph.height = paddedHeight - BlLayoutDefaults.components.xAxis.height - (BlLayoutDefaults.components.title.height + BlLayoutDefaults.padding.title.top + BlLayoutDefaults.padding.title.bottom);
      } else if (layoutHas(componentTypes.xAxis)) {
        layout.graph.height = paddedHeight - BlLayoutDefaults.components.xAxis.height;
      } else if (layoutHas(componentTypes.title)) {
        var titlePadding = BlLayoutDefaults.padding.title;
        layout.graph.height = paddedHeight - (BlLayoutDefaults.components.title.height + titlePadding.top + titlePadding.bottom);
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
          width: attrWidth - BlLayoutDefaults.components.yAxis.width,
          height: BlLayoutDefaults.components.xAxis.height
        },
        yAxis: {
          height: attrHeight - BlLayoutDefaults.components.xAxis.height,
          width: BlLayoutDefaults.components.yAxis.width
        },
        legend: {
          width: BlLayoutDefaults.components.legend.width
        },
        title: {
          height: BlLayoutDefaults.components.title.height
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

  .factory('BlLayoutDefaults', function() {
    return {
      padding: {
        graph: {
          bottom: 10,
          top: 0,
          right: 15,
          left: 15
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
  .service('BlFilterService', function() {
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
