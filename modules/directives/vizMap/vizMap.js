angular.module('dataviz.directives').directive('vizMap', [function() {
  return {
    restrict: 'E',
    scope: {
      'data': '=', //expects an array of objects with lat lng and weight
      'params' : '='
    },
    template: '<div id="map_canvas" ui-map="myMap" class="map" ui-options="mapOptions"' +
//        'ui-event="{}"' +
      ' ui-event="{\'map-bounds_changed\': \'boundsChanged($event, $params)\', \'map-deactivate\': \'dragEnd($event, $params)\' }"' +
//    'ui-options="mapOptions">' +
    '></div>',
    'controller': ['$scope', function ($scope) {
      $scope.myMarkers = [];
      $scope.myMap = {};

      var defaultOptions = {
        heatmap : true,
        cluster : true,
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
        $scope.mapOptions = options.mapOptions;
        redrawMarkers($scope.data);
      });

      $scope.boundsChanged = function() {
        redrawMarkers($scope.data);
      };



      var selectedGradient = [
        'rgba(0, 255, 255, 0)',
        'rgba(0, 255, 255, 1)',
        'rgba(0, 191, 255, 1)',
        'rgba(0, 127, 255, 1)',
        'rgba(0, 63, 255, 1)',
        'rgba(0, 0, 255, 1)',
        'rgba(0, 0, 223, 1)',
        'rgba(0, 0, 191, 1)',
        'rgba(0, 0, 159, 1)',
        'rgba(0, 0, 127, 1)',
        'rgba(63, 0, 91, 1)',
        'rgba(127, 0, 63, 1)',
        'rgba(191, 0, 31, 1)',
        'rgba(255, 0, 0, 1)'
      ];

      var deselectedGradient = "rgba(102, 255, 0, 0);rgba(102, 255, 0, 1);rgba(147, 255, 0, 1);rgba(193, 255, 0, 1);rgba(238, 255, 0, 1);rgba(244, 227, 0, 1);rgba(249, 198, 0, 1);rgba(255, 170, 0, 1);rgba(255, 113, 0, 1);rgba(255, 57, 0, 1);rgba(255, 0, 0, 1)".split(";");

      var dHeatmap;
      var sHeatmap;
      var initHeatmaps = function() {
        sHeatmap = new google.maps.visualization.HeatmapLayer({
          data: []
        });

        dHeatmap= new google.maps.visualization.HeatmapLayer({
          data: []
        });

        dHeatmap.setMap($scope.myMap);
        sHeatmap.setMap($scope.myMap);

        sHeatmap.setOptions({
          gradient: selectedGradient
        });

        dHeatmap.setOptions({
          gradient: deselectedGradient
        });

      };


      var redrawMarkers = function(data) {
        //init heatmaps
        if (!dHeatmap || !sHeatmap) {
          initHeatmaps();
        }

        //init drag zoom
        if ($scope.myMap.getDragZoomObject() === undefined) {
          console.log("enable zoom");
          $scope.myMap.enableKeyDragZoom();
          var dz = $scope.myMap.getDragZoomObject();
//          google.maps.event.addListener(dz, 'activate', function () {
//            console.log('KeyDragZoom Activated');
//          });
//          google.maps.event.addListener(dz, 'deactivate', function () {
//            console.log('KeyDragZoom Deactivated');
//          });
//          google.maps.event.addListener(dz, 'dragstart', function (latlng) {
//            console.log('KeyDragZoom Started: ' + latlng);
//          });
//          google.maps.event.addListener(dz, 'drag', function (startPt, endPt) {
//            console.log('KeyDragZoom Dragging: ' + startPt + endPt);
//          });
          google.maps.event.addListener(dz, 'dragend', function (bnds) {
            console.log('KeyDragZoom Ended: ', bnds);
            $scope.params.filter[0] = bnds;
            redrawMarkers($scope.data);
          });
        }

        if (data) {
          var selectedLocations = _(data).filter(function(d) {
                if (!(d.lat && d.lng)) {
                  return false;
                }
                var l = new google.maps.LatLng(d.lat, d.lng);
                return $scope.myMap.getBounds() && $scope.myMap.getBounds().contains(l) && $scope.params.filter[0] && $scope.params.filter[0].contains(l);
              }).map(function(d) {
                if (d.lat && d.lng) {
                  return {location: new google.maps.LatLng(d.lat, d.lng), weight: d.weight || 1};
                }
              }).value();

          var deselectedLocations = _(data).filter(function(d) {
            if (!(d.lat && d.lng)) {
              return false;
            }
            var l = new google.maps.LatLng(d.lat, d.lng);
            return $scope.myMap.getBounds() && $scope.myMap.getBounds().contains(l) && (!$scope.params.filter[0] || !$scope.params.filter[0].contains(l));
          }).map(function(d) {
                if (d.lat && d.lng) {
                  return {location: new google.maps.LatLng(d.lat, d.lng), weight: d.weight || 1};
                }
              }).value();


          if (options.heatmap) {

            var selPointArray = new google.maps.MVCArray(selectedLocations);
            var deselPointArray = new google.maps.MVCArray(deselectedLocations);

            sHeatmap.setData(selPointArray);
            dHeatmap.setData(deselPointArray);

          } else {
            $scope.myMarkers = []; //TODO: remove old markers
            if (options.cluster) {
              var mc = new MarkerClusterer($scope.myMap);
              _.each(locations, function(l) {
                $scope.myMarkers.push(new google.maps.Marker({
                  //map: $scope.myMap,
                  position: l.location
                }));
              });
              mc.addMarkers($scope.myMarkers);
            } else {
              _.each(locations, function(l) {
                $scope.myMarkers.push(new google.maps.Marker({
                  map: $scope.myMap,
                  position: l.location
                }));
              });
            }
          }

        }
      };

      $scope.$watch('data', function(data) {
        redrawMarkers(data);
      });

      $scope.mapOptions = options.mapOptions;

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
