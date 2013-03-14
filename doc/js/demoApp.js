
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
  for(i=0;i<records.length;i++) {
    var k = (keyTransform && keyTransform(records[i][key])) || records[i][key];
    var v = (valueTransform && valueTransform(records[i][value])) || records[i][value];
    if(k in reducedRecords) {
      reducedRecords[k] = combineFn(reducedRecords[k],v);
    } else {
      reducedRecords[k]=combineFn(valueDefault,v);
    }
  }
  return reducedRecords;
}

function sumCombine(a,b) {
  return a+b;
}
function countCombine(a) {
  return a+1;
}

function timestampToDate(t) {
  var d = new Date();
  d.setTime(t);
  return d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate();
}

function mapTokvArray(map,keyName,valueName) {
  var array = [];
  var k;
  for (k in map) {
    var item = {};
    item[keyName] = k;
    item[valueName] = map[k];
    array.push(item) ;
  }
  return array;
}


angular.module('demoApp', ['dataviz'], function($locationProvider) {
  $locationProvider.hashPrefix('');
  // Make code pretty
  window.prettyPrint && prettyPrint();
}).directive('scrollto', [function(){
  return function(scope, elm, attrs) {
    elm.bind('click', function(e){
      e.preventDefault();
      if (attrs.href) {
	attrs.scrollto = attrs.href;
      }
      var top = $(attrs.scrollto).offset().top;
      $('body,html').animate({ scrollTop: top }, 800);
    });
  };
}]).filter('timestampToDay', [function() {
      return function(input) {
        console.log('filter');
        console.log(input);
        if(input===null || input===undefined) {
          return [];
        }
        var output =  input.map(function(e) {
          var d = new Date();
          d.setTime(e.time);
          return {
            date: d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate(),
            count: e.bites
          };
        });
        console.log(output);
        return output;
      };
    }])
    .filter('inView', [function() {
      return function(records, filters, excludeFilter){
        var i;
        var output = [];
        for(i=0;i<records.length;i++) {
          var record = records[i];
          var push = true;
          var filterKey;
          for(filterKey in filters) {
            if(filterKey !== excludeFilter) {
              push &= filters[filterKey].apply(record);
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

    .controller('dashboardCtrl', ['$scope','$rootScope', '$filter', function($scope, $rootScope, $filter) {


      $scope.params = {};
      $scope.dataObject = $rootScope.dataObject;

      ///CALENDAR 1
      $scope.cal1data = d3.entries(reduce($scope.dataObject.records,'time',timestampToDate,'bites',null,0,sumCombine));

      $scope.cal1params = {};

      $scope.params.dateFilter = [];

      $scope.cal1params.filter = $scope.params.dateFilter;

      //CALENDAR 2
      $scope.dataObject = $rootScope.dataObject;
      $scope.cal2data = d3.entries(reduce($scope.dataObject.records,'time',timestampToDate,'bites',null,0,countCombine));

      $scope.cal2params = {};

      $scope.cal2params.filter = $scope.params.dateFilter;

      // CALENDAR WATCHES
      $scope.$watch('params.dateFilter', function(f) {
        console.log("date filter change");
        if (f.length > 0) {
          $rootScope.filters.dateFilter.from = f[0][0];
          $rootScope.filters.dateFilter.to = f[0][1];
        } else {
          $rootScope.filters.dateFilter.from = null;
          $rootScope.filters.dateFilter.to = null;
        }
      }, true);

      $rootScope.$watch('filters.dateFilter', function(df) {
        console.log("root date filter change");
        if($scope.params.dateFilter[0]) {
          $scope.params.dateFilter[0][0] = df.from;
          $scope.params.dateFilter[0][1] = df.to;
        } else {
          $scope.params.dateFilter[0]=[df.from,df.to];
        }
      }, true);

      // add a watch to all other filters
      var filterKey;
      for(filterKey in $rootScope.filters) {
        if (filterKey !== "dateFilter") {
          $scope.$watch('filters.'+filterKey, function() {
            var records = $filter('inView')($rootScope.dataObject.records, $rootScope.filters, "dateFilter");
            $scope.cal1data = d3.entries(reduce(records,'time',timestampToDate,'bites',null,0,sumCombine));
            $scope.cal2data = d3.entries(reduce(records,'time',timestampToDate,'bites',null,0,countCombine));
          }, true);
        }
      }


    }])


    .controller('eaterConverterCtrl',['$scope','$rootScope', '$filter', function($scope, $rootScope, $filter) {
      $scope.dataObject = $rootScope.dataObject;
      var values = mapTokvArray(reduce($scope.dataObject.records,'eater',null,'bites',null,0,countCombine), "key", "count");

      $scope.labeledCounts = [{
         key:"Key",
         values:values
      }];

      $scope.$watch('selectedLabels', function(val) {
        if (val!==null && val!==undefined && val.length > 0) {
          $rootScope.filters.eaterFilter.selected = val[0];
        } else {
          $rootScope.filters.eaterFilter.selected = null;
        }
      });

      //TODO: add watch on filters.eaterFilter

      // add a watch to all other filters
      var filterKey;
      for(filterKey in $rootScope.filters) {
        if (filterKey !== "eaterFilter") {
          $scope.$watch('filters.'+filterKey, function() {
            var records = $filter('inView')($rootScope.dataObject.records, $rootScope.filters, "eaterFilter");
            var counts = mapTokvArray(reduce(records,'eater',null,'bites',null,0,countCombine), "key", "count");
            $scope.labeledCounts = [{
              key:"Key",
              values:counts
            }];
          }, true);
        }
      }

      $scope.filters = $rootScope.filters;
    }])

    .controller('eatenConverterCtrl',['$scope','$rootScope', '$filter', function($scope, $rootScope, $filter) {
      $scope.dataObject = $rootScope.dataObject;
      var values = mapTokvArray(reduce($scope.dataObject.records,'eaten',null,'bites',null,0,countCombine), "key", "count");

      $scope.labeledCounts = [{
        key:"Key",
        values:values
      }];

      $scope.$watch('selectedLabels', function(val) {
        if (val!==null && val!==undefined && val.length > 0) {
          $rootScope.filters.eatenFilter.selected = val[0];
        } else {
          $rootScope.filters.eatenFilter.selected = null;
        }
      });

      //TODO: add watch on filters.eatenFilter

      // add a watch to all other filters
      var filterKey;
      for(filterKey in $rootScope.filters) {
        if (filterKey !== "eatenFilter") {
          $scope.$watch('filters.'+filterKey, function() {
            var records = $filter('inView')($rootScope.dataObject.records, $rootScope.filters, "eatenFilter");
            var counts = mapTokvArray(reduce(records,'eaten',null,'bites',null,0,countCombine), "key", "count");
            $scope.labeledCounts = [{
              key:"Key",
              values:counts
            }];
          }, true);
        }
      }

      $scope.filters = $rootScope.filters;
    }])



    .controller('GlobalDataCtrl',['$scope', '$rootScope', function($scope, $rootScope) {
  $rootScope.dataObject = [];
  $rootScope.filters = {
    dateFilter:
    {
      to: null,
      from: null,
      apply: function(r) { return (!this.to || r.time < this.to) && (!this.from || r.time >= this.from); }
    },
    eaterFilter:
    {
      selected: null,
      apply: function(r) { return (!this.selected || r.eater.toUpperCase() === this.selected.toUpperCase()); }
    },
    eatenFilter:
    {
      selected: null,
      apply: function(r) { return (!this.selected || r.eaten.toUpperCase() === this.selected.toUpperCase()); }
    }
  };

    var carnivores = ["Rex", "Allen", "Velossy"];
    var herbivores = ["Stegasaurus", "Trice", "Bronta"];



    var populate = function(dataObj) {
        var today = new Date();
        var dayInMilliseconds = 24*60*60*1000;
        var end = today.getTime();
        var start = end - 200 * dayInMilliseconds;
        dataObj.records = [];
        //TODO: irrelevant, but how do you make a good random time series?
        for( ;start<=end;start+=dayInMilliseconds) {
          var count = Math.floor(Math.pow(Math.random(), 3) * 10);
          var i;
          for (i=0;i<count;i++) {
            var car = Math.floor(Math.random() * 3);
            var veg = Math.floor(Math.random() * 3);
            var bites = 1 + Math.floor(Math.random() * 3);
            var time = start + Math.floor(Math.random() * dayInMilliseconds);
            dataObj.records.push({
              eater: carnivores[car],
              eaten: herbivores[veg],
              bites: bites,
              time: time
            })

          }
        }
    }


    populate($scope.dataObject);
}]).filter('timestampToTime',function() {
      return function(t) {
        var d = new Date();
        d.setTime(t);
        return d.toDateString();
      }

    });


