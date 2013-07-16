//TODO: add prefixes to directives


//TODO: fix references to flexbox in css

angular.module('dataviz.directives').directive('sankey', [function() {
  return {
    restrict: 'E',
    scope: {
      //TODO: DOCUMENT BETTER
      'data': '=',   // expects an array of objects with an array of nodes and an array of links
      'params' : '='   // a parameters object with the current filters, options, and highlighted data
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
            format = function(d) { return formatNumber(d) + " topics"; },
            color = d3.scale.category20();

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
              .sort(function(a, b) { return b.dy - a.dy; });

          link.append("title")
              .text(function(d) { return d.source.name + " → " + d.target.name + "\n" + format(d.value); });

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
              .style("fill", function(d) { return d.color = color(d.name.replace(/ .*/, "")); })
              .style("stroke", function(d) { return d3.rgb(d.color).darker(2); })
              .append("title")
              .text(function(d) { return d.name + "\n" + format(d.value); });

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
            d3.select(this).attr("transform", "translate(" + d.x + "," + (d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ")");
            sankey.relayout();
            link.attr("d", path);
          }


      }


      scope.$watch('data',function(data) {
        if(data!==undefined && data!==null && data.nodes && data.links && data.nodes.length > 0 && data.links.length > 0) {
          var dataClone = JSON.parse(JSON.stringify(data));
          drawChart(dataClone);
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
