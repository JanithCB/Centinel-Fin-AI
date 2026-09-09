package com.centinel.finai.service;

import com.centinel.finai.dto.CategorizationResult;
import com.centinel.finai.dto.CategorizationSource;
import com.centinel.finai.dto.Category;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

public class MerchantCategorizationServiceTest {

    private MerchantCategorizationService categorizationService;

    @BeforeEach
    void setUp() {
        categorizationService = new MerchantCategorizationService();
    }

    @Test
    @DisplayName("Categorizes Keells Super as Groceries with RULE_BASED source")
    void categorize_whenKeellsSuper_thenReturnsGroceriesRuleBased() {
        CategorizationResult result = categorizationService.categorize("Keells Super");

        assertThat(result.isCategorized()).isTrue();
        assertThat(result.isAiRequired()).isFalse();
        assertThat(result.getCategory()).isEqualTo(Category.GROCERIES);
        assertThat(result.getCategoryName()).isEqualTo("Groceries");
        assertThat(result.getSource()).isEqualTo(CategorizationSource.RULE_BASED);
    }

    @Test
    @DisplayName("Categorizes Uber as Transport with RULE_BASED source")
    void categorize_whenUber_thenReturnsTransportRuleBased() {
        CategorizationResult result = categorizationService.categorize("Uber");

        assertThat(result.isCategorized()).isTrue();
        assertThat(result.isAiRequired()).isFalse();
        assertThat(result.getCategory()).isEqualTo(Category.TRANSPORT);
        assertThat(result.getCategoryName()).isEqualTo("Transport");
        assertThat(result.getSource()).isEqualTo(CategorizationSource.RULE_BASED);
    }

    @ParameterizedTest(name = "Case test: \"{0}\" -> Transport")
    @ValueSource(strings = {"UBER", "uber", "Uber", "uBeR", "UBER TRIP", "Uber BV"})
    void categorize_whenCaseDifferencesForUber_thenReturnsTransport(String input) {
        CategorizationResult result = categorizationService.categorize(input);

        assertThat(result.isCategorized()).isTrue();
        assertThat(result.getCategory()).isEqualTo(Category.TRANSPORT);
        assertThat(result.getSource()).isEqualTo(CategorizationSource.RULE_BASED);
    }

    @ParameterizedTest(name = "Case test: \"{0}\" -> Groceries")
    @ValueSource(strings = {"KEELLS", "keells", "Keells", "Keells Super", "KEELLS SUPER"})
    void categorize_whenCaseDifferencesForKeells_thenReturnsGroceries(String input) {
        CategorizationResult result = categorizationService.categorize(input);

        assertThat(result.isCategorized()).isTrue();
        assertThat(result.getCategory()).isEqualTo(Category.GROCERIES);
        assertThat(result.getSource()).isEqualTo(CategorizationSource.RULE_BASED);
    }

    @ParameterizedTest(name = "Merchant: \"{0}\" -> Category: {1}")
    @CsvSource(value = {
            "Cargills Food City|Groceries",
            "Glomark|Groceries",
            "Whole Foods Market|Groceries",
            "PickMe|Transport",
            "PickMe Food|Transport",
            "Delta Air Lines|Transport",
            "Dialog Axiata|Bills and Utilities",
            "Mobitel|Bills and Utilities",
            "CEB Electricity|Bills and Utilities",
            "Netflix|Subscriptions",
            "Spotify|Subscriptions",
            "Starbucks Coffee|Food and Dining",
            "McDonald's|Food and Dining",
            "Domino's Pizza|Food and Dining",
            "Amazon|Shopping",
            "Daraz|Shopping",
            "Asiri Hospital|Healthcare",
            "PVR Cinema|Entertainment",
            "Coursera|Education"
    }, delimiter = '|')
    void categorize_whenStarterMerchantRules_thenCategorizesAccurately(String merchant, String expectedCategory) {
        CategorizationResult result = categorizationService.categorize(merchant);

        assertThat(result.isCategorized()).isTrue();
        assertThat(result.isAiRequired()).isFalse();
        assertThat(result.getCategoryName()).isEqualTo(expectedCategory);
        assertThat(result.getSource()).isEqualTo(CategorizationSource.RULE_BASED);
    }

    @Test
    @DisplayName("Flags unknown merchant as AI required without final category")
    void categorize_whenUnknownMerchant_thenRequiresAi() {
        CategorizationResult result = categorizationService.categorize("Mysterious Boutique X99");

        assertThat(result.isCategorized()).isFalse();
        assertThat(result.isAiRequired()).isTrue();
        assertThat(result.getCategory()).isNull();
        assertThat(result.getCategoryName()).isNull();
        assertThat(result.getSource()).isEqualTo(CategorizationSource.UNCATEGORIZED);
        assertThat(result.getMatchedRule()).contains("Unknown merchant");
    }

    @Test
    @DisplayName("Flags null or empty merchant as AI required")
    void categorize_whenNullOrEmpty_thenRequiresAi() {
        CategorizationResult nullResult = categorizationService.categorize(null);
        assertThat(nullResult.isAiRequired()).isTrue();
        assertThat(nullResult.isCategorized()).isFalse();

        CategorizationResult emptyResult = categorizationService.categorize("   ");
        assertThat(emptyResult.isAiRequired()).isTrue();
        assertThat(emptyResult.isCategorized()).isFalse();
    }
}
