package org.drugis.addis.problems.model;

/**
 * Created by connor on 15-5-14.
 */
public class TrialDataIntervention {
  private String drugUid;
  private String uri;

  private String studyUid;

  public TrialDataIntervention() {
  }

  public TrialDataIntervention(String drugInstanceUid, String drugUid, String studyUid) {
    this.drugUid = drugInstanceUid;
    this.uri = drugUid;
    this.studyUid = studyUid;
  }

  public String getDrugUid() {
    return drugUid;
  }

  public String getUri() {
    return uri;
  }

  public String getStudyUid() {
    return studyUid;
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (!(o instanceof TrialDataIntervention)) return false;

    TrialDataIntervention that = (TrialDataIntervention) o;

    if (!drugUid.equals(that.drugUid)) return false;
    if (!studyUid.equals(that.studyUid)) return false;
    if (!uri.equals(that.uri)) return false;

    return true;
  }

  @Override
  public int hashCode() {
    int result = drugUid.hashCode();
    result = 31 * result + uri.hashCode();
    result = 31 * result + studyUid.hashCode();
    return result;
  }
}
