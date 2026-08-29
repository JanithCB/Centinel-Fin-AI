package com.centinel.finai.dto;

import java.math.BigDecimal;
import java.util.Map;

public class SummaryResponse {
    
    private Map<String, BigDecimal> totalsPerPeriod;
    private Map<String, BigDecimal> totalsByCategory;

    public SummaryResponse() {
    }

    public SummaryResponse(Map<String, BigDecimal> totalsPerPeriod, Map<String, BigDecimal> totalsByCategory) {
        this.totalsPerPeriod = totalsPerPeriod;
        this.totalsByCategory = totalsByCategory;
    }

    public Map<String, BigDecimal> getTotalsPerPeriod() {
        return totalsPerPeriod;
    }

    public void setTotalsPerPeriod(Map<String, BigDecimal> totalsPerPeriod) {
        this.totalsPerPeriod = totalsPerPeriod;
    }

    public Map<String, BigDecimal> getTotalsByCategory() {
        return totalsByCategory;
    }

    public void setTotalsByCategory(Map<String, BigDecimal> totalsByCategory) {
        this.totalsByCategory = totalsByCategory;
    }
}
