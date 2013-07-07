var module = angular.module('geocodeApp', ['dataviz'], function ($locationProvider) {
  $locationProvider.hashPrefix('');

});

module
    .controller('mainCtrl', ['$scope', '$timeout', '$q', function ($scope, $timeout, $q) {
      $scope.outputJson = [];

        $scope.addLocations = function() {
          var json = JSON.parse($scope.inputJson);
          $scope.outputJson = json;

          var g = new google.maps.Geocoder();

          var timeOffset = 1000;

          var maxRetries = 5;

          var findLocation = function(location, retries) {
            var d = $q.defer();
            timeOffset += 1000;
            $timeout(function() {
              console.log("attempting to geocode location", location);
              g.geocode({
                "address":location,
                "region": 'en-us'
              }, function(results, status) {
                console.log(location, results, status, timeOffset);
                if (results && results.length === 0) {
                  if (maxRetries === retries) {
                    d.reject("Reached max retries");
                  }
                  timeOffset += 1000;
                  findLocation(location, retries + 1).then(function(l) {
                    d.resolve(l);
                  });
                } else {
                  var l = results[0].geometry.location;
                  d.resolve(l);
                }
              });
            }, timeOffset);
            return d.promise;
          };

          _.each(json, function(v, i) {
            console.log(v);
            if ((v.address || v.location || _.keys(v).length === 1) && (!v.lat || !v.lng)) {
              var location = v.address || v.location || v[_.keys(v)[0]];

              if (location) {
                findLocation(location, 0).then(function(l) {
                  v.lat = l.lat();
                  v.lng = l.lng();
                });
              }
            }

          })

        }
      }]);
