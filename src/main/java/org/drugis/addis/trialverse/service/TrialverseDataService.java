package org.drugis.addis.trialverse.service;

import org.drugis.addis.trialverse.model.TrialData;

/**
 * Created by connor on 9-5-14.
 */
public interface TrialverseDataService {
  TrialData getTrialData(Integer namespaceId, String outcomeUri);

  TrialData getTrialData(Integer namespaceId);
}
