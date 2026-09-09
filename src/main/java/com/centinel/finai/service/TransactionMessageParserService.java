package com.centinel.finai.service;

import com.centinel.finai.dto.ParsedTransactionData;
import com.centinel.finai.dto.TransactionDirection;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service responsible for rule-based extraction of basic transaction details
 * (Amount, Currency, Merchant, Direction, and Date) from common transaction message formats
 * without requiring external AI.
 */
@Service
public class TransactionMessageParserService {

    private static final Logger logger = LoggerFactory.getLogger(TransactionMessageParserService.class);

    // =========================================================================
    // Amount & Currency Regex Patterns
    // =========================================================================

    // Currency prefix pattern: e.g. "LKR 2,500.00", "Rs. 1,200.00", "Rs 1200", "$45.00", "USD 50.00", "EUR 30.50"
    private static final Pattern CURRENCY_PREFIX_AMOUNT_PATTERN = Pattern.compile(
            "(?i)(?:\\b(LKR|Rs\\.?|SLR|USD|EUR|GBP|AUD|CAD|SGD|INR)|([\\$€£]))\\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{1,2})?|[0-9]+(?:\\.[0-9]{1,2})?)\\b"
    );

    // Currency suffix pattern: e.g. "2,500.00 LKR", "1200.00 Rs", "45.00 USD"
    private static final Pattern AMOUNT_CURRENCY_SUFFIX_PATTERN = Pattern.compile(
            "(?i)\\b([0-9]{1,3}(?:,[0-9]{3})*(?:\\.[0-9]{1,2})?|[0-9]+(?:\\.[0-9]{1,2})?)\\s*(?:(LKR|Rs\\.?|SLR|USD|EUR|GBP|AUD|CAD|SGD|INR)|([\\$€£]))"
    );

    // =========================================================================
    // Direction Regex Patterns
    // =========================================================================
    private static final Pattern DEBIT_PATTERN = Pattern.compile(
            "(?i)\\b(spent|debited|charged|paid|payment\\s+of|purchase|withdrawn|sent\\s+to|completed\\s+to|bill\\s+payment|outflow)\\b"
    );

    private static final Pattern CREDIT_PATTERN = Pattern.compile(
            "(?i)\\b(credited|deposited|received|refund|salary|credited\\s+with|cashback|reversal|inflow)\\b"
    );

    // =========================================================================
    // Merchant Extraction Preposition Patterns
    // =========================================================================
    private static final Pattern MERCHANT_PREPOSITION_PATTERN = Pattern.compile(
            "(?i)\\b(?:at|completed\\s+to|paid\\s+to|sent\\s+to|to|from)\\s+([A-Za-z0-9&'\\.\\- ]+)"
    );

    // Clauses to strip from the extracted merchant tail
    private static final Pattern TRAILING_NOISE_PATTERN = Pattern.compile(
            "(?i)\\s+(?:using|on|with|via|through|ref|reference|card|acc|account|avail|balance|ending|dated|at|for|lkr|rs|usd|\\$).*$"
    );

    // =========================================================================
    // Date/Time Regex Patterns
    // =========================================================================
    private static final Pattern ISO_DATE_PATTERN = Pattern.compile(
            "\\b(\\d{4}-\\d{2}-\\d{2})(?:[ T](\\d{2}:\\d{2}(?::\\d{2})?))?\\b"
    );

    private static final Pattern SLASH_DATE_PATTERN = Pattern.compile(
            "\\b(\\d{1,2})/(\\d{1,2})/(\\d{4})(?:[ T](\\d{2}:\\d{2}(?::\\d{2})?))?\\b"
    );

    private static final Pattern MONTH_DAY_PATTERN = Pattern.compile(
            "(?i)\\b(?:on\\s+)?(0?[1-9]|1[0-2])/(0?[1-9]|[12][0-9]|3[01])\\b"
    );

    // =========================================================================
    // Known Merchant Normalization Dictionary
    // =========================================================================
    private static final Map<String, String> KNOWN_MERCHANTS = new LinkedHashMap<>();

