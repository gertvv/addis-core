'use strict';
define(['lodash', 'angular', 'angular-mocks', 'controllers'], function(_) {
  describe('The Single Study Benefit-Risk AnalysisController', function() {
    var scope;
    var userId = 54;
    var mockStateParams = {
      userUid: userId
    };
    var state = jasmine.createSpyObj('state', ['go']);
    var mockWindow = {
      config: {
        user: 'user'
      }
    };
    var outcomeResource = jasmine.createSpyObj('outcomeResource', ['query']);
    var interventionResource = jasmine.createSpyObj('InterventionResource', ['query']);
    var analysisResource = jasmine.createSpyObj('AnalysisResource', ['save']);
    var projectStudiesResource = jasmine.createSpyObj('projectStudiesResource', ['query']);
    var singleStudyBenefitRiskAnalysisService = jasmine.createSpyObj('singleStudyBenefitRiskAnalysisService', ['getProblem', 'getDefaultScenario', 'validateProblem',
      'concatWithNoDuplicates', 'addMissingOutcomesToStudies', 'addMissingInterventionsToStudies',
      'addHasMatchedMixedTreatmentArm', 'recalculateGroup', 'addOverlappingInterventionsToStudies'
    ]);
    var outcomesDeferred;
    var interventionDeferred;
    var mockOutcomes = [{
      name: 'mock outcome 1'
    }];
    var mockInterventions = [{
      name: 'mock intervention 1'
    }];
    var studiesDeferred;
    var mockStudies = [{
      studyUri: 'graphUid1',
      studyUid: 'uid1',
    }, {
      studyUri: 'graphuid2',
      studyUid: 'graphuid2'
    }];
    var q;
    var mockProject = {
      id: 1,
      namespaceUid: 456,
      datasetVersion: 'version',
      owner: 'user'
    };
    var mockAnalysis = {
      selectedOutcomes: {},
      interventionInclusions: [],
      studyGraphUri: 'graphUid1'
    };

    beforeEach(module('addis.controllers'));
    beforeEach(module('addis.services'));

    beforeEach(inject(function($controller, $q, $rootScope) {

      q = $q;
      scope = $rootScope;
      scope.$parent = {};

      // set the mock state params
      mockStateParams.projectId = 1;
      mockStateParams.analysisId = 2;

      // set a mockNameSpace for the current project
      scope.project = mockProject;

      // set some mock outcomes anU interventions
      scope.analysis = {
        selectedOutcomes: [],
        interventionInclusions: [],
        studyGraphUri: 'graphuid2'
      };
      scope.analysis.selectedOutcomes = [{
        a: 'a'
      }, {
        b: 'b'
      }];
      scope.analysis.interventionInclusions = [{
        c: 'c'
      }, {
        d: 'd'
      }];

      // set a mock result value for the service call
      singleStudyBenefitRiskAnalysisService.concatWithNoDuplicates.and.returnValue(mockOutcomes);
      singleStudyBenefitRiskAnalysisService.addMissingOutcomesToStudies.and.returnValue(mockStudies);
      singleStudyBenefitRiskAnalysisService.addMissingInterventionsToStudies.and.returnValue(mockStudies);
      singleStudyBenefitRiskAnalysisService.addHasMatchedMixedTreatmentArm.and.returnValue(mockStudies);
      singleStudyBenefitRiskAnalysisService.addOverlappingInterventionsToStudies.and.returnValue(mockStudies);

      outcomesDeferred = $q.defer();
      mockOutcomes.$promise = outcomesDeferred.promise;
      outcomeResource.query.and.returnValue(mockOutcomes);

      interventionDeferred = $q.defer();
      mockInterventions.$promise = interventionDeferred.promise;
      interventionResource.query.and.returnValue(mockInterventions);

      studiesDeferred = $q.defer();
      mockStudies.$promise = studiesDeferred.promise;
      projectStudiesResource.query.and.returnValue(mockStudies);

      $controller('SingleStudyBenefitRiskAnalysisController', {
        $scope: scope,
        $stateParams: mockStateParams,
        $state: state,
        $window: mockWindow,
        'currentAnalysis': mockAnalysis,
        'currentProject': mockProject,
        'OutcomeResource': outcomeResource,
        'InterventionResource': interventionResource,
        'projectStudiesResource': projectStudiesResource,
        'SingleStudyBenefitRiskAnalysisService': singleStudyBenefitRiskAnalysisService,
        'DEFAULT_VIEW': 'DEFAULT_VIEW',
        'AnalysisResource': analysisResource,
        'ProjectStudiesResource': projectStudiesResource
      });
    }));

    describe('on load', function() {

      it('isValidAnalysis should reject analyses that contain fewer than two interventionInclusions and two selectedOutcomes',
        function() {
          var invalidAnalysis = {
            interventionInclusions: [],
            selectedOutcomes: []
          };
          expect(scope.isValidAnalysis(invalidAnalysis)).toBeFalsy();

          invalidAnalysis = {
            interventionInclusions: [1],
            selectedOutcomes: []
          };
          expect(scope.isValidAnalysis(invalidAnalysis)).toBeFalsy();

          invalidAnalysis = {
            interventionInclusions: [],
            selectedOutcomes: [1]
          };
          expect(scope.isValidAnalysis(invalidAnalysis)).toBeFalsy();

          invalidAnalysis = {
            interventionInclusions: [1, 2, 3],
            selectedOutcomes: []
          };
          expect(scope.isValidAnalysis(invalidAnalysis)).toBeFalsy();

          invalidAnalysis = {
            interventionInclusions: [],
            selectedOutcomes: [1, 2, 3]
          };
          expect(scope.isValidAnalysis(invalidAnalysis)).toBeFalsy();

          var validAnalysis = {
            interventionInclusions: [1, 2],
            selectedOutcomes: [1, 2]
          };
          expect(scope.isValidAnalysis(invalidAnalysis)).toBeFalsy();

          validAnalysis = {
            interventionInclusions: [1, 2, 3],
            selectedOutcomes: [1, 2, 3]
          };
          expect(scope.isValidAnalysis(invalidAnalysis)).toBeFalsy();
        });

      it('should set the outcomes to equal the already selected outcomes', function() {
        expect(scope.outcomes).toEqual(scope.analysis.selectedOutcomes);
      });

      it('should set the interventions to equal the already selected interventions', function() {
        expect(scope.interventions).toEqual(scope.analysis.interventionInclusions);
      });

      it('should query the outcomes for the current project', function() {
        expect(outcomeResource.query).toHaveBeenCalledWith({
          projectId: 1
        });
      });

      it('should query the interventions for the current project', function() {
        expect(interventionResource.query).toHaveBeenCalledWith({
          projectId: 1
        });
      });

      it('should query studies for the current project', function() {
        expect(projectStudiesResource.query).toHaveBeenCalledWith({
          projectId: 1
        });
      });
    });

    describe('when the outcome query resolves', function() {

      beforeEach(function() {
        outcomesDeferred.resolve(mockOutcomes);
        scope.$apply();
      });

      it('update the outcome list to contain the already selectedOutcomes as well as the outcome options (that have not been selected)', function() {
        expect(scope.outcomes).toBe(mockOutcomes);
      });

    });

    describe('when the interventions query resolves', function() {

      beforeEach(function() {
        interventionDeferred.resolve(mockInterventions);
        scope.$apply();
      });

      it('update the outcome list to contain the already selectedOutcomes as well as the outcome options (that have not been selected)', function() {
        expect(singleStudyBenefitRiskAnalysisService.concatWithNoDuplicates).toHaveBeenCalled();
      });

    });

    describe('when the study query resolves', function() {

      beforeEach(function() {
        studiesDeferred.resolve(mockStudies);
        scope.$apply();
      });

      it('should place the studies on the scope', function() {
        expect(scope.studies).toEqual(mockStudies);
      });

      it('should place the selected study on the studyModel', function() {
        expect(scope.studyModel.selectedStudy).toBe(mockStudies[1]);
      });
    });

    describe('when a study is selected', function() {
      it('should place the selected items uid on the analysis as the studyUid', function() {
        scope.onStudySelect({
          studyUri: 'test-uid'
        });
        expect(scope.analysis.studyGraphUri).toEqual('test-uid');
      });
    });

    describe('when outcomes, interventions and studies haven been resolved and the selected outcomes change', function() {
      beforeEach(function() {
        outcomesDeferred.resolve(mockOutcomes);
        interventionDeferred.resolve(mockInterventions);
        studiesDeferred.resolve(mockStudies);
        scope.$apply();
      });

      it('should revalidate and save the analysis', function() {
        var mockOutcome = {
          name: 'mockOutcome'
        };
        scope.analysis.selectedOutcomes.push(mockOutcome);
        scope.$apply();
        scope.dirty = true;

        expect(analysisResource.save).toHaveBeenCalled();
      });
    });

    describe('when outcomes, interventions and studies haven been resolved and the selected interventions change', function() {
      beforeEach(function() {
        outcomesDeferred.resolve(mockOutcomes);
        interventionDeferred.resolve(mockInterventions);
        studiesDeferred.resolve(mockStudies);
        scope.$apply();
      });

      it('should revalidate and save the analysis', function() {
        var mockOutcome = {
          name: 'mockOutcome'
        };
        scope.analysis.interventionInclusions.pop(mockOutcome);
        scope.$apply();
        scope.dirty = true;

        expect(singleStudyBenefitRiskAnalysisService.addOverlappingInterventionsToStudies).toHaveBeenCalled();
        expect(analysisResource.save).toHaveBeenCalled();
      });
    });

    describe('when goToOverView is called', function() {
      var defaultScenarioId = 324;
      var defaultScenario = {
        name: 'defaultScenario',
        id: defaultScenarioId
      };
      var defaultScenarioDeferred;

      beforeEach(function() {
        defaultScenarioDeferred = q.defer();
        defaultScenario.$promise = defaultScenarioDeferred.promise;
        singleStudyBenefitRiskAnalysisService.getDefaultScenario.and.returnValue(defaultScenario.$promise);
        defaultScenarioDeferred.resolve(defaultScenario);
        scope.goToDefaultScenarioView();
        scope.$apply();
      });

      it('should go to the default view using the default scenario id', function() {
        expect(singleStudyBenefitRiskAnalysisService.getDefaultScenario).toHaveBeenCalled();
        expect(state.go).toHaveBeenCalledWith('DEFAULT_VIEW', _.extend(mockStateParams, {
          id: defaultScenarioId
        }));
      });

    });

    describe('when createProblem is called', function() {
      var problem = {
        name: 'problem'
      };
      var saveDeferred;
      var problemDeferred;
      var analysisDeferred;


      beforeEach(function() {
        problemDeferred = q.defer();
        problem.$promise = problemDeferred.promise;
        analysisDeferred = q.defer();
        scope.analysis.$promise = analysisDeferred.promise;
        saveDeferred = q.defer();
        saveDeferred.$promise = saveDeferred.promise;
        singleStudyBenefitRiskAnalysisService.getProblem.and.returnValue(problem.$promise);
        analysisResource.save.and.returnValue(saveDeferred);
        problemDeferred.resolve(problem);
        analysisDeferred.resolve();
        saveDeferred.resolve(scope.analysis);
        scope.createProblem();
        scope.$apply();
      });


      it('should create the problem, save the analysis and then go to the defaultScenario view', function() {
        expect(scope.analysis.problem).toEqual(problem);
        expect(analysisResource.save).toHaveBeenCalled();
        expect(singleStudyBenefitRiskAnalysisService.getDefaultScenario).toHaveBeenCalled();
      });
    });


  });
});
