
/**
 * demoApp - 1.0.0rc2
 */

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
      return function(records, queryObject){
        var i;
        var output = [];
        for(i=0;i<records.length;i++) {
          var record = records[i];
          if ((!queryObject.from || record.time >= queryObject.from) && (!queryObject.to || record.time < queryObject.to)) {
            console.log(queryObject);
            output.push(record);
          }
        }
        return output;
      }
    }])
    .directive('calendarConverter', [function() {
      return {
        restrict:'E',
        scope: {
          data: '=',
          query: '='
        },
    controller: 'queryConverterCtrl'
      }
    }])
    .controller('queryConverterCtrl',['$scope','$rootScope','$filter', function($scope, $rootScope, $filter) {
      console.log('controller');
      console.log($scope);
      $scope.dataObject = $rootScope.dataObject;
      $scope.counts = $filter('timestampToDay')($scope.dataObject.records);  //TODO TDOD:sum


      $scope.queryObject = $rootScope.queryObject;
      $scope.selectedRanges = [{start:null,end:null}];
      console.log($scope);
      $scope.$watch('selectedRanges', function() {
        console.log($scope.selectedRanges);
        if ($scope.selectedRanges.length !== null && $scope.selectedRanges.length !== undefined && $scope.selectedRanges.length > 0) {
          $rootScope.queryObject.from = $scope.selectedRanges[0].start;
          $rootScope.queryObject.to = $scope.selectedRanges[0].end;
        } else {
          $rootScope.queryObject.from = null;
          $rootScope.queryObject.to = null;
        }
        console.log($scope.selectedRanges);
        console.log('queryobject');
        console.log($rootScope.queryObject);
      }, true);

      $rootScope.$watch('queryObject.from', function(val) {
        console.log($scope.selectedRanges);
        $scope.selectedRanges[0].start = val;
        console.log($scope.selectedRanges);
        console.log('queryobject');

      });

      $rootScope.$watch('queryObject.to', function(val) {
        console.log($scope.selectedRanges);
        $scope.selectedRanges[0].end = val;
        console.log($scope.selectedRanges);
      });



    }])

    .controller('GlobalDataCtrl',['$scope', '$rootScope', function($scope, $rootScope) {
    console.log("global data controller");
  $rootScope.dataObject = [];
  $rootScope.queryObject = {
      from: null,
      to: null
    };

    var carnivores = ["Rex", "Allen", "Velossy"];
    var herbivores = ["Steggy", "Trice", "Bronta"];



    var populate = function(dataObj) {
      console.log("populating records");
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
      console.log(dataObj);
    }


    populate($scope.dataObject);
      console.log('dataObject');
    console.log($scope.dataObject);
}]).filter('timestampToTime',function() {
      return function(t) {
        var d = new Date();
        d.setTime(t);
        return d.toDateString();
      }

    });