    static {
        KNOWN_MERCHANTS.put("keells super", "Keells Super");
        KNOWN_MERCHANTS.put("keells", "Keells Super");
        KNOWN_MERCHANTS.put("cargills food city", "Cargills Food City");
        KNOWN_MERCHANTS.put("cargills", "Cargills Food City");
        KNOWN_MERCHANTS.put("glomark", "Glomark");
        KNOWN_MERCHANTS.put("spar supermarket", "Spar Supermarket");
        KNOWN_MERCHANTS.put("spar", "Spar Supermarket");
        KNOWN_MERCHANTS.put("pickme food", "PickMe Food");
        KNOWN_MERCHANTS.put("pickme", "PickMe");
        KNOWN_MERCHANTS.put("uber eats", "Uber Eats");
        KNOWN_MERCHANTS.put("uber trip", "Uber");
        KNOWN_MERCHANTS.put("uber bv", "Uber");
        KNOWN_MERCHANTS.put("uber", "Uber");
        KNOWN_MERCHANTS.put("dialog axiata", "Dialog Axiata");
        KNOWN_MERCHANTS.put("dialog", "Dialog");
        KNOWN_MERCHANTS.put("mobitel", "Mobitel");
        KNOWN_MERCHANTS.put("slt", "SLT Mobitel");
        KNOWN_MERCHANTS.put("daraz", "Daraz");
        KNOWN_MERCHANTS.put("amazon", "Amazon");
        KNOWN_MERCHANTS.put("starbucks coffee", "Starbucks");
        KNOWN_MERCHANTS.put("starbucks", "Starbucks");
        KNOWN_MERCHANTS.put("blue bottle coffee", "Blue Bottle Coffee");
        KNOWN_MERCHANTS.put("blue bottle", "Blue Bottle Coffee");
        KNOWN_MERCHANTS.put("trader joe's", "Trader Joe's");
        KNOWN_MERCHANTS.put("whole foods market", "Whole Foods Market");
        KNOWN_MERCHANTS.put("whole foods", "Whole Foods Market");
        KNOWN_MERCHANTS.put("mcdonald's", "McDonald's");
        KNOWN_MERCHANTS.put("mcdonalds", "McDonald's");
        KNOWN_MERCHANTS.put("kfc", "KFC");
        KNOWN_MERCHANTS.put("domino's", "Domino's");
        KNOWN_MERCHANTS.put("dominos", "Domino's");
        KNOWN_MERCHANTS.put("netflix", "Netflix");
        KNOWN_MERCHANTS.put("spotify", "Spotify");
        KNOWN_MERCHANTS.put("apple", "Apple");
        KNOWN_MERCHANTS.put("google", "Google");
    }

    /**
     * Parses a raw transaction message into structured financial data.
     *
     * @param rawMessage the raw notification text
     * @return ParsedTransactionData indicating success or failure with extracted fields
     */
    public ParsedTransactionData parseMessage(String rawMessage) {
        if (rawMessage == null || rawMessage.trim().isEmpty()) {
            return ParsedTransactionData.failure("Raw message is empty or null", rawMessage);
        }

        String message = rawMessage.trim();

        // 1. Extract Amount and Currency
        AmountAndCurrency amountAndCurrency = extractAmountAndCurrency(message);
        if (amountAndCurrency == null || amountAndCurrency.amount == null) {
            return ParsedTransactionData.failure("Could not extract valid transaction amount", rawMessage);
        }
        if (amountAndCurrency.currency == null || amountAndCurrency.currency.isEmpty()) {
            return ParsedTransactionData.failure("Could not extract currency", rawMessage);
        }

        // 2. Extract Merchant
        String merchant = extractMerchant(message);
        if (merchant == null || merchant.trim().isEmpty()) {
            return ParsedTransactionData.failure("Could not extract merchant name", rawMessage);
        }

        // 3. Extract Direction (Debit vs Credit)
        TransactionDirection direction = extractDirection(message);

        // 4. Extract Date / Time (Optional)
        LocalDateTime transactionDate = extractDate(message);

        logger.debug("Successfully parsed message: amount={}, currency={}, merchant={}, direction={}",
                amountAndCurrency.amount, amountAndCurrency.currency, merchant, direction);

        return ParsedTransactionData.success(
                amountAndCurrency.amount,
                amountAndCurrency.currency,
                merchant,
                direction,
                transactionDate,
                rawMessage
        );
    }

    // =========================================================================
    // Helper: Extract Amount and Currency
    // =========================================================================
    private AmountAndCurrency extractAmountAndCurrency(String message) {
        // Try prefix pattern first (e.g. "LKR 2,500.00", "$45.00")
        Matcher prefixMatcher = CURRENCY_PREFIX_AMOUNT_PATTERN.matcher(message);
        if (prefixMatcher.find()) {
            String currStr = prefixMatcher.group(1) != null ? prefixMatcher.group(1) : prefixMatcher.group(2);
            String amtStr = prefixMatcher.group(3).replace(",", "");
            try {
                BigDecimal amount = new BigDecimal(amtStr);
                String normalizedCurrency = normalizeCurrency(currStr);
                return new AmountAndCurrency(amount, normalizedCurrency);
            } catch (NumberFormatException ignored) {
            }
        }

        // Try suffix pattern (e.g. "2,500.00 LKR")
        Matcher suffixMatcher = AMOUNT_CURRENCY_SUFFIX_PATTERN.matcher(message);
        if (suffixMatcher.find()) {
            String amtStr = suffixMatcher.group(1).replace(",", "");
            String currStr = suffixMatcher.group(2) != null ? suffixMatcher.group(2) : suffixMatcher.group(3);
            try {
                BigDecimal amount = new BigDecimal(amtStr);
                String normalizedCurrency = normalizeCurrency(currStr);
                return new AmountAndCurrency(amount, normalizedCurrency);
            } catch (NumberFormatException ignored) {
            }
        }

        return null;
    }

