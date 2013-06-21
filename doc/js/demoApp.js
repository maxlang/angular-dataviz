
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


  for(i=0;i<selectedRecords.length;i++) {
    var n = (nodeTransform && nodeTransform(selectedRecords[i][node])) || selectedRecords[i][node];
    var prevIdx = nodesByPerson[selectedRecords[i].name].indexOf(n);
    var prev = prevIdx <= 0 ? nodeDefault : nodesByPerson[selectedRecords[i].name][prevIdx - 1];

    if(!(n in nodes)) {
      nodes[n] = data.nodes.length;
      data.nodes.push({
        name:n
      });
    }

    if(!(prev in nodes)) {
      nodes[prev] = data.nodes.length;
      data.nodes.push({
        name:prev
      });
    }

    if (!links[prev]) {
      links[prev] = {};
    }

    if (n in links[prev]) {
      links[prev][n] = combineFn(links[prev][n],1);
    } else {
      links[prev][n] = combineFn(valueDefault,1);
    }

  }

  var j,k;

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

function sumCombine(a,b) {
  return a+b;
}
function countCombine(a) {
  return a+1;
}

function listCombine(a, b) {
  return a.concat(b);
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

    .controller('dashboardCtrl', ['$scope','$rootScope', '$filter', function($scope, $rootScope, $filter) {


      $scope.params = {};

      ///CALENDAR 1
      $scope.cal1data = d3.entries(reduce($rootScope.dataObject.records,'time',timestampToDate,'state',null,0,countCombine));

      $scope.cal1params = {};

      $scope.cal1params.options = {};
      $scope.cal1params.options.widthPx = 586;

      $scope.params.dateFilter = [];

      $scope.cal1params.filter = $scope.params.dateFilter;

      //CALENDAR 2
      $scope.cal2data = d3.entries(reduce($rootScope.dataObject.records,'time',timestampToDate,'state',null,0,countCombine));

      $scope.cal2params = {};

      $scope.cal2params.filter = $scope.params.dateFilter;

      //NOTE: we avoid watches on the calendar filter by modifying the filter array instead of replacing it

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
            console.log(records);
              $scope.cal1data = d3.entries(reduce(records,'time',timestampToDate,'bites',null,0,sumCombine));
              $scope.cal2data = d3.entries(reduce(records,'time',timestampToDate,'bites',null,0,countCombine));
          }, true);
        }
      }

      // BAR CHART 1
      $scope.bar1data = d3.entries(reduce($rootScope.dataObject.records,'state',null,'name',null,0,countCombine));

      $scope.bar1params = {};

      $scope.bar1params.filter = [];

      $scope.$watch('bar1params.filter', function(val) {
        if (val!==null && val!==undefined && val.length > 0) {
          $rootScope.filters.eaterFilter.selected = val;
        } else {
          $rootScope.filters.eaterFilter.selected = null;
        }
      }, true);

      //TODO: add watch on filters.eaterFilter

      // add a watch to all other filters
      var filterKey;
      for(filterKey in $rootScope.filters) {
        if (filterKey !== "eaterFilter") {
          $scope.$watch('filters.'+filterKey, function() {
            var records = $filter('inView')($rootScope.dataObject.records, $rootScope.filters, "eaterFilter");
            $scope.bar1data = d3.entries(reduce(records,'state',null,'name',null,0,countCombine));
          }, true);
        }
      }

      // BAR CHART 2
      $scope.bar2data = d3.entries(reduce($rootScope.dataObject.records,'eaten',null,'bites',null,0,countCombine));

      $scope.bar2params = {};

      $scope.bar2params.filter = [];

      $scope.$watch('bar2params.filter', function(val) {
        if (val!==null && val!==undefined && val.length > 0) {
          $rootScope.filters.eatenFilter.selected = val;
        } else {
          $rootScope.filters.eatenFilter.selected = null;
        }
      }, true);

      //TODO: add watch on filters.eatenFilter

      // add a watch to all other filters
      var filterKey;
      for(filterKey in $rootScope.filters) {
        if (filterKey !== "eatenFilter") {
          $scope.$watch('filters.'+filterKey, function() {
            var records = $filter('inView')($rootScope.dataObject.records, $rootScope.filters, "eatenFilter");
            $scope.bar2data = d3.entries(reduce(records,'eaten',null,'bites',null,0,countCombine));
          }, true);
        }
      }

     //SANKEY

      $scope.sankeyData = toNodesAndLinks($rootScope.dataObject.records, $rootScope.dataObject.records, 'state', null, "No contact", 0, countCombine);

      var filterKey;
      for(filterKey in $rootScope.filters) {
        if (filterKey !== "sankeyFilter") {
          $scope.$watch('filters.'+filterKey, function() {
            var records = $filter('inView')($rootScope.dataObject.records, $rootScope.filters, "sankeyFilter");
            $scope.sankeyData = toNodesAndLinks($rootScope.dataObject.records, records, 'state', null, "No contact", 0, countCombine);
          }, true);
        }
      }


    }])



    .controller('GlobalDataCtrl',['$scope', '$rootScope', function($scope, $rootScope) {
  $rootScope.dataObject = [];
  $rootScope.filters = {
    dateFilter:
    {
      to: null,
      from: null,
      applyFilter: function(r) { return (!this.to || r.time < this.to) && (!this.from || r.time >= this.from); }
    },
    eaterFilter:
    {
      selected: null,
      applyFilter: function(r) { return (!this.selected || _.contains(this.selected, r.state)); }
    },
    eatenFilter:
    {
      selected: null,
      applyFilter: function(r) { return (!this.selected || _.contains(this.selected, r.eaten)); }
    }
  };

    var dinosaurs = //["Rex", "Allen", "Velossy", "Stegosaurus", "Trice", "Bronta", "Tom", "Susan", "Ed", "Joe", "Bill", "Stacy", "Wilma", "Karl", "Pete", "Stan", "Lucy", "Jen", "Janet"];
      [
      "Les",
      "Alyssa",
      "Stephine",
      "Hyo",
      "Diann",
      "Jamar",
      "Rosina",
      "Belen",
      "Apryl",
      "Nenita",
      "Carmon",
      "Laraine",
      "Kelvin",
      "Joaquina",
      "Eddie",
      "Raymond",
      "Charles",
      "Leontine",
      "Jacinta",
      "Tracie",
      "Ivy",
      "Corey",
      "Julissa",
      "Marisela",
      "Donella",
      "Lane",
      "Shantay",
      "Effie",
      "Anisa",
      "Yuette",
      "Brenna",
      "Golda",
      "Fairy",
      "Darrin",
      "Evangeline",
      "Marlin",
      "Rodrigo",
      "Suzanne",
      "Elma",
      "Launa",
      "Tova",
      "Tamie",
      "Danyel",
      "Georgann",
      "Elna",
      "Caterina",
      "Faviola",
      "Corrie",
      "Morris",
      "Nick",
      "Catrina",
      "Daphine",
      "Tarsha",
      "Carmelo",
      "Shemeka",
      "Jamel",
      "Candice",
      "Chelsea",
      "Tommy",
      "Sunny",
      "Vance",
      "Bee",
      "Christin",
      "Forrest",
      "Meridith",
      "Maybell",
      "Veola",
      "Randi",
      "Francisco",
      "Latoyia",
      "Anna",
      "Spencer",
      "Louisa",
      "Tova",
      "Teresita",
      "Cheryll",
      "Walker",
      "Brain",
      "Newton",
      "Lynna",
      "Easter",
      "Glynis",
      "Afton",
      "Grady",
      "Dede",
      "Bell",
      "Coletta",
      "Shana",
      "Klara",
      "Noemi",
      "Mireille",
      "Man",
      "Frederic",
      "Tifany",
      "Steven",
      "Tarra",
      "Mirna",
      "Ezra",
      "Glenda",
      "Lloyd"
      ];



      var states = ["No contact", "Resume", "Phone screen", "Phone screen 2", "Onsite interview", "Onsite interview 2", "Hired", "Rejected"];

    var transitions = [[0, 1], [1, 2], [2, 3], [2, 4], [3, 4], [4, 5], [4, 6], [5,6], [1,7], [2,7], [3,7], [4,7], [5,7]];

    var phone = [1,2];
    var onsite = [3,4,5];
    var reject = [8, 9, 10, 11, 12];
    var hire = [6, 7];


    var getGaussian = function(min, max) {
      min = _.isNumber(min) && min || 0;
      max = _.isNumber(max) && max || 1;
      return min + ((Math.random() + Math.random() + Math.random()) * (max - min)/3);
    };

    var populate = function(dataObj) {
        var today = new Date();
        var dayInMilliseconds = 24*60*60*1000;
        var end = today.getTime();
        var start = end - 200 * dayInMilliseconds;
        var i, j;
        var currentStates = {};

        dataObj.records = [];
        //TODO: irrelevant, but how do you make a good random time series?

        var lastInterviewDay = start;
        var onsiteCapped = false;
        var phoneCapped = false;

        for( ;start<=end;start+=dayInMilliseconds) {
          var phoneInterviewDay = getGaussian(0, phoneCapped ? 5 : 10) < 2;
          var onsiteInterviewDay = getGaussian(0, onsiteCapped ? 5 : 10 ) < 2;

          if (phoneInterviewDay || onsiteInterviewDay) {
            lastInterviewDay = start;
          }

          if (phoneInterviewDay) {
            console.log('phone');
            var phoneCount = 0;
            for(i = 0; i < dinosaurs.length && phoneCount < 10; i++) {
              if (currentStates[dinosaurs[i]] === states[1] || currentStates[dinosaurs[i]] === states[2] && getGaussian(0,10) < 8) {
                for (j = 0; j < phone.length; j++) {
                  if (currentStates[dinosaurs[i]] === states[transitions[phone[j]][0]]) {
                    dataObj.records.push({
                      name: dinosaurs[i],
                      time: start,
                      state: states[transitions[phone[j]][1]]
                    });
                    currentStates[dinosaurs[i]] = states[transitions[phone[j]][1]];
                    phoneCount++;
                    break;
                  }
                }
              }
            }
            if (phoneCount === 10) {
              phoneCapped = true;
            } else {
              phoneCapped = false;
            }
          }

          if (onsiteInterviewDay) {
            console.log('onsite');
            var onsiteCount = 0;
            for(i = 0; i < dinosaurs.length && onsiteCount < 2; i++) {
              if (currentStates[dinosaurs[i]] === states[1] || currentStates[dinosaurs[i]] === states[2] && getGaussian(0,10) < 8) {
                for (j = 0; j < onsite.length; j++) {
                  if (currentStates[dinosaurs[i]] === states[transitions[onsite[j]][0]]) {
                    dataObj.records.push({
                      name: dinosaurs[i],
                      time: start,
                      state: states[transitions[onsite[j]][1]]
                    });
                    currentStates[dinosaurs[i]] = states[transitions[onsite[j]][1]];
                    onsiteCount++;
                    break;
                  }
                }
              }
            }
            if (onsiteCount === 2) {
              onsiteCapped = true;
            } else {
              onsiteCapped = false;
            }
          }



          for(i = 0; i < dinosaurs.length; i++) {
            if ((currentStates[dinosaurs[i]] === states[0] || currentStates[dinosaurs[i]] === undefined) && getGaussian(0,10) < 2) {
              dataObj.records.push({
                name: dinosaurs[i],
                time: start,
                state: states[1]
              });
              currentStates[dinosaurs[i]] = states[1];
            } else if (getGaussian(0, ((start - lastInterviewDay)/dayInMilliseconds)) > 2 && ((start - lastInterviewDay)/dayInMilliseconds) < 6) {
              for (j = 0; j < reject.length; j++) {
                if (currentStates[dinosaurs[i]] === states[transitions[reject[j]][0]] && getGaussian(0,10) < 5) {
                  console.log('reject');
                  dataObj.records.push({
                    name: dinosaurs[i],
                    time: start,
                    state: states[transitions[reject[j]][1]]
                  });
                  currentStates[dinosaurs[i]] = states[transitions[reject[j]][1]];
                  break;
                }
              }
            }
            for (j = 0; j < hire.length; j++) {
              if (currentStates[dinosaurs[i]] === states[transitions[hire[j]][0]] && getGaussian(0,10) < 3) {
                console.log('hire');
                dataObj.records.push({
                  name: dinosaurs[i],
                  time: start,
                  state: states[transitions[hire[j]][1]]
                });
                currentStates[dinosaurs[i]] = states[transitions[hire[j]][1]];
                break;
              }
            }
          }
        }
    };

    populate($scope.dataObject);
}]).filter('timestampToTime',function() {
      return function(t) {
        var d = new Date();
        d.setTime(t);
        return d.toDateString();
      }

    });


