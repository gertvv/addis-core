'use strict';
define([], function() {
  var dependencies = ['DurationService'];

  var DurationInputDirective = function(DurationService) {
    return {
      restrict: 'E',
      templateUrl: 'app/js/util/directives/durationInput/durationInputDirective.html',
      scope: {
        durationString: '='
      },
      link: function(scope) {
        scope.parseDuration = DurationService.parseDuration;
        scope.generateDurationString = DurationService.generateDurationString;
        scope.periodTypeOptions = DurationService.getPeriodTypeOptions();
        scope.$watch('durationString', function(){
          scope.durationScratch = scope.parseDuration(scope.durationString);
        });
        if (typeof scope.durationString !== 'string') {
          scope.durationString = 'PT1H';
        }
        scope.durationScratch = scope.parseDuration(scope.durationString);
      }
    };
  };
  return dependencies.concat(DurationInputDirective);
});