    // =========================================================================
    // Helper: Normalize Currency Symbol / Code
    // =========================================================================
    private String normalizeCurrency(String rawCurrency) {
        if (rawCurrency == null) return "USD";
        String curr = rawCurrency.toUpperCase().replace(".", "").trim();
        switch (curr) {
            case "RS":
            case "SLR":
            case "LKR":
                return "LKR";
            case "$":
            case "USD":
                return "USD";
            case "€":
            case "EUR":
                return "EUR";
            case "£":
            case "GBP":
                return "GBP";
            default:
                return curr;
        }
    }

    // =========================================================================
    // Helper: Extract Transaction Direction
    // =========================================================================
    private TransactionDirection extractDirection(String message) {
        if (CREDIT_PATTERN.matcher(message).find()) {
            return TransactionDirection.CREDIT;
        }
        if (DEBIT_PATTERN.matcher(message).find()) {
            return TransactionDirection.DEBIT;
        }
        return TransactionDirection.UNKNOWN;
    }

    // =========================================================================
    // Helper: Extract Merchant
    // =========================================================================
    private String extractMerchant(String message) {
        String lower = message.toLowerCase();

        // Check against known merchant list first (exact brand match takes precedence)
        for (Map.Entry<String, String> entry : KNOWN_MERCHANTS.entrySet()) {
            String pattern = "\\b" + Pattern.quote(entry.getKey()) + "\\b";
            if (Pattern.compile(pattern, Pattern.CASE_INSENSITIVE).matcher(lower).find()) {
                return entry.getValue();
            }
        }

        // Fallback: extract substring following preposition (at, to, from)
        Matcher prepMatcher = MERCHANT_PREPOSITION_PATTERN.matcher(message);
        if (prepMatcher.find()) {
            String rawMerchant = prepMatcher.group(1);
            // Clean trailing words like "using card...", "on 09/09...", etc.
            String cleaned = TRAILING_NOISE_PATTERN.matcher(" " + rawMerchant).replaceAll("").trim();
            // Remove trailing punctuation
            cleaned = cleaned.replaceAll("[\\.,;:\\!]+$", "").trim();

            if (!cleaned.isEmpty()) {
                // Capitalize clean merchant name
                return capitalizeWords(cleaned);
            }
        }

        return null;
    }

    // =========================================================================
    // Helper: Extract Date / Time
    // =========================================================================
    private LocalDateTime extractDate(String message) {
        try {
            // Check YYYY-MM-DD
            Matcher isoMatcher = ISO_DATE_PATTERN.matcher(message);
            if (isoMatcher.find()) {
                LocalDate date = LocalDate.parse(isoMatcher.group(1));
                LocalTime time = isoMatcher.group(2) != null ? LocalTime.parse(isoMatcher.group(2)) : LocalTime.of(0, 0);
                return LocalDateTime.of(date, time);
            }

            // Check DD/MM/YYYY or MM/DD/YYYY
            Matcher slashMatcher = SLASH_DATE_PATTERN.matcher(message);
            if (slashMatcher.find()) {
                int first = Integer.parseInt(slashMatcher.group(1));
                int second = Integer.parseInt(slashMatcher.group(2));
                int year = Integer.parseInt(slashMatcher.group(3));

                // Sri Lanka / UK standard is DD/MM/YYYY
                int day = first <= 31 ? first : second;
                int month = first <= 12 && second > 12 ? first : second;

                LocalDate date = LocalDate.of(year, month, day);
                LocalTime time = slashMatcher.group(4) != null ? LocalTime.parse(slashMatcher.group(4)) : LocalTime.of(0, 0);
                return LocalDateTime.of(date, time);
            }

            // Check MM/DD or DD/MM with current year
            Matcher monthDayMatcher = MONTH_DAY_PATTERN.matcher(message);
            if (monthDayMatcher.find()) {
                int m = Integer.parseInt(monthDayMatcher.group(1));
                int d = Integer.parseInt(monthDayMatcher.group(2));
                int year = LocalDate.now().getYear();
                return LocalDateTime.of(year, m, d, 0, 0);
            }
        } catch (Exception ignored) {
            // Fallback gracefully to null if parsing fails
        }

        return null;
    }

    private String capitalizeWords(String input) {
        if (input == null || input.isEmpty()) return input;
        String[] words = input.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (!w.isEmpty()) {
                sb.append(Character.toUpperCase(w.charAt(0)));
                if (w.length() > 1) {
                    sb.append(w.substring(1).toLowerCase());
                }
                sb.append(" ");
            }
        }
        return sb.toString().trim();
    }

    // Helper internal holder
    private static class AmountAndCurrency {
        final BigDecimal amount;
        final String currency;

        AmountAndCurrency(BigDecimal amount, String currency) {
            this.amount = amount;
            this.currency = currency;
        }
    }
}
