'use strict';
define(['lodash', 'angular'], function(_, angular) {
  var dependencies = ['AnalysisService'];

  var NetworkMetaAnalysisService = function(AnalysisService) {

    function findInterventionOptionForDrug(drugInstanceUid, interventionOptions) {
      return _.find(interventionOptions, function(intervention) {
        return intervention.semanticInterventionUri === drugInstanceUid;
      });
    }

    function sortTableByStudyAndIntervention(table) {
      // sort table by studies and interventions
      var tableRowComparator = function(left, right) {
        if (left.study > right.study) {
          return 1;
        } else if (left.study < right.study) {
          return -1;
        }
        //studies equal then order by intervention, placing unmapped interventions last
        if (left.intervention === 'unmatched') {
          return 1;
        }
        if (right.intervention === 'unmatched') {
          return -1;
        }
        if (left.intervention > right.intervention) {
          return 1;
        } else if (left.intervention < right.intervention) {
          return -1;
        }
        return 0;
      };

      table.sort(tableRowComparator);
      return table;
    }

    // add information to render the table
    function addRenderingHintsToTable(table) {
      var currentStudy = 'null',
        currentInterventionRow = {
          intervention: null
        },
        row;

      for (var i = 0; i < table.length; i++) {
        row = table[i];
        if (row.intervention !== currentInterventionRow.intervention || row.intervention === 'unmatched') {
          row.firstInterventionRow = true;
          currentInterventionRow = row;
          currentInterventionRow.interventionRowSpan = 0;
        }

        if (row.study !== currentStudy) {
          row.firstStudyRow = true;
          row.firstInterventionRow = true;
          currentStudy = row.study;
          currentInterventionRow = row;
          currentInterventionRow.interventionRowSpan = 0;
        }

        ++currentInterventionRow.interventionRowSpan;

        table[i] = row;
      }

      return table;
    }

    function buildExcludedArmsMap(excludedArms) {
      return _.reduce(excludedArms, function(exclusions, excludedArm) {
        exclusions[excludedArm.trialverseUid] = true;
        return exclusions;
      }, {});
    }

    function buildTableFromTrialData(data, interventions, excludedArms, covariates, treatmentOverlapMap) {
      var rows = [];
      if (interventions.length < 1) {
        return rows;
      }
      var exclusionMap = buildExcludedArmsMap(excludedArms);
      angular.forEach(data.trialDataStudies, function(study) {
        var studyRows = [];
        angular.forEach(study.trialDataArms, function(trialDataArm) {
          var row = {};
          row.covariatesColumns = [];

          row.study = study.name;
          row.studyUid = study.studyUid;
          row.studyRowSpan = study.trialDataArms.length;
          angular.forEach(covariates, function(covariate) {
            if (covariate.isIncluded) {
              var covariateValue = _.find(study.covariateValues, function(covariateValue) {
                return covariateValue.covariateKey === covariate.definitionKey;
              }).value;
              var covariateColumn = {
                headerTitle: covariate.name,
                data: covariateValue === null ? 'NA' : covariateValue
              };
              row.covariatesColumns.push(covariateColumn);
            }
          });
          row.studyRows = studyRows;
          row.drugInstanceUid = trialDataArm.drugInstanceUid;
          row.drugConceptUid = trialDataArm.drugConceptUid;
          row.arm = trialDataArm.name;
          row.trialverseUid = trialDataArm.uid;
          row.included = !exclusionMap[trialDataArm.uid] && row.intervention !== 'unmatched';

          var matchedIntervention = findInterventionOptionForDrug(trialDataArm.drugConceptUid, interventions);
          if (matchedIntervention) {
            row.intervention = matchedIntervention.semanticInterventionLabel;
            var overlappingTreatments = treatmentOverlapMap[matchedIntervention.id];
            if (row.included && overlappingTreatments) {
              overlappingTreatments = [matchedIntervention].concat(overlappingTreatments);
              row.overlappingInterventionWarning = _.map(overlappingTreatments, 'name').join(', ');
            }
          } else {
            row.intervention = 'unmatched';
          }

          row.rate = trialDataArm.measurement.rate;
          row.mu = trialDataArm.measurement.mean;
          row.sigma = trialDataArm.measurement.stdDev;
          row.sampleSize = trialDataArm.measurement.sampleSize;

          rows.push(row);
          studyRows.push(row);
        });
      });
      return rows;
    }

    function isMatchedTrialDataIntervention(trialDataIntervention, study) {
      return _.find(study.trialDataArms, function(trialDataArm) {
        return trialDataIntervention.drugInstanceUid === trialDataArm.drugInstanceUid;
      });
    }

    function countMatchedInterventions(study) {
      var numberOfMatchedInterventions = 0;
      angular.forEach(study.trialDataInterventions, function(trialDataIntervention) {
        if (isMatchedTrialDataIntervention(trialDataIntervention, study)) {
          ++numberOfMatchedInterventions;
        }
      });
      return numberOfMatchedInterventions;
    }

    function filterStudiesHavingLessThanTwoMatchedInterventions(trialData) {
      return _.filter(trialData, function(study) {
        return countMatchedInterventions(study) > 1;
      });
    }

    function filterExcludedArms(trialDataStudies, excludedArms) {
      var exclusionMap = buildExcludedArmsMap(excludedArms);
      return _.map(trialDataStudies, function(study) {
        var copiedStudy = angular.copy(study);
        copiedStudy.trialDataArms = _.filter(study.trialDataArms, function(arm) {
          return !exclusionMap[arm.uid];
        });
        return copiedStudy;
      });
    }

    function sumInterventionSampleSizes(trialData, intervention) {
      var interventionSum = _.reduce(trialData, function(sum, trialDataStudy) {
        angular.forEach(trialDataStudy.trialDataArms, function(trialDataArm) {

          if (trialDataArm.drugConceptUid === intervention.semanticInterventionUri) {
            sum += trialDataArm.measurement.sampleSize;
          }
        });
        return sum;
      }, 0);
      return interventionSum;
    }

    /*  Dose-machting rules 
     **
     **  For example, in this study, in arm 1 a fixed dose of placebo is combined with a titrated dose of fluoxetine,
     **  meaning it includes the dataset drugs "Placebo" and "Fluoxetine":
     **
     **  study   arm   drug        fixedDose minDose maxDose count sampleSize
     **  StudyA  Arm1  Placebo     0.0       NA      NA      15    32
     **  StudyA  Arm1  Fluoxetine  NA        5.0     20.0    15    32
     **
     **  Dose units (columns not shown above) must match exactly, no normalization / unit conversion is done for now.
     **
     **  A combination intervention matches an arm if its members match all of the rows, has no members that do not match a row,
     **  and do not overlap in the rows they match.
     
     **  Therefore: - the simple intervention "Placebo" would not match this arm.
     **  - The complex intervention "Placebo + Fluoxetine", would match.
     **  - The complex intervention "Paroxetine + Fluoxetine + Fluoxetine" would not match.
     **
     **  The complex intervention "(Placebo + Fluoxetine) OR Fluoxetine" matches Arm1 of StudyA because one of its members,
     **  "Placebo + Fluoxetine" matches. An OR intervention matches all the rows that the most inclusive of its members matches.
     **
     **  A dose-restricted intervention matches a row as if it were a simple intervention, but in addition it checks dose constraints.
     **
     **  In the following chain, later interventions can be composed of any of the intervention types that precede it,
     **  but not any of the same type or types that follow it:
     **   (Simple interventions, Dose restricted interventions) < Combination interventions < OR interventions.
     */


    function findArmForIntervention(trialdataArms, trialDataIntervention) {
      return _.find(trialdataArms, function(trialdataArm) {
        return trialdataArm.drugInstanceUid === trialDataIntervention.drugInstanceUid;
      });
    }

    function findTrialDataInterventionForIntervention(trialDataInterventions, intervention) {
      return _.find(trialDataInterventions, function(trialDataIntervention) {
        return trialDataIntervention.drugConceptUid === intervention.semanticInterventionUri;
      });
    }

    function studyMeasuresBothInterventions(trialDataStudy, intervention1, intervention2) {
      var trialDataIntervention1 = findTrialDataInterventionForIntervention(trialDataStudy.trialDataInterventions, intervention1);
      var trialDataIntervention2 = findTrialDataInterventionForIntervention(trialDataStudy.trialDataInterventions, intervention2);
      return trialDataIntervention1 && trialDataIntervention2 &&
        findArmForIntervention(trialDataStudy.trialDataArms, trialDataIntervention1) &&
        findArmForIntervention(trialDataStudy.trialDataArms, trialDataIntervention2);
    }

    function attachStudiesForEdges(edges, trialData) {
      return _.map(edges, function(edge) {
        edge.studies = _.filter(trialData, function(trialDataStudy) {
          return studyMeasuresBothInterventions(trialDataStudy, edge.from, edge.to);
        });
        return edge;
      });
    }


    function transformTrialDataToNetwork(trialData, interventions, excludedArms) {
      var network = {
        interventions: [],
        edges: AnalysisService.generateEdges(interventions)
      };
      var validTrialData = filterExcludedArms(trialData.trialDataStudies, excludedArms);
      validTrialData = filterStudiesHavingLessThanTwoMatchedInterventions(validTrialData);

      network.interventions = _.map(interventions, function(intervention) {
        return {
          name: intervention.name,
          sampleSize: sumInterventionSampleSizes(validTrialData, intervention)
        };
      });
      network.edges = attachStudiesForEdges(network.edges, validTrialData);
      network.edges = _.filter(network.edges, function(edge) {
        return edge.studies.length > 0;
      });
      return network;
    }

    function transformTrialDataToTableRows(trialData, interventions, excludedArms, covariates, treatmentOverlapMap) {
      var tableRows = buildTableFromTrialData(trialData, interventions, excludedArms, covariates, treatmentOverlapMap);
      tableRows = sortTableByStudyAndIntervention(tableRows);
      tableRows = addRenderingHintsToTable(tableRows);
      return tableRows;
    }

    function isNetworkDisconnected(network) {
      var toVisit = [network.interventions[0]];
      var visited = [];

      function findEdgesConnectedToNode(node) {
        return _.filter(network.edges, function(edge) {
          return edge.from.name === node.name || edge.to.name === node.name;
        });
      }

      function addUnvisitedNodesToToVisitList(edge) {
        if (!_.find(visited, ['name', edge.to.name])) {
          toVisit.push(edge.to);
        } else if (!_.find(visited, ['name', edge.from.name])) {
          toVisit.push(edge.from);
        }
      }

      function areNodeSetsEqual(setA, setB) {
        var namesA = _.map(setA, 'name');
        var namesB = _.map(setB, 'name');
        return !_.difference(namesA, namesB).length;
      }

      if (!network.interventions.length) {
        return true;
      }

      while (toVisit.length) {
        var node = toVisit.pop();
        visited.push(node);
        var connectedEdges = findEdgesConnectedToNode(node);
        _.each(connectedEdges, addUnvisitedNodesToToVisitList);
      }
      return !areNodeSetsEqual(network.interventions, visited);
    }

    function changeArmExclusion(dataRow, analysis) {
      if (dataRow.included) {
        for (var i = 0; i < analysis.excludedArms.length; ++i) {
          if (analysis.excludedArms[i].trialverseUid === dataRow.trialverseUid) {
            analysis.excludedArms.splice(i, 1);
            break;
          }
        }
      } else {
        analysis.excludedArms.push({
          analysisId: analysis.id,
          trialverseUid: dataRow.trialverseUid
        });
      }
      return analysis;
    }

    function buildInterventionInclusions(interventions, analysis) {
      return _.reduce(interventions, function(accumulator, intervention) {
        if (intervention.isIncluded) {
          accumulator.push({
            analysisId: analysis.id,
            interventionId: intervention.id
          });
        }
        return accumulator;
      }, []);
    }

    function isArmIncluded(analysis, trialDataArm) {
      return !_.find(analysis.excludedArms, function(exclusion) {
        return exclusion.trialverseUid === trialDataArm.uid;
      });
    }

    function findMatchedArmsForIntervention(analysis, trialDataArms, includedInterventionUri) {
      return _.filter(trialDataArms, function(trialDataArm) {
        return trialDataArm.drugConceptUid === includedInterventionUri && isArmIncluded(analysis, trialDataArm);
      });
    }

    function doesModelHaveAmbiguousArms(trialverseData, interventions, analysis) {
      var includedInterventionUris = _.reduce(interventions, function(mem, intervention) {
        if (intervention.isIncluded) {
          mem = mem.concat(intervention.semanticInterventionUri);
        }
        return mem;
      }, []);

      function doesStudyHaveAmbiguousArms(trialDataStudy, includedInterventionUris) {
        return _.find(includedInterventionUris, function(includedInterventionUri) {
          var matchedInterventionsForInclusion = findMatchedArmsForIntervention(analysis, trialDataStudy.trialDataArms, includedInterventionUri);
          return matchedInterventionsForInclusion.length > 1;
        });
      }

      return _.find(trialverseData.trialDataStudies, function(trialDataStudy) {
        return doesStudyHaveAmbiguousArms(trialDataStudy, includedInterventionUris);
      });
    }

    function doesInterventionHaveAmbiguousArms(drugConceptUid, studyUid, trialverseData, analysis) {
      function isArmIncluded(trialDataArm) {
        return !_.find(analysis.excludedArms, function(exclusion) {
          return exclusion.trialverseUid === trialDataArm.uid;
        });
      }
      var containingStudy = _.find(trialverseData.trialDataStudies, function(trialDataStudy) {
        return trialDataStudy.studyUid === studyUid;
      });
      var includedArmsForDrugUid = _.filter(containingStudy.trialDataArms, function(trialDataArm) {
        return trialDataArm.drugConceptUid === drugConceptUid && isArmIncluded(trialDataArm);
      });

      return includedArmsForDrugUid.length > 1;
    }

    function addInclusionsToInterventions(interventions, inclusions) {
      var inclusionMap = _.fromPairs(_.map(inclusions, function(inclusion) {
        return [inclusion.interventionId, true];
      }));

      return interventions.map(function(intervention) {
        intervention.isIncluded = inclusionMap[intervention.id];
        return intervention;
      });
    }

    function addInclusionsToCovariates(covariates, inclusions) {
      var inclusionMap = _.fromPairs(_.map(inclusions, function(inclusion) {
        return [inclusion.covariateId, true];
      }));

      return covariates.map(function(covariate) {
        covariate.isIncluded = inclusionMap[covariate.id];
        return covariate;
      });
    }


    function cleanUpExcludedArms(intervention, analysis, trialverseData) {

      var armsMatchingIntervention = {};

      angular.forEach(trialverseData.trialDataStudies, function(trialDataStudy) {
        var drugUidForInterventionInStudy;

        angular.forEach(trialDataStudy.trialDataInterventions, function(trialDataIntervention) {
          if (trialDataIntervention.drugConceptUid === intervention.semanticInterventionUri) {
            drugUidForInterventionInStudy = trialDataIntervention.drugConceptUid;
          }
        });

        if (drugUidForInterventionInStudy) {
          angular.forEach(trialDataStudy.trialDataArms, function(trialDataArm) {
            if (trialDataArm.drugConceptUid === drugUidForInterventionInStudy) {
              armsMatchingIntervention[trialDataArm.id] = true;
            }
          });
        }
      });

      return _.filter(analysis.excludedArms, function(excludedArm) {
        return !armsMatchingIntervention[excludedArm.trialverseUid];
      });

    }

    function changeCovariateInclusion(covariate, analysis) {
      var includedCovariates = analysis.includedCovariates;
      var updatedList = angular.copy(includedCovariates);
      if (covariate.isIncluded) {
        updatedList.push({
          analysisId: analysis.id,
          covariateId: covariate.id
        });
      } else {
        _.remove(updatedList, function(includedCovariate) {
          return includedCovariate.covariateId === covariate.id;
        });
      }
      return updatedList;
    }

    function findOverlappingTreatments(thisIntervention, interventions) {
      return interventions.reduce(function(overlapping, otherIntervention) {
        if (thisIntervention.id !== otherIntervention.id &&
          thisIntervention.semanticInterventionUri === otherIntervention.semanticInterventionUri) {
          overlapping.push(otherIntervention);
        }
        return overlapping;
      }, []);
    }

    function getIncludedInterventions(interventions) {
      return _.filter(interventions, function(intervention) {
        return intervention.isIncluded;
      });
    }

    function hasMoreThanOneIncludedIntervention(study, includedInterventions) {
      var numberOfIncludedInterventions = study.trialDataArms.reduce(function(count, arm) {
        var intervention = findInterventionOptionForDrug(arm.drugConceptUid, includedInterventions);
        if (intervention && intervention.isIncluded) {
          ++count;
        }
        return count;
      }, 0);

      return numberOfIncludedInterventions > 1;
    }

    function buildOverlappingTreatmentMap(analysis, interventions, trialData) {
      var includedInterventions = getIncludedInterventions(interventions);
      var overlappingTreatmentsMap = includedInterventions.reduce(function(accum, intervention) {
        var overlapping = findOverlappingTreatments(intervention, includedInterventions);
        if (overlapping.length > 0) {
          accum[intervention.id] = overlapping;
        }
        return accum;
      }, {});

      return _.reduce(overlappingTreatmentsMap, function(accum, overlapEntry, key) {
        var intervention = includedInterventions.find(function(intervention) {
          return intervention.id === parseInt(key);
        });

        var hasOverlap = _.find(trialData.trialDataStudies, function(study) {

          var includedArms = _.filter(study.trialDataArms, function(arm) {
            return !_.find(analysis.excludedArms, function(exclusion) {
              return exclusion.trialverseUid === arm.uid;
            });
          });

          var hasIncludedArmWithOverlap = _.find(includedArms, function(arm) {
            return intervention.semanticInterventionUri === arm.drugConceptUid;
          });

          var moreThanOneIncludedIntervention = hasMoreThanOneIncludedIntervention(study, includedInterventions);

          return moreThanOneIncludedIntervention && hasIncludedArmWithOverlap;
        });
        if (hasOverlap) {
          accum[intervention.id] = overlapEntry;
        }
        return accum;
      }, {});
    }


    return {
      transformTrialDataToNetwork: transformTrialDataToNetwork,
      transformTrialDataToTableRows: transformTrialDataToTableRows,
      isNetworkDisconnected: isNetworkDisconnected,
      addInclusionsToInterventions: addInclusionsToInterventions,
      addInclusionsToCovariates: addInclusionsToCovariates,
      changeArmExclusion: changeArmExclusion,
      buildInterventionInclusions: buildInterventionInclusions,
      doesInterventionHaveAmbiguousArms: doesInterventionHaveAmbiguousArms,
      doesModelHaveAmbiguousArms: doesModelHaveAmbiguousArms,
      cleanUpExcludedArms: cleanUpExcludedArms,
      changeCovariateInclusion: changeCovariateInclusion,
      buildOverlappingTreatmentMap: buildOverlappingTreatmentMap
    };
  };
  return dependencies.concat(NetworkMetaAnalysisService);
});
