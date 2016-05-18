package org.drugis.addis.patavitask.service.impl;

import org.drugis.addis.exception.ResourceDoesNotExistException;
import org.drugis.addis.interventions.service.impl.InvalidTypeForDoseCheckException;
import org.drugis.addis.models.Model;
import org.drugis.addis.models.exceptions.InvalidModelException;
import org.drugis.addis.models.service.ModelService;
import org.drugis.addis.patavitask.PataviTaskUriHolder;
import org.drugis.addis.patavitask.repository.PataviTaskRepository;
import org.drugis.addis.patavitask.repository.UnexpectedNumberOfResultsException;
import org.drugis.addis.patavitask.service.PataviTaskService;
import org.drugis.addis.problems.model.NetworkMetaAnalysisProblem;
import org.drugis.addis.problems.model.PairwiseNetworkProblem;
import org.drugis.addis.problems.service.ProblemService;
import org.drugis.addis.trialverse.service.impl.ReadValueException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.inject.Inject;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.security.KeyManagementException;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.UnrecoverableKeyException;
import java.security.cert.CertificateException;
import java.sql.SQLException;

/**
 * Created by connor on 26-6-14.
 */
@Service
public class PataviTaskServiceImpl implements PataviTaskService {
  public final static String PATAVI_URI_BASE = System.getenv("PATAVI_URI");
  final static Logger logger = LoggerFactory.getLogger(PataviTaskServiceImpl.class);
  @Inject
  ModelService modelService;

  @Inject
  PataviTaskRepository pataviTaskRepository;

  @Inject
  ProblemService problemService;

  @Override
  public PataviTaskUriHolder getPataviTaskUriHolder(Integer projectId, Integer analysisId, Integer modelId) throws ResourceDoesNotExistException, IOException, SQLException, InvalidModelException, URISyntaxException, ReadValueException, InvalidTypeForDoseCheckException, UnrecoverableKeyException, CertificateException, NoSuchAlgorithmException, KeyStoreException, KeyManagementException, UnexpectedNumberOfResultsException {
    logger.trace("PataviTaskServiceImpl.getPataviTaskUriHolder, projectId = " + projectId + " analysisId = " + analysisId + "modelId = " + modelId);
    Model model = modelService.find(modelId);
    if(model == null) {
      throw new ResourceDoesNotExistException("Could not find model" + modelId);
    }

    URI pataviTaskUrl = model.getTaskUrl();
    if(pataviTaskUrl == null) {
      NetworkMetaAnalysisProblem problem = (NetworkMetaAnalysisProblem) problemService.getProblem(projectId, analysisId);
      if(Model.PAIRWISE_MODEL_TYPE.equals(model.getModelTypeTypeAsString())) {
        PairwiseNetworkProblem  pairwiseProblem = new PairwiseNetworkProblem(problem, model.getPairwiseDetails());
        pataviTaskUrl = pataviTaskRepository.createPataviTask(pairwiseProblem.buildProblemWithModelSettings(model));
      } else if (Model.NETWORK_MODEL_TYPE.equals(model.getModelTypeTypeAsString())
              || Model.NODE_SPLITTING_MODEL_TYPE.equals(model.getModelTypeTypeAsString())
              || Model.REGRESSION_MODEL_TYPE.equals(model.getModelTypeTypeAsString())) {
        pataviTaskUrl = pataviTaskRepository.createPataviTask(problem.buildProblemWithModelSettings(model));
      } else {
        throw new InvalidModelException("Invalid model type");
      }
      model.setTaskUrl(pataviTaskUrl);
    }

    return new PataviTaskUriHolder(pataviTaskUrl);
  }
}
