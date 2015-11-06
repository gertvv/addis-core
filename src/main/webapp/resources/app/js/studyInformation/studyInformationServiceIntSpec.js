'use strict';
define(['angular', 'angular-mocks'], function() {
  describe('the population information service', function() {

    var rootScope, q,
      uUIDServiceStub,
      studyServiceMock = jasmine.createSpyObj('StudyService', ['getStudy']),

      studyInformationService,
      mockGeneratedUuid = 'newUuid',
      studyDefer

      ;

    beforeEach(module('trialverse'));
    beforeEach(function() {
      module('trialverse.util', function($provide) {
        uUIDServiceStub = jasmine.createSpyObj('UUIDService', [
          'generate'
        ]);
        uUIDServiceStub.generate.and.returnValue(mockGeneratedUuid);
        $provide.value('UUIDService', uUIDServiceStub);
        $provide.value('StudyService', studyServiceMock);
      });
    });


    beforeEach(inject(function($q, $rootScope, StudyInformationService) {
      q = $q;
      rootScope = $rootScope;

      studyDefer = q.defer();
      studyServiceMock.getStudy.and.returnValue(studyDefer.promise);

      studyInformationService = StudyInformationService;

    }));


    fdescribe('query study information', function() {

      var result;

      beforeEach(function(done) {
        var jsonStudy = {
          has_blinding: 'ontology:SingleBlind',
          has_allocation: 'ontology:AllocationRandomized',
          status: 'ontology:StatusWithdrawn',
          has_number_of_centers: 37,
          has_objective: 'objective'
        };
        studyDefer.resolve(jsonStudy);
        studyInformationService.queryItems().then(function(info) {
          result = info;
          done();
        });
        rootScope.$digest();
      });

      it('should return study information', function() {
        expect(result.length).toBe(1);
        expect(result[0].blinding).toBe('ontology:SingleBlind');
        expect(result[0].groupAllocation).toBe('ontology:AllocationRandomized');
        expect(result[0].status).toBe('ontology:StatusWithdrawn');
        expect(result[0].numberOfCenters).toBe(37);
        expect(result[0].objective).toBe('objective');
      });

    });

    describe('edit study information when there is no previous information', function() {

      var newInformation = {
        groupAllocation: {
          uri: 'ontology:AllocationRandomized'
        },
        blinding: {
          uri: 'ontology:SingleBlind'
        },
        status: {
          uri: 'ontology:Completed'
        },
        numberOfCenters: 29,
        objective: 'new study objective'
      };
      var studyInformation;

      beforeEach(function(done) {
        studyInformationService.editItem(newInformation).then(function() {
          studyInformationService.queryItems().then(function(resultInfo) {
            studyInformation = resultInfo;
            done();
          });
        });
        rootScope.$digest();
      });

      it('should make the new study information accessible', function() {
        expect(studyInformation).toBeDefined();
        expect(studyInformation[0].blinding).toEqual(newInformation.blinding);
        expect(studyInformation[0].groupAllocation).toEqual(newInformation.groupAllocation);
        expect(studyInformation[0].status).toEqual(newInformation.status);
        expect(studyInformation[0].numberOfCenters).toEqual(29);
        expect(studyInformation[0].objective).toBe(newInformation.objective);
      });

    });

    describe('edit study information with when there are previous results', function() {
      var result;
      var newInformation = {
        groupAllocation: {
          uri: 'ontology:AllocationNonRandomized'
        },
        blinding: {
          uri: 'ontology:DoubleBlind'
        },
        status: {
          uri: 'ontology:StatusSuspended'
        },
        numberOfCenters: 28,
        objective: 'new study objective'
      };


      beforeEach(function(done) {
        studyInformationService.editItem(newInformation).then(function() {
          studyInformationService.queryItems().then(function(resultInfo) {
            result = resultInfo;
            done();
          });
        });
        rootScope.$digest();
      });

      it('should overwrite previously selected values', function() {
        expect(result.length).toBe(1);
        expect(result[0].blinding).toBe(newInformation.blinding);
        expect(result[0].groupAllocation).toBe(newInformation.groupAllocation);
        expect(result[0].status).toBe(newInformation.status);
        expect(result[0].numberOfCenters).toBe(newInformation.numberOfCenters);
        expect(result[0].objective).toBe(newInformation.objective);
      });
    });

    describe('edit study information with "unknown" values in selects', function() {
      var result;
      var newInformation = {
        blinding: {
          uri: 'unknown'
        },
        groupAllocation: {
          uri: 'unknown'
        },
        status: {
          uri: 'unknown'
        }
      };

      beforeEach(function(done) {
        studyInformationService.editItem(newInformation).then(function() {
          studyInformationService.queryItems().then(function(resultInfo) {
            result = resultInfo;
            done();
          });
        });
        rootScope.$digest();
      });

      it('should delete previously selected values', function() {
        expect(result.length).toBe(1);
        expect(result[0].blinding).not.toBeDefined();
        expect(result[0].groupAllocation).not.toBeDefined();
        expect(result[0].status).not.toBeDefined();
      });
    });


  });
});
