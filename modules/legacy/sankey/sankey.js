//TODO: add prefixes to directives


//TODO: fix references to flexbox in css

angular.module('dataviz.directives').directive('sankey', [function() {
  return {
    restrict: 'E',
    scope: {
      //TODO: DOCUMENT BETTER
      'data': '=',   // expects an array of objects with an array of nodes and an array of links
      'data2' : '=',
      'params' : '=',   // a parameters object with the current filters, options, and highlighted data
      'filter2' : '='
    },
    link: function(scope, element) {
      scope.id = element.attr('id') || _.uniqueId(element.prop("tagName") + "-");

      var defaultOptions = {
        'widthPx' : 586,
        'heightPx' : 500
      };

      //TODO: better way to handle options, esp option merging
      function getOption(optionName) {
        return (scope.params && scope.params.options && scope.params.options[optionName]) || defaultOptions[optionName];
      }

      //TODO: standardize how filters are changed (don't create a new object) - use extend?
      function setSelectedLinks(links) {
        scope.$apply(function () {
          var args = [0, scope.params.filter.length].concat(links);
          Array.prototype.splice.apply(scope.params.filter, args);
        });
      }

      //TODO: change styles to avoid this

      //INIT
      d3.select(element[0]).classed("sankey", true);

//      scope.svg = d3.select(element[0]).append("svg:svg").attr("width", "100%").attr("height", "100%");

      //TODO: handle years
      //TODO: multiple rows if height is large enough
      //TODO: visually groupe months, years, and add a nicer border

      function drawChart(data) {

        element.html("");

        //TODO: take into account height
        //calculate columns based on width
        var widthPx = getOption('widthPx');
        var heightPx = getOption('heightPx');

        var margin = {top: 1, right: 1, bottom: 6, left: 1},
            width = widthPx - margin.left - margin.right,
            height = heightPx - margin.top - margin.bottom;

        var formatNumber = d3.format(",.0f"),
//            format = function(d) { return formatNumber(d) + " topics"; },
            format = function(d) { return "$" + formatNumber(d); },
            color = d3.scale.category10();

        var svg = d3.select(element[0]).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        var sankey = d3.sankey()
            .nodeWidth(15)
            .nodePadding(10)
            .size([width, height]);

        var path = sankey.link();

        sankey
            .nodes(data.nodes)
            .links(data.links)
            .layout(32);

        var link = svg.append("g").selectAll(".link")
            .data(data.links)
            .enter().append("path")
            .attr("class", "link")
            .attr("d", path)
            .style("stroke-width", function(d) { return Math.max(1, d.dy); })
            .sort(function(a, b) { return b.dy - a.dy; })
            .classed("positive",function(d) {
              return d.signedValue >= 0;
            })
            .classed("negative",function(d) {
              return d.signedValue < 0;
            })
            .classed('selected', function(d) {
              var source = d.source;
              var target = d.target;
              var sourceIdx = _.indexOf(scope.params.filter[source.filterId], source.fieldValue);
              var targetIdx = _.indexOf(scope.params.filter[target.filterId], target.fieldValue);
              return sourceIdx > -1 && targetIdx > -1;
            })
            .on("click", function(d) {
              var elt = d3.select(this);
              scope.$apply(function() {
                var source = d.source;
                var target = d.target;
                var sourceIdx = _.indexOf(scope.params.filter[source.filterId], source.fieldValue);
                var targetIdx = _.indexOf(scope.params.filter[target.filterId], target.fieldValue);
                if (elt.classed('selected')) {
                  //splice out the one later in the array first, to prevent shifts
                  if (sourceIdx > targetIdx) {
                    scope.params.filter[source.filterId].splice(sourceIdx, 1);
                    scope.params.filter[target.filterId].splice(targetIdx, 1);
                  } else {
                    scope.params.filter[target.filterId].splice(targetIdx, 1);
                    scope.params.filter[source.filterId].splice(sourceIdx, 1);
                  }
                  elt.classed('selected', false);
                } else {
                  elt.classed('selected', true);
                  scope.params.filter[source.filterId].push(source.fieldValue);
                  scope.params.filter[target.filterId].push(target.fieldValue);
                }
              });
            });

        link.append("title")
            .text(function(d) { return d.linkText || ((d.source.nodeType && d.source.nodeType + " : " || "") + d.source.name + " → " + (d.target.nodeType && d.target.nodeType + " : " || "") + d.target.name + "\n" + format(d.signedValue)); });

        var node = svg.append("g").selectAll(".node")
            .data(data.nodes)
            .enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
            .call(d3.behavior.drag()
                .origin(function(d) { return d; })
                .on("dragstart", function() { this.parentNode.appendChild(this); })
                .on("drag", dragmove));

        node.append("rect")
            .attr("height", function(d) { return d.dy; })
            .attr("width", sankey.nodeWidth())
            .style("fill", function(d) { return d.color = color(d.nodeType || ""); })
            .style("stroke", function(d) { return d3.rgb(d.color).darker(2); })
            .append("title")
            .text(function(d) { return d.nodeText || ( (d.nodeType && d.nodeType + " : " || "") + d.name + "\n" + format(d.value)); });

        node.append("text")
            .attr("x", -6)
            .attr("y", function(d) { return d.dy / 2; })
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .attr("transform", null)
            .text(function(d) { return d.name; })
            .filter(function(d) { return d.x < width / 2; })
            .attr("x", 6 + sankey.nodeWidth())
            .attr("text-anchor", "start");

        function dragmove(d) {
          d3.select(this).attr("transform", "translate(" + (d.x = Math.max(0, Math.min(width - d.dx, d3.event.x))) + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
          sankey.relayout();
          link.attr("d", path);
        }


      }


      scope.$watch('data',function(data) {
        if(data!==undefined && data!==null && data.nodes && data.links && data.nodes.length > 0 && data.links.length > 0) {
          var dataClone = JSON.parse(JSON.stringify(data));
          drawChart(dataClone);
        }
        if(data!==undefined && data!==null && data.nodes && data.links && data.nodes.length === 0 && data.links.length === 0) {
          element.html("");
        }
      }, true);


//      //TODO: update the options as well
//      scope.$watch('params.filter',function(f) {
//        if(f!==undefined && f!==null) {
//          selectRanges(f);
//        }
//      }, true);
//
//      scope.$watch('params.options', function(o) {
//        //the display options have changed, redraw the chart
//        if(scope.data!==undefined && scope.data!==null && scope.data.length > 0) {
//          drawChart(scope.data);
//          selectRanges(scope.params.filter);
//        }
//      }, true);
    }
  };
}]);