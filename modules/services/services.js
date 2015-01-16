
/**
 * @ngdoc service
 * @name dataviz:BlLayoutService
 *
 * @description
 *
 */


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
