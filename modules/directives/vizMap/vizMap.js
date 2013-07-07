angular.module('dataviz.directives', ['ui.map']).directive('vizMap', [function() {
  return {
    restrict: 'E',
    scope: {
      'data': '=', //expects an array of objects with lat lng and weight
      'params' : '='
    },
    template: '<div id="map_canvas" ui-map="myMap" class="map" ui-options="mapOptions"></div>',
//        'ui-event="{}"' +
//    'ui-event="{\'map-click\': \'addMarker($event, $params)\', \'map-zoom_changed\': \'setZoomMessage(myMap.getZoom())\' }"' +
//    'ui-options="mapOptions">' +
//    '</div>',
    'controller': ['$scope', function ($scope) {
      $scope.myMarkers = [];
      $scope.myMap = {};

      var defaultOptions = {
        heatmap : true,
        mapOptions: {
          center: new google.maps.LatLng(39.232253,-98.539124),
          zoom: 4,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        }
      };

      var options = defaultOptions;

      $scope.$watch('params.options', function(o) {
        var options = defaultOptions;
        _.extend(options, o);
      });

      $scope.$watch('data', function(data) {
        if (data) {
          var locations = _(data).filter(function(d) {
            return d.lat && d.lng;
          }).map(function(d) {
            if (d.lat && d.lng) {
              return new google.maps.LatLng(d.lat, d.lng);
            }
          }).value();

          if (options.heatmap) {

            var pointArray = new google.maps.MVCArray(locations);

            var heatmap = new google.maps.visualization.HeatmapLayer({
              data: pointArray
            });

            heatmap.setMap($scope.myMap);
          } else {
            $scope.myMarkers = [];
            _.each(locations, function(l) {
              $scope.myMarkers.push(new google.maps.Marker({
                map: $scope.myMap,
                position: l
              }));
            });
          }

        }
      });

      $scope.mapOptions = {
        center: new google.maps.LatLng(39.232253,-98.539124),
        zoom: 4,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };

//      $scope.addMarker = function($event, $params) {
//        $scope.myMarkers.push(new google.maps.Marker({
//          map: $scope.myMap,
//          position: $params[0].latLng
//        }));
//      };
//
//      $scope.setZoomMessage = function(zoom) {
//        $scope.zoomMessage = 'You just zoomed to '+zoom+'!';
//        console.log(zoom,'zoomed')
//      };
//
//      $scope.openMarkerInfo = function(marker) {
//        $scope.currentMarker = marker;
//        $scope.currentMarkerLat = marker.getPosition().lat();
//        $scope.currentMarkerLng = marker.getPosition().lng();
//        $scope.myInfoWindow.open($scope.myMap, marker);
//      };
//
//      $scope.setMarkerPosition = function(marker, lat, lng) {
//        marker.setPosition(new google.maps.LatLng(lat, lng));
//      };
//
//      $scope.panToMarker = function(marker) {
//        $scope.myMap.panTo(marker.getPosition());
//      }
    }]
  };
}]);
