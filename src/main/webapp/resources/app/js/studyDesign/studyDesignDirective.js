'use strict';
define([], function() {
  var dependencies = ['$stateParams', '$q', 'ArmService', 'EpochService', 'ActivityService', 'StudyDesignService'];

  var StudyDesignDirective = function($stateParams, $q, ArmService, EpochService, ActivityService, StudyDesignService) {
    return {
      restrict: 'E',
      templateUrl: 'app/js/studyDesign/studyDesignDirective.html',
      scope: {
        isEditingAllowed: '='
      },
      link: function(scope) {

        var refreshStudyDesignListener;

        var reloadData = function() {
          if (refreshStudyDesignListener) {
            // cancel listening while loading
            refreshStudyDesignListener();
          }

          var armsPromise = ArmService.queryItems($stateParams.studyUUID).then(function(result) {
            scope.arms = result.sort(function(a, b) {
              return a.label.localeCompare(b.label);
            });
          });

          var epochsPromise = EpochService.queryItems().then(function(result) {
            scope.epochs = result.sort(function(a, b) {
              return a.pos - b.pos;
            });
          });

          var activitiesPromise = ActivityService.queryItems().then(function(result) {
            scope.activities = result.sort(function(a, b) {
              return a.label.localeCompare(b.label);
            });
          });

          $q.all([armsPromise, epochsPromise, activitiesPromise]).then(function() {

            StudyDesignService.queryItems().then(function(coordinates) {
              var activityMap = _.indexBy(scope.activities, 'activityUri');
              var studyDesign = _.object(_.pluck(scope.epochs, 'uri'));

              _.each(scope.epochs, function(epoch) {
                studyDesign[epoch.uri] = _.object(_.pluck(scope.arms, 'armURI'));
              });

              _.each(coordinates, function(coordinate) {
                studyDesign[coordinate.epochUri][coordinate.armUri] = activityMap[coordinate.activityUri];
              });
              scope.studyDesign = studyDesign;

              // only listen for events when laoding is done
              refreshStudyDesignListener = scope.$on('refreshStudyDesign', function() {
                reloadData();
              });

            });

          });
        };

        reloadData();

        scope.onActivitySelected = function(epochUri, armUri, activity) {
          var coordinate = {
            epochUri: epochUri,
            armUri: armUri,
            activityUri: activity.activityUri
          };
          StudyDesignService.setActivityCoordinates(coordinate);
        };

      }

    };
  };

  return dependencies.concat(StudyDesignDirective);
});