package org.drugis.trialverse.dataset.repository.impl;

import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;
import org.apache.http.HttpResponse;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.utils.URIBuilder;
import org.drugis.trialverse.dataset.factory.HttpClientFactory;
import org.drugis.trialverse.dataset.repository.DatasetReadRepository;
import org.drugis.trialverse.security.Account;
import org.drugis.trialverse.util.WebConstants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Repository;

import javax.inject.Inject;
import java.io.IOException;
import java.io.InputStream;
import java.net.URISyntaxException;

/**
 * Created by daan on 7-11-14.
 */
@Repository
public class DatasetReadRepositoryImpl implements DatasetReadRepository {

  public final static String QUERY_AFFIX = "/current/query";

  private final static Logger logger = LoggerFactory.getLogger(DatasetReadRepositoryImpl.class);
  private final static String SINGLE_STUDY_MEASUREMENTS = loadResource("queryDatasetsConstruct.sparql");
  private final static String STUDIES_WITH_DETAILS = loadResource("queryStudiesWithDetails.sparql");
  private final static String DATASET_GRAPH = loadResource("constructDataset.sparql");

  @Inject
  private HttpClientFactory httpClientFactory;

  private static String loadResource(String filename) {
    try {
      Resource myData = new ClassPathResource(filename);
      InputStream stream = myData.getInputStream();
      String query = IOUtils.toString(stream, "UTF-8");
      if (query.isEmpty()) {

      }
      return query;
    } catch (IOException e) {
      e.printStackTrace();
    }
    return "";
  }

  private HttpResponse doQuery(String query) {
    try {
      HttpClient client = httpClientFactory.build();
      URIBuilder builder = new URIBuilder(WebConstants.TRIPLESTORE_BASE_URI + QUERY_AFFIX);
      builder.setParameter("query", query);
      builder.setParameter("output", "json");
      HttpGet request = new HttpGet(builder.build());
      request.setHeader("Accept", "application/json");
      HttpResponse response = client.execute(request);
      return response;
    } catch (URISyntaxException e) {
      logger.error(e.toString());
    } catch (ClientProtocolException e) {
      logger.error(e.toString());
    } catch (IOException e) {
      logger.error(e.toString());
    }
    return null;
  }

  @Override
  public HttpResponse queryDatasets(Account currentUserAccount) {
    String query = StringUtils.replace(SINGLE_STUDY_MEASUREMENTS, "$owner", "'" + currentUserAccount.getUsername() + "'");
    return doQuery(query);
  }

  @Override
  public HttpResponse getDataset(String datasetUUID) {
    String query = StringUtils.replace(DATASET_GRAPH, "$datasetUUID", datasetUUID);
    return doQuery(query);
  }
}
