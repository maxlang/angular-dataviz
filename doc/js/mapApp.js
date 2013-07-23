/**
 * demoApp - 1.0.0rc2
 */

//records - array of record objects
//key - the key to reduce on in the record object
//keyTransofrm - a transformation to perform on the key
//value - the value to be reduced
//valueTransform - a transformation to be performed on the value
//combineFn - how to combine two values with the same key
function reduce(records, key, keyTransform, value, valueTransform, valueDefault, combineFn) {
  var i;
  var reducedRecords = {};
  for (i = 0; i < records.length; i++) {
    var k = (keyTransform && keyTransform(records[i][key])) || records[i][key];
    var v = (valueTransform && valueTransform(records[i][value])) || records[i][value];
    if (k in reducedRecords) {
      reducedRecords[k] = combineFn(reducedRecords[k], v);
    } else {
      reducedRecords[k] = combineFn(valueDefault, v);
    }
  }
  return reducedRecords;
}

//TODO: generalize
function toNodesAndLinks(allRecords, selectedRecords, node, nodeTransform, nodeDefault, valueDefault, combineFn) {

  var nodesByPerson = reduce(allRecords, 'name', null, 'state', null, [], listCombine);


  var i;
  var data = {
    nodes: [],
    links: []
  };

  var nodes = {};
  var links = {};


  for (i = 0; i < selectedRecords.length; i++) {
    var n = (nodeTransform && nodeTransform(selectedRecords[i][node])) || selectedRecords[i][node];
    var prevIdx = nodesByPerson[selectedRecords[i].name].indexOf(n);
    var prev = prevIdx <= 0 ? nodeDefault : nodesByPerson[selectedRecords[i].name][prevIdx - 1];

    if (!(n in nodes)) {
      nodes[n] = data.nodes.length;
      data.nodes.push({
        name: n
      });
    }

    if (!(prev in nodes)) {
      nodes[prev] = data.nodes.length;
      data.nodes.push({
        name: prev
      });
    }

    if (!links[prev]) {
      links[prev] = {};
    }

    if (n in links[prev]) {
      links[prev][n] = combineFn(links[prev][n], 1);
    } else {
      links[prev][n] = combineFn(valueDefault, 1);
    }

  }

  var j, k;

  for (j in links) {
    for (k in links[j]) {
      data.links.push({
        source: nodes[j],
        target: nodes[k],
        value: links[j][k]
      });
    }
  }

  console.log(links);
  console.log(nodes);
  console.log(data);

  return data;
}

function sumCombine(a, b) {
  return a + b;
}

function countCombine(a) {
  return a + 1;
}

function listCombine(a, b) {
  return a.concat(b);
}

function timestampToDate(t) {
  var d = new Date();
  d.setTime(t);
  return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
}

function mapTokvArray(map, keyName, valueName) {
  var array = [];
  var k;
  for (k in map) {
    var item = {};
    item[keyName] = k;
    item[valueName] = map[k];
    array.push(item);
  }
  return array;
}

var module = angular.module('mapApp', ['dataviz'], function ($locationProvider) {
  $locationProvider.hashPrefix('');
  // Make code pretty
  window.prettyPrint && prettyPrint();
});

module
    .directive('scrollto', [function () {
      return function (scope, elm, attrs) {
        elm.bind('click', function (e) {
          e.preventDefault();
          if (attrs.href) {
            attrs.scrollto = attrs.href;
          }
          var top = $(attrs.scrollto).offset().top;
          $('body,html').animate({ scrollTop: top }, 800);
        });
      };
    }])

    .filter('timestampToDay', [function () {
      return function (input) {
        console.log('filter');
        console.log(input);
        if (input === null || input === undefined) {
          return [];
        }
        var output = input.map(function (e) {
          var d = new Date();
          d.setTime(e.time);
          return {
            date: d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(),
            count: e.bites
          };
        });
        console.log(output);
        return output;
      };
    }])

    .filter('inView', [function () {
      return function (records, filters, excludeFilter) {
        var i;
        var output = [];
        for (i = 0; i < records.length; i++) {
          var record = records[i];
          var push = true;
          var filterKey;
          for (filterKey in filters) {
            if (filterKey !== excludeFilter) {
              push &= filters[filterKey].applyFilter(record);
            }
          }
          if (push) {
            output.push(record);
          }
        }
        return output;
      }
    }])

//TODO: stop using rootscope

    .controller('dashboardCtrl', ['$scope', '$rootScope', '$filter', function ($scope, $rootScope, $filter) {


    }])


    .controller('GlobalDataCtrl', ['$scope', '$rootScope', function ($scope, $rootScope) {
      $rootScope.dataObject = [];
      $rootScope.filters = {
        dateFilter: {
          to: null,
          from: null,
          applyFilter: function (r) {
            return (!this.to || r.time < this.to) && (!this.from || r.time >= this.from);
          }
        },
        eaterFilter: {
          selected: null,
          applyFilter: function (r) {
            return (!this.selected || _.contains(this.selected, r.state));
          }
        },
        eatenFilter: {
          selected: null,
          applyFilter: function (r) {
            return (!this.selected || _.contains(this.selected, r.eaten));
          }
        }
      }
    }])

    .controller('GlobalDataCtrl', ['$scope', '$rootScope', '$http', '$q', function ($scope, $rootScope, $http, $q) {
      $rootScope.dataObject = [];
      $rootScope.filters = {
        dateFilter: {
          to: null,
          from: null,
          applyFilter: function (r) {
            return (!this.to || r.time < this.to) && (!this.from || r.time >= this.from);
          }
        },
        eaterFilter: {
          selected: null,
          applyFilter: function (r) {
            return (!this.selected || _.contains(this.selected, r.eater));
          }
        },
        eatenFilter: {
          selected: null,
          applyFilter: function (r) {
            return (!this.selected || _.contains(this.selected, r.eaten));
          }
        }
      };

      var g = new google.maps.Geocoder();

      var dataP = $http.get('/doc/data/data.json');
      var msaP = $http.get('/doc/data/geocodedMSA.json');
      //var stateAndCounty = dataResource.get({file: 'statCounty.json'});

      $q.all([dataP, msaP]).then(function(responses) {
        var data = responses[0].data;
        var msa = responses[1].data;

        var msaMap = {};

        _.each(msa, function(m) {
          msaMap[m.code] = m;
        });

        var locationNoise = d3.random.normal(0,.1);

        _.each(data, function(m) {
          if(msaMap[m.metropolitanStatisticalAreaCode]) {
            m.msa = msaMap[m.metropolitanStatisticalAreaCode].name;
            m.lat = msaMap[m.metropolitanStatisticalAreaCode].lat + locationNoise();
            m.lng = msaMap[m.metropolitanStatisticalAreaCode].lng + locationNoise();
          }
        });

        $scope.mapData = data;

        $scope.mapParams = {
          options: {
            heatmap: false,
            cluster: true
          },
          filter: []
        }

      });

    }])

    .filter('timestampToTime', function () {
      return function (t) {
        var d = new Date();
        d.setTime(t);
        return d.toDateString();
      }
    });
