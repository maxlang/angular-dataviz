angular.module('dataviz.directives').directive('sidebar', [function() {
    return {
        restrict: 'E',
        scope: {
            'data': '=', //expects an array of selected label strings
            'data2': '=',
            'params' : '='  // expects an array of {key:<lable>,value:<count>} pairs
        },
        template: '<div class="sidebar-sizer"><div class="sidebars">' +
                  '<ul>' +
      '<li ng-repeat="item in data|orderBy:value|limitTo:barLimit" ng-class="{selected: item.selected}"> '  +
            '<div ng-click="select(item)" style="width:100%; position:relative">' +
      '<label>{{item.key}}</label>' +
      '<span class="value" style="width: {{(item.value/maxVal) * 100}}%"><span class="text">{{item.value}}</span></span>' +
      '<span class="cancel x" ng-show="item.selected"></span>' +
      '</div>' +
      '</li>' +
      '</ul>' +
      '</div></div>',
        link: function(scope, element, attributes) {

          var defaultOptions = {
            'barLimit' : 5
          };

          //TODO: better way to handle options, esp option merging
          function getOption(optionName) {
            return (scope.params && scope.params.options && scope.params.options[optionName]) || defaultOptions[optionName];
          }


          //INIT:
          scope.barLimit =getOption('barLimit');

          $(document).on('keyup keydown', function(e){
            scope.shifted = e.shiftKey; return true;}
          );

          function setSelectedLabels(labels) {
            var args = [0, scope.params.filter.length].concat(labels);
            Array.prototype.splice.apply(scope.params.filter, args);
          }



             scope.select = function(item) {
               if( item.selected) {
                 if(scope.shifted) {
                   setSelectedLabels(_.without(scope.params.filter, item.key));
                 } else {
                   setSelectedLabels([]);
                 }
               } else {
                 if(scope.shifted) {
                   scope.params.filter.push(item.key);
                   setSelectedLabels(scope.params.filter);
                 } else {
                   setSelectedLabels([item.key]);
                 }

               }
               _.each(scope.data, function(datum) {
                 datum.selected = _.contains(scope.params.filter, datum.key);
               });

             };



            scope.$watch('data',function(counts) {
              console.log("data!");
              if(counts!==undefined && counts!==null) {
                //update the max value
                scope.maxVal = _.max(counts,function(v) {return v.value; }).value;
                _.each(counts, function(count) {
                  count.selected = _.contains(scope.params.filter, count.key);
                });
              }
            }, true);

            scope.$watch('params.options', function() {
              //TODO: UPDATE WIDTH/HEIGHT OF CONTAINER HERE
              var w = getOption("widthPx");
              if(w) {
                element.find(".sidebar-sizer").width(w);
              }
              var h = getOption("heightPx");
              if(h) {
                element.find(".sidebar-sizer").height(h);
                if(!scope.params.options.barLimit) {
                  scope.barLimit = Math.floor(h/25);
                } else {
                  scope.barLimit = scope.params.options.barLimit;
                }
              }
            }, true);

        }
    };
}]);
