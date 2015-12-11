'use strict';
define([],
  function() {
    var dependencies = ['$q', 'StudyService'];
    var DrugService = function($q, StudyService) {


      function nodeToFrontEnd(node) {
        return {
          uri: node['@id'],
          label: node.label,
          conceptMapping: node.sameAs
        };
      }

      function queryItems() {
        return StudyService.getJsonGraph().then(function(graph) {
          var nodes = _.filter(graph, function(node) {
            return node['@type'] === 'ontology:Drug';
          });
          return _.map(nodes, nodeToFrontEnd);

        });
      }
      return {
        queryItems: queryItems
      };
    };
    return dependencies.concat(DrugService);
  });
