package com.centinel.finai.dto;

/**
 * Encapsulates the output of merchant categorization, indicating whether
 * a definitive category was determined via rules or if AI fallback is required.
 */
public class CategorizationResult {

    private final Category category;
    private final String categoryName;
    private final CategorizationSource source;
    private final boolean aiRequired;
    private final String matchedRule;

    public CategorizationResult(
            Category category,
            String categoryName,
            CategorizationSource source,
            boolean aiRequired,
            String matchedRule) {
        this.category = category;
        this.categoryName = categoryName;
        this.source = source;
        this.aiRequired = aiRequired;
        this.matchedRule = matchedRule;
    }

    public static CategorizationResult ruleBased(Category category, String matchedRule) {
        return new CategorizationResult(
                category,
                category != null ? category.getDisplayName() : "Uncategorized",
                CategorizationSource.RULE_BASED,
                false,
                matchedRule
        );
    }

    public static CategorizationResult aiRequired(String reason) {
        return new CategorizationResult(
                null,
                null,
                CategorizationSource.UNCATEGORIZED,
                true,
                reason
        );
    }

    public Category getCategory() {
        return category;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public CategorizationSource getSource() {
        return source;
    }

    public boolean isAiRequired() {
        return aiRequired;
    }

    public String getMatchedRule() {
        return matchedRule;
    }

    public boolean isCategorized() {
        return category != null && !aiRequired;
    }

    @Override
    public String toString() {
        return "CategorizationResult{" +
                "category=" + category +
                ", categoryName='" + categoryName + '\'' +
                ", source=" + source +
                ", aiRequired=" + aiRequired +
                ", matchedRule='" + matchedRule + '\'' +
                '}';
    }
}
