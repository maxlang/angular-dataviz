angular.module('dataviz.directives')
  .directive('viz-gridstr', function($timeout) {
    return {
         restrict: 'E',
         scope: { model: '=model' },
         template: '<ul><widget ng-repeat="item in model" widget-model="item"></div></ul>',
         link: function($scope, $element, $attributes, $controller) {
           var gridster;
           var ul = $element.find('ul');
           var defaultOptions = {
                 widget_margins: [5, 5],
                 widget_base_dimensions: [70, 70]
         };
       var options = angular.extend(defaultOptions, $scope.$eval($attributes.options));

           $timeout(function() {
               gridster = ul.gridster(options).data('gridster');

                   gridster.options.draggable.stop = function(event, ui) {
                   //update model
                       angular.forEach(ul.find('li'), function(item, index) {
                           var li = angular.element(item);
                           if (li.attr('class') === 'preview-holder') {
                               return;
                             }
                           var widget = $scope.model[index];
                           widget.row = li.attr('data-row');
                           widget.col = li.attr('data-col');
                         });
                   $scope.$apply();
                 };
             });

           var attachElementToGridster = function(li) {
           //attaches a new element to gridster
               var $w = li.addClass('gs_w').appendTo(gridster.$el).hide();
           gridster.$widgets = gridster.$widgets.add($w);
           gridster.register_widget($w).add_faux_rows(1).set_dom_grid_height();
           $w.fadeIn();
         };
       $scope.$watch('model.length', function(newValue, oldValue) {
           if (newValue !== oldValue+1) {
               return; //not an add
             }
           var li = ul.find('li').eq(newValue-1); //latest li element
           $timeout(function() { attachElementToGridster(li); }); //attach to gridster
         });
     }
     };
    }).directive('widget', function() {
     return {
           restrict: 'E',
           scope: { widgetModel: '=' },
       replace: true,
           template:
        '<li data-col="{{widgetModel.col}}" data-row="{{widgetModel.row}}" data-sizex="{{widgetModel.sizex}}" data-sizey="{{widgetModel.sizey}}">'+
            '<div class="dynamic-visualization"><header><h2><input type="text" ng-model="zzzz"></h2> </header><barchart property-id="{{zzzz}}"></barchart></div>'+
            '</li>',
          link: function($scope, $element, $attributes, $controller) {
        }
    };
    }).controller('MainCtrl', function($scope) {
    $scope.widgets = [
      {text:'Widget #1', row:1, col:1, sizex:7, sizey:4},
      {text:'Widget #2', row:5, col:1, sizex:7, sizey:4}
        ];

      $scope.addWidget = function() {
      var randomSizex = 7;
      var randomSizey = 4;
      $scope.widgets.push({text:'Widget #'+($scope.widgets.length+1), row:1+($scope.widgets.length)*4, col:1, sizex:randomSizex, sizey:randomSizey});
    };
    });
