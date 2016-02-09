'use strict';
define(['angular', 'angular-mocks'], function() {
  describe('The anchor filter', function() {
    var anchorFilter;
    var measurementMomentService;

    beforeEach(module('trialverse.util'));
    beforeEach(module('trialverse.measurementMoment'));

    beforeEach(inject(function($filter, MeasurementMomentService) {
      measurementMomentService = MeasurementMomentService;
      anchorFilter = $filter('anchorFilter');
    }));

    it('should pass though undefined measuremoments', function() {
      expect(anchorFilter(undefined)).toEqual(undefined);
    });

    it('should should use the measurementMomentService to genrate the label', function() {
      var mockMoment = 'nice moment you have there';
      spyOn(measurementMomentService, 'generateLabel');
      anchorFilter(mockMoment);
      expect(measurementMomentService.generateLabel).toHaveBeenCalledWith(mockMoment);
    });

  });
});
