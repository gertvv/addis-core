'use strict';
define(['lodash', 'angular'], function(_, angular) {
  var dependencies = ['$scope', '$q', '$state', '$stateParams', '$window', '$location', '$modal',
    'ProjectResource',
    'TrialverseResource',
    'TrialverseStudyResource',
    'SemanticOutcomeResource',
    'OutcomeResource',
    'SemanticInterventionResource',
    'InterventionResource',
    'CovariateOptionsResource',
    'CovariateResource',
    'AnalysisResource',
    'ANALYSIS_TYPES',
    'InterventionService',
    'activeTab',
    'EvidenceTableResource',
    'NetworkMetaAnalysisService'
  ];
  var SingleProjectController = function($scope, $q, $state, $stateParams, $window, $location, $modal, ProjectResource, TrialverseResource,
    TrialverseStudyResource, SemanticOutcomeResource, OutcomeResource, SemanticInterventionResource, InterventionResource,
    CovariateOptionsResource, CovariateResource, AnalysisResource, ANALYSIS_TYPES, InterventionService, activeTab, EvidenceTableResource, NetworkMetaAnalysisService) {

    $scope.activeTab = activeTab;

    $scope.analysesLoaded = false;
    $scope.covariatesLoaded = true;
    $scope.loading = {
      loaded: false
    };
    $scope.editMode = {
      allowEditing: false
    };
    $scope.duplicateOutcomeName = {
      isDuplicate: false
    };
    $scope.duplicateInterventionName = {
      isDuplicate: false
    };
    $scope.userId = $stateParams.userUid;

    $scope.project = ProjectResource.get($stateParams);
    $scope.project.$promise.then(function() {

      $scope.loading.loaded = true;

      if ($window.config.user.id === $scope.project.owner.id) {
        $scope.editMode.allowEditing = true;
      }

      $scope.trialverse = TrialverseResource.get({
        namespaceUid: $scope.project.namespaceUid,
        version: $scope.project.datasetVersion
      });

      $scope.semanticOutcomes = SemanticOutcomeResource.query({
        namespaceUid: $scope.project.namespaceUid,
        version: $scope.project.datasetVersion
      });

      $scope.semanticInterventions = SemanticInterventionResource.query({
        namespaceUid: $scope.project.namespaceUid,
        version: $scope.project.datasetVersion
      });

      $scope.outcomes = OutcomeResource.query({
        projectId: $scope.project.id
      });

      InterventionResource.query({
        projectId: $scope.project.id
      }).$promise.then(function(interventions) {
        $scope.interventions = interventions.map(function(intervention) {
          intervention.definitionLabel = InterventionService.generateDescriptionLabel(intervention);
          return intervention;
        });
      });

      loadCovariates();

      $scope.studies = TrialverseStudyResource.query({
        namespaceUid: $scope.project.namespaceUid,
        version: $scope.project.datasetVersion
      });

      $scope.studies.$promise.then(function() {
        $scope.analyses = AnalysisResource.query({
          projectId: $scope.project.id
        }, function() {
          $scope.analysesLoaded = true;
        });
      });
    });

    function loadCovariates() {
      // we need to get the options in order to display the definition label, as only the definition key is stored on the covariate
      $q.all([CovariateOptionsResource.getProjectCovariates($stateParams).$promise,
        CovariateResource.query({
          projectId: $scope.project.id
        }).$promise
      ]).then(function(result) {
        var optionsMap = _.keyBy(result[0], 'key');
        $scope.covariates = result[1].map(function(covariate) {
          covariate.definitionLabel = optionsMap[covariate.definitionKey].label;
          return covariate;
        });
      });
    }

    $scope.goToAnalysis = function(analysis) {
      var analysisType = angular.copy(_.find(ANALYSIS_TYPES, function(type) {
        return type.label === analysis.analysisType;
      }));

      //todo if analysis is gemtc type and has a problem go to models view
      if (analysisType.label === 'Benefit-risk analysis based on meta-analyses' && analysis.finalized) {
        analysisType.stateName = 'metaBenefitRisk';
      }

      $state.go(analysisType.stateName, {
        userUid: $scope.userId,
        projectId: $scope.project.id,
        analysisId: analysis.id
      });
    };

    $scope.openAddAnalysisDialog = function() {
      $modal.open({
        templateUrl: './app/js/analysis/addAnalysis.html',
        scope: $scope,
        controller: 'AddAnalysisController'
      });
    };

    $scope.openCreateOutcomeDialog = function() {
      $modal.open({
        templateUrl: './app/js/outcome/addOutcome.html',
        scope: $scope,
        controller: 'AddOutcomeController',
        resolve: {
          callback: function() {
            return function(newOutcome) {
              $scope.outcomes.push(newOutcome);
            };
          }
        }
      });
    };

    $scope.openCreateInterventionDialog = function() {
      $modal.open({
        templateUrl: './app/js/intervention/addIntervention.html',
        scope: $scope,
        controller: 'AddInterventionController',
        resolve: {
          callback: function() {
            return function(newIntervention) {
              newIntervention.definitionLabel = InterventionService.generateDescriptionLabel(newIntervention);
              $scope.interventions.push(newIntervention);
            };
          }
        }
      });
    };

    $scope.addCovariate = function() {
      $modal.open({
        templateUrl: './app/js/covariates/addCovariate.html',
        scope: $scope,
        controller: 'AddCovariateController',
        resolve: {
          outcomes: function() {
            return $scope.outcomes;
          },
          callback: function() {
            return loadCovariates;
          }
        }
      });
    };

    $scope.setActiveTab = function(tab) {
      if (tab === $scope.activeTab) {
        return;
      }
      $scope.activeTab = tab;
      var path = $location.path();
      if (tab === 'report') {
        $location.path(path + '/report');
      } else{
        var newPath = path.substring(0, path.length - '/report'.length);
        $location.path( newPath);
      }
    };

    $scope.getNmaNetwork = function(analysis) {
      var networkDefer = $q.defer();
      networkDefer.network = 1;
      EvidenceTableResource
        .query({
          projectId: $scope.project.id,
          analysisId: analysis.id
        })
        .$promise
        .then(function(trialverseData) {
          var includedInterventions = NetworkMetaAnalysisService.getIncludedInterventions($scope.interventions);
          var network = NetworkMetaAnalysisService.transformTrialDataToNetwork(trialverseData, includedInterventions, analysis);
          networkDefer.resolve(network);
        });
      return networkDefer.promise;
    };

  };
  return dependencies.concat(SingleProjectController);
});
