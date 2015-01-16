/* global AQL */
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
