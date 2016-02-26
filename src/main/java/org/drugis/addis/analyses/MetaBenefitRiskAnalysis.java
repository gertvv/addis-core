package org.drugis.addis.analyses;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.drugis.addis.interventions.Intervention;

import javax.persistence.*;
import java.io.Serializable;
import java.util.*;

/**
 * Created by daan on 24-2-16.
 */
@Entity
@JsonIgnoreProperties(ignoreUnknown = true)
public class MetaBenefitRiskAnalysis extends AbstractAnalysis implements Serializable {
  @Id
  @SequenceGenerator(name = "analysis_sequence", sequenceName = "shared_analysis_id_seq", allocationSize = 1)
  @GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "analysis_sequence")
  private Integer id;

  private Integer projectId;

  private String title;

  @OneToMany(fetch = FetchType.EAGER, orphanRemoval = true)
  @JoinTable(name = "MetaBenefitRiskAnalysis_Alternative",
          joinColumns = {@JoinColumn(name = "analysisId", referencedColumnName = "id")},
          inverseJoinColumns = {@JoinColumn(name = "alternativeId", referencedColumnName = "id")})
  private Set<Intervention> includedAlternatives = new HashSet<>();

  @OneToMany(fetch = FetchType.EAGER, mappedBy = "metaBenefitRiskAnalysisId", cascade = CascadeType.ALL, orphanRemoval = true)
  private Set<MbrOutcomeInclusion> mbrOutcomeInclusions = new HashSet<>();

  public MetaBenefitRiskAnalysis() {
  }

  public MetaBenefitRiskAnalysis(Integer projectId, String title) {
    this.projectId = projectId;
    this.title = title;
  }

  public MetaBenefitRiskAnalysis(Integer id, Integer projectId, String title) {
    this.id = id;
    this.projectId = projectId;
    this.title = title;
  }

  public MetaBenefitRiskAnalysis(Integer id, Integer projectId, String title, Set<Intervention> includedAlternatives) {
    this.id = id;
    this.projectId = projectId;
    this.title = title;
    this.includedAlternatives = includedAlternatives;
  }

  @Override
  public Integer getProjectId() {
    return projectId;
  }

  @Override
  public Integer getId() {
    return id;
  }

  public List<Intervention> getIncludedAlternatives() {
    return Collections.unmodifiableList(new ArrayList<>(includedAlternatives));
  }

  public List<MbrOutcomeInclusion> getMbrOutcomeInclusions() {
    return Collections.unmodifiableList(new ArrayList<>(mbrOutcomeInclusions));
  }

  public String getTitle() {
    return title;
  }

  public void setIncludedAlternatives(List<Intervention> interventions) {
    this.includedAlternatives = new HashSet<>(interventions);
  }

  public void setMbrOutcomeInclusions(Set<MbrOutcomeInclusion> mbrOutcomeInclusions) {
    this.mbrOutcomeInclusions = new HashSet<>(mbrOutcomeInclusions);
  }

  @Override
  public boolean equals(Object o) {
    if (this == o) return true;
    if (o == null || getClass() != o.getClass()) return false;

    MetaBenefitRiskAnalysis that = (MetaBenefitRiskAnalysis) o;

    if (!id.equals(that.id)) return false;
    if (!projectId.equals(that.projectId)) return false;
    if (!title.equals(that.title)) return false;
    return includedAlternatives != null ? includedAlternatives.equals(that.includedAlternatives) : that.includedAlternatives == null;

  }

  @Override
  public int hashCode() {
    int result = id.hashCode();
    result = 31 * result + projectId.hashCode();
    result = 31 * result + title.hashCode();
    result = 31 * result + (includedAlternatives != null ? includedAlternatives.hashCode() : 0);
    return result;
  }

}
