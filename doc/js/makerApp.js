var module = angular.module('makerApp', ['dataviz', 'ui', 'colorpicker.module'], function ($locationProvider) {
  $locationProvider.hashPrefix('');
  // Make code pretty
  window.prettyPrint && prettyPrint();
});



module    .controller('makerCtrl', ['$scope', '$rootScope', '$filter', '$location', '$http', function ($scope, $rootScope, $filter, $location, $http) {

      $scope.viz = {
        type: $location.search().type,
        data: $location.search().data,
        config: $location.search().config
      };

      $scope.$watch('viz.data', function(d) {
        $location.search('data',d);
        if (d) {
          $scope.viz.parsedData = JSON.parse(d);
        }
      });

      $scope.$watch('viz.config', function(c) {
        $location.search('config',c);
        if (c) {
          $scope.viz.parsedConfig = JSON.parse(c);
        }
      });

      $scope.$watch('viz.parsedConfig.filter', function(f) {
        console.log(f);
        $scope.viz.config = JSON.stringify($scope.viz.parsedConfig);
      }, true);

      $scope.$watch('viz.type', function(t) {
        $location.search('type',t);
      });

      $scope.github = {
        user:"maxlang"
      };

      $scope.success = false;
      $scope.auth = function() {
        console.log($scope.github.username);
        $scope.gh = new Github({
          username: $scope.github.user,
          password: $scope.github.password,
          auth: "basic"
        });

        $scope.user = $scope.gh.getUser();
        $scope.user.repos(function(err, repos) {
          $scope.err = err;
          $scope.repos = repos;
          if($scope.err != null)
          {
            console.log($scope.err);
          }else
          {
            console.log($scope.repos);
            $scope.success = true;
          }
        });

        $scope.user.gists(function(err, gists) {
          console.log(err, gists);
          var g = $scope.gh.getGist('1234');
          console.log(g);
          $scope.gists = gists;
          $scope.$apply();
        });

      };

      var githubFetch = function (queryParams) {

        var result = null;

        if (!$scope.github.password || !$scope.github.user) {

            result = $http.get(queryParams.url, queryParams.data).success(queryParams.success);

            result.abort = function() {
              return null;
            };

            $scope.$apply();

            return result;
        }


        var auth = Base64.encode($scope.github.user + ":" + $scope.github.password);

        queryParams.data.headers = {'Authorization': 'Basic '+auth};

        result = $http.get(queryParams.url, queryParams.data).success(queryParams.success);

        result.abort = function() {
          return null;
        };

        $scope.$apply();

        return result;
      };

      var queryTerm = "";

      $scope.select2Options = {
        ajax: {
          url: 'https://api.github.com/users/maxlang/gists',
          data: function (term) {
            console.log(term);
            queryTerm = term;
            return {
              query: term
            }; // query params go here
          },
          transport: githubFetch,
          results: function (data) {
            console.log(data, arguments, this);
           _.each(data, function(v) {
              v.text = v.id + " : "  + v.description;
            });
            var results = _.filter(data, function(v) {
              return v.public && ((v.description.toUpperCase().indexOf(queryTerm.toUpperCase()) > -1) || (v.id.toUpperCase().indexOf(queryTerm.toUpperCase()) > -1));
            });
            return {results: results};
          }
        },
        id: function (obj) {
          return obj.id;
        },
        // extra dropdown option to create a new topic
        createSearchChoice: function(term) {
          return {
            id: term,
            text: term + " (not by " + $scope.github.user + ")",
            create: true
          };
        },
        placeholder: "Pick a gist",
        formatResult: function(gist) {
          return gist.id + " : " + (gist.description || "(no description)");
        },
        width: 300,
        matcher: function(term, text, option) {
          console.log(term, text, option);
        }
      };

      $scope.$watch('github.gist', function(gist) {
        if (gist) {
          var jsfiles = _(gist.files).map(function(v, k) {
            return k;
          }).filter(function(v) {
            return v.indexOf('.js') === v.length - 3;
          });
          var cssfiles = _(gist.files).map(function(v, k) {
            return k;
          }).filter(function(v) {
            return (v.indexOf('.css') === v.length - 4) || (v.indexOf('.less') === v.length - 5);
          });
          var htmlfiles = _(gist.files).map(function(v, k) {
            return k;
          }).filter(function(v) {
            return v.indexOf('.html') === v.length - 5;
          });

          var newfiles = { files: {}};

          if (_.isEmpty(jsfiles)) {
            newfiles.files["script.js"] = {
              content: "//script.js"
            };
            jsfiles.push('script.js');
          }

          if (_.isEmpty(cssfiles)) {
            newfiles.files["styles.less"] = {
              content: "//styles.less"
            };
            cssfiles.push('styles.less');
          }

          if (_.isEmpty(htmlfiles)) {
            newfiles.files["index.html"] = {
              content: "<!-- index.html --><body></body>"
            };
            htmlfiles.push('index.html');
          }
          var auth = Base64.encode($scope.github.user + ":" + $scope.github.password);
          var headers = {'Authorization': 'Basic '+auth};

          $http({method:"PATCH",url:"https://api.github.com/gists/"+gist.id, data:newfiles, headers:headers}).success(function() {
            $('.editr').data('filesJs','$' + gist.id + "," + jsfiles.join(',')).data('filesHtml','$' + gist.id + "," + htmlfiles.join(',')).data('filesCss','$' + gist.id + "," + cssfiles.join(',')).each(function() {
              new Editr({ el: this });
            });
          });
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


module.directive('makerResize', function() {
  return {
    restrict: 'E',
    link:function(scope, elt)
    {
      $(elt[0]).resizable({
        resize: function( event, ui ) {
          scope.viz.parsedConfig.options.heightPx = ui.size.height;
          scope.viz.parsedConfig.options.widthPx = ui.size.width;
          scope.viz.config = JSON.stringify(scope.viz.parsedConfig);
          scope.$digest();
        }
      });
    }
  };
});
