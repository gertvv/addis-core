'use strict';
define(['angular', 'angular-mocks'], function() {
  describe('the mapping service', function() {

    var rootScope, q,
      studyServiceMock = jasmine.createSpyObj('StudyService', ['getJsonGraph', 
        'saveGraph', 'getStudy', 'save', 'saveJsonGraph']),
      mappingService,
      studyDefer,
      studyGraphDefer;

    beforeEach(function() {
      module('trialverse.mapping', function($provide) {
        $provide.value('StudyService', studyServiceMock);
      });
    });

    beforeEach(inject(function($q, $rootScope, MappingService) {
      q = $q;
      rootScope = $rootScope;
      studyGraphDefer = q.defer();
      studyDefer = q.defer();
      studyServiceMock.getJsonGraph.and.returnValue(studyGraphDefer.promise);
      studyServiceMock.getStudy.and.returnValue(studyDefer.promise);

      mappingService = MappingService;
    }));


    describe('set drug mapping where none existed', function() {

      var studyConcept = {
          uri: 'http://testuri/1'
        },
        datasetConcept = {
          '@id': 'http://testuri/2',
          '@type': 'ontology:Drug'
        };
      beforeEach(function(done) {
        studyGraphDefer.resolve([{
          '@id': 'http://testuri/1',
          '@type': 'ontology:Drug',
          'label': 'Sertraline'
        }]);
        mappingService.updateMapping(studyConcept, datasetConcept).then(done);
        rootScope.$digest();
      });

      it('should add the new mapping to the graph', function(done) {
        expect(studyServiceMock.saveJsonGraph).toHaveBeenCalledWith([{
          '@id': 'http://testuri/1',
          '@type': 'ontology:Drug',
          'label': 'Sertraline',
          'sameAs': datasetConcept['@id']
        }]);
        done();
      });
    });

    describe('set drug mapping where one existed', function() {

      var studyConcept = {
          uri: 'http://testuri/1'
        },
        datasetConcept1 = {
          '@id': 'http://testuri/dataset/1',
          '@type': 'ontology:Drug'
        },
        datasetConcept2 = {
          '@id': 'http://testuri/dataset/2',
          '@type': 'ontology:Drug'
        };

      beforeEach(function(done) {
        studyGraphDefer.resolve([{
          '@id': studyConcept.uri,
          '@type': 'ontology:Drug',
          label: 'Sertraline',
          sameAs: datasetConcept1['@id']
        }]);

        mappingService.updateMapping(studyConcept, datasetConcept2).then(function() {
          done();
        });
        rootScope.$digest();
      });

      it('should overwrite the old mapping with the new one', function(done) {
        expect(studyServiceMock.saveJsonGraph).toHaveBeenCalledWith([{
          '@id': studyConcept.uri,
          '@type': 'ontology:Drug',
          label: 'Sertraline',
          sameAs: datasetConcept2['@id']
        }]);
        done();
      });
    });

    describe('remove drug mapping', function() {

      var studyConcept = {
          uri: 'http://testuri/1',
          type: 'ontology:Drug'
        },
        datasetConcept = {
          '@id': 'http://testuri/dataset/1',
          '@type': 'ontology:Drug'
        };

      beforeEach(function(done) {
        studyGraphDefer.resolve([{
          '@id': studyConcept.uri,
          '@type': 'ontology:Drug',
          label: 'Sertraline',
          sameAs: datasetConcept['@id']
        }]);
        mappingService.removeMapping(studyConcept, datasetConcept).then(function() {
          done();
        });
        rootScope.$digest();
      });

      it('should remove the old mapping', function(done) {
        expect(studyServiceMock.saveJsonGraph).toHaveBeenCalledWith([{
          '@id': studyConcept.uri,
          '@type': 'ontology:Drug',
          label: 'Sertraline'
        }]);
        done();
      });
    });

    describe('set variable mapping where none existed', function() {
      var studyConcept = {
          uri: 'http://testuri/1'
        },
        datasetConcept = {
          '@id': 'http://testuri/2',
          '@type': 'ontology:Variable'
        };

      beforeEach(function(done) {
        studyDefer.resolve({
          '@type': 'ontology:Study',
          'has_outcome': [{
            '@id': studyConcept.uri,
            '@type': 'ontology:AdverseEvent',
            'of_variable': [{
              'label': 'Agitation'
            }]
          }]
        });
        mappingService.updateMapping(studyConcept, datasetConcept).then(done);
        rootScope.$digest();
      });

      it('should add the new variable mapping to the graph', function() {
        expect(studyServiceMock.save).toHaveBeenCalledWith({
          '@type': 'ontology:Study',
          'has_outcome': [{
            '@id': studyConcept.uri,
            '@type': 'ontology:AdverseEvent',
            'of_variable': [{
              'label': 'Agitation',
              'sameAs': datasetConcept['@id']
            }]
          }]
        });
      });
    });

    describe('set variable mapping where one existed', function() {
      var studyConcept = {
          uri: 'http://trials.drugis.org/instances/instance1'
        },
        datasetConcept1 = {
          '@id': 'http://trials.drugis.org/entities/entities1',
          '@type': 'ontology:Variable'
        },
        datasetConcept2 = {
          '@id': 'http://trials.drugis.org/entities/entities2',
          '@type': 'ontology:Variable'
        };
      beforeEach(function(done) {
        studyDefer.resolve({
          '@type': 'ontology:Study',
          'has_outcome': [{
            '@id': studyConcept.uri,
            '@type': 'ontology:AdverseEvent',
            'of_variable': [{
              'label': 'Agitation',
              sameAs: datasetConcept1['@id']
            }]
          }]
        });
        mappingService.updateMapping(studyConcept, datasetConcept2).then(done);
        rootScope.$digest();
      });

      it('should overwrite the old variable mapping to the graph', function() {
        expect(studyServiceMock.save).toHaveBeenCalledWith({
          '@type': 'ontology:Study',
          'has_outcome': [{
            '@id': studyConcept.uri,
            '@type': 'ontology:AdverseEvent',
            'of_variable': [{
              'label': 'Agitation',
              'sameAs': datasetConcept2['@id']
            }]
          }]
        });
      });
    });

    describe('remove variable mapping', function() {
      var studyConcept = {
          uri: 'http://testuri/1'
        },
        datasetConcept = {
          '@id': 'http://testuri/2',
          '@type': 'ontology:Variable'
        };

      beforeEach(function(done) {
        studyDefer.resolve({
          '@type': 'ontology:Study',
          'has_outcome': [{
            '@id': studyConcept.uri,
            '@type': 'ontology:AdverseEvent',
            'of_variable': [{
              'label': 'Agitation',
              'sameAs': datasetConcept['@id']
            }]
          }]
        });
        mappingService.removeMapping(studyConcept, datasetConcept).then(done);
        rootScope.$digest();
      });

      it('should add the new variable mapping to the graph', function() {
        expect(studyServiceMock.save).toHaveBeenCalledWith({
          '@type': 'ontology:Study',
          'has_outcome': [{
            '@id': studyConcept.uri,
            '@type': 'ontology:AdverseEvent',
            'of_variable': [{
              'label': 'Agitation'
            }]
          }]
        });
      });
    });

  });
});
