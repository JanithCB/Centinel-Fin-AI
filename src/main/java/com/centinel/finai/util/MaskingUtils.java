package com.centinel.finai.util;

import java.util.regex.Pattern;

public final class MaskingUtils {

    // Regex to match 13 to 19 digit credit card numbers (with or without spaces/dashes)
    private static final Pattern CARD_NUMBER_PATTERN = Pattern.compile("\\b(?:\\d[ -]*?){13,19}\\b");
    
    // Regex to match 3 or 4 digit CVV/CVC codes when labeled
    private static final Pattern CVV_PATTERN = Pattern.compile("(?i)\\b(cvv|cvc|security code)[:\\s]*(\\d{3,4})\\b");

    // Regex to match standard 4-digit card endings (e.g., "card ending 1234" -> "card ending ****")
    private static final Pattern CARD_ENDING_PATTERN = Pattern.compile("(?i)(card(?:\\s+ending|\\s+ending\\s+in|\\s+no\\.?|\\s*\\*+)?\\s*)(\\d{4})");

    private MaskingUtils() {
    }

    /**
     * Masks sensitive card numbers and account identifiers in arbitrary transaction texts.
     *
     * @param text raw message string
     * @return sanitized string with sensitive details masked
     */
    public static String maskSensitiveData(String text) {
        if (text == null || text.isEmpty()) {
            return text;
        }

        // Mask full card numbers leaving only last 4 digits
        String masked = CARD_NUMBER_PATTERN.matcher(text).replaceAll(matchResult -> {
            String digits = matchResult.group().replaceAll("[^0-9]", "");
            if (digits.length() < 4) {
                return "****";
            }
            return "****" + digits.substring(digits.length() - 4);
        });

        // Mask CVV / security codes
        masked = CVV_PATTERN.matcher(masked).replaceAll("$1: ***");

        return masked;
    }

    /**
     * Generates a truncated and masked summary of a raw message suitable for log outputs.
     *
     * @param text raw message string
     * @param maxLength maximum characters to include in the preview
     * @return safe, masked preview string
     */
    public static String getSafePreview(String text, int maxLength) {
        if (text == null) {
            return "null";
        }
        String masked = maskSensitiveData(text);
        if (masked.length() <= maxLength) {
            return masked;
        }
        return masked.substring(0, maxLength) + "... (truncated, length=" + masked.length() + ")";
    }
}
