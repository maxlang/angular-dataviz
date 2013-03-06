
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
}]).filter('rangeToDay', [function() {
      return function(input) {
        console.log('filter');
        console.log(input);
        if(input===null || input===undefined) {
          return [];
        }
        var output =  input.map(function(e) {
          var d = new Date();
          d.setTime(e.start);
          return {
            date: d.getFullYear() + "-" + (d.getMonth()+1) + "-" + d.getDate(),
            count: e.count
          };
        });
        console.log(output);
        return output;
      };
    }])
    .controller('queryConverterCtrl',['$scope','$rootScope','$filter', function($scope, $rootScope, $filter) {
      console.log('controller');
      console.log($scope);
      $scope.dataObject = $rootScope.dataObject;
      $scope.counts = $filter('rangeToDay')($scope.dataObject.dateRangeCounts);
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
    var populate = function(dataObj) {
      console.log("populating");
        var today = new Date();
        var dayInMilliseconds = 24*60*60*1000;
        var end = today.getTime();
        var start = end - 100 * dayInMilliseconds;
        dataObj.dateRangeCounts = [];
        dataObj.dateDayCounts = [];
        for( ;start<=end;start+=dayInMilliseconds) {
          dataObj.dateRangeCounts.push({
            start: start,
            end: start+dayInMilliseconds,
            count: Math.floor(Math.pow(Math.random(), 3) * 10)
          });
          var day = new Date();
          day.setTime(start);

          dataObj.dateDayCounts.push({
            date: day.getFullYear()+'-'+(day.getMonth()+1)+'-'+day.getDate(),
            count: Math.floor(Math.pow(Math.random(), 3) * 10)
          });

        }
      console.log(dataObj);
    }


    populate($scope.dataObject);
      console.log('dataObject');
    console.log($scope.dataObject);
}]);

