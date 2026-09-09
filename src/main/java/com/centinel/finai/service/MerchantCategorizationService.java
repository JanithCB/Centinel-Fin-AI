package com.centinel.finai.service;

import com.centinel.finai.dto.CategorizationResult;
import com.centinel.finai.dto.Category;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Deterministic rule-based categorization service using normalized merchant matching.
 * Assigns starter categories (Groceries, Transport, Bills and Utilities, etc.)
 * and flags unknown merchants for AI fallback processing.
 */
@Service
public class MerchantCategorizationService {

    private static final Logger logger = LoggerFactory.getLogger(MerchantCategorizationService.class);

    private final Map<String, Category> exactMerchantRules = new HashMap<>();
    private final List<MerchantRule> keywordRules = new ArrayList<>();

    public MerchantCategorizationService() {
        initDefaultRules();
    }

    private void initDefaultRules() {
        // Groceries
        registerRule(Category.GROCERIES, "keells", "keells super", "cargills", "cargills food city",
                "glomark", "spar", "spar supermarket", "whole foods", "whole foods market",
                "trader joe's", "trader joes", "supermarket", "grocery");

        // Transport
        registerRule(Category.TRANSPORT, "uber", "uber trip", "uber bv", "pickme", "pick me",
                "bolt", "lyft", "taxi", "transit", "fuel", "petrol",
                "ceypetco", "ioc", "metro", "airline", "delta air lines", "emirates");

        // Food and Dining
        registerRule(Category.FOOD_AND_DINING, "uber eats", "pickme food", "starbucks", "starbucks coffee",
                "blue bottle", "blue bottle coffee", "mcdonald's", "mcdonalds", "kfc", "domino's", "dominos",
                "pizza hut", "burger king", "subway", "cafe", "restaurant", "bakery", "diner", "coffee");

        // Bills and Utilities
        registerRule(Category.BILLS_AND_UTILITIES, "dialog", "dialog axiata", "mobitel",
                "slt", "slt mobitel", "ceb", "leco", "water board", "water supply",
                "coned", "consolidated edison", "electricity", "utility", "telecom");

        // Subscriptions
        registerRule(Category.SUBSCRIPTIONS, "netflix", "spotify", "apple", "apple.com/bill",
                "google", "google play", "youtube", "disney", "prime video", "medium", "patreon");

        // Shopping
        registerRule(Category.SHOPPING, "daraz", "amazon", "zara", "ikea", "aliexpress",
                "ebay", "fashion bug", "nolimit", "clothing", "retail");

        // Healthcare
        registerRule(Category.HEALTHCARE, "asiri", "asiri hospital", "nawaloka",
                "lanka hospitals", "durdans", "pharmacy", "health", "hospital", "medical", "clinic");

        // Entertainment
        registerRule(Category.ENTERTAINMENT, "cinema", "pvr", "scope cinemas", "theatre",
                "steam", "playstation", "xbox", "nintendo");

        // Education
        registerRule(Category.EDUCATION, "coursera", "udemy", "school", "university",
                "tuition", "edx", "skillshare");

        // Sort keyword rules descending by length so most specific keywords match first
        keywordRules.sort((a, b) -> Integer.compare(b.keyword.length(), a.keyword.length()));
    }

    private void registerRule(Category category, String... merchantKeywords) {
        for (String keyword : merchantKeywords) {
            String normalized = normalize(keyword);
            exactMerchantRules.put(normalized, category);
            keywordRules.add(new MerchantRule(normalized, category));
        }
    }

    /**
     * Categorizes a merchant name deterministically.
     *
     * @param rawMerchant merchant name or string extracted from transaction
     * @return CategorizationResult indicating category & source or AI fallback required
     */
    public CategorizationResult categorize(String rawMerchant) {
        if (rawMerchant == null || rawMerchant.trim().isEmpty()) {
            return CategorizationResult.aiRequired("Merchant name is empty or null");
        }

        String normalized = normalize(rawMerchant);

        // 1. Exact normalized match
        if (exactMerchantRules.containsKey(normalized)) {
            Category cat = exactMerchantRules.get(normalized);
            logger.debug("Exact rule matched for merchant '{}' -> {}", rawMerchant, cat);
            return CategorizationResult.ruleBased(cat, normalized);
        }

        // 2. Keyword/substring containment match (longest match first)
        for (MerchantRule rule : keywordRules) {
            // Check word boundary or substring match
            if (containsWordOrPhrase(normalized, rule.keyword)) {
                logger.debug("Keyword rule matched for merchant '{}' with keyword '{}' -> {}",
                        rawMerchant, rule.keyword, rule.category);
                return CategorizationResult.ruleBased(rule.category, rule.keyword);
            }
        }

        // 3. No match -> requires AI categorization
        logger.debug("No rule found for merchant '{}'. Marking as AI required.", rawMerchant);
        return CategorizationResult.aiRequired("Unknown merchant: " + rawMerchant);
    }

    private boolean containsWordOrPhrase(String text, String keyword) {
        if (text.equals(keyword)) return true;
        // Check if keyword exists with spaces or at boundaries
        String pattern = "(?i)(^|\\s+|\\W)" + java.util.regex.Pattern.quote(keyword) + "($|\\s+|\\W)";
        return java.util.regex.Pattern.compile(pattern).matcher(text).find() || text.contains(keyword);
    }

    public String normalize(String merchant) {
        if (merchant == null) return "";
        return merchant.toLowerCase()
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static class MerchantRule {
        final String keyword;
        final Category category;

        MerchantRule(String keyword, Category category) {
            this.keyword = keyword;
            this.category = category;
        }
    }
}
