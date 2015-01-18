angular.module('dataviz.directives').service('VizUtils',function() {
  this.measure = function measure(text, elt, classname) {
    if(!text || text.length === 0) {
      return {height: 0, width: 0};
    }

    var container = d3.select(elt).append('svg').attr('class', classname);
    container.append('text').attr({x: -1000, y: -1000}).text(text);

    var bbox = container.node().getBBox();
    container.remove();

    return {height: bbox.height, width: bbox.width};
  };

  this.genOptionGetter = function (scope, defaultOptions) {
    return function(optionName) {
      return _.defaults(scope.params.options, defaultOptions)[optionName];
    };
  };

});
