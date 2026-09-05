package com.centinel.finai.service;

import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

/**
 * Service responsible for redacting sensitive financial and personal identifiers
 * (card numbers, card endings, account numbers, CVVs, and OTPs) from transaction messages
 * before AI processing, logging, or external forwarding.
 */
@Service
public class SensitiveDataMaskingService {

    public static final String REDACTED_PLACEHOLDER = "[REDACTED]";

    // Regex for full credit card numbers (13 to 19 digits, with or without spaces/dashes)
    private static final Pattern FULL_CARD_PATTERN = Pattern.compile("\\b(?:\\d[ -]*?){13,19}\\b");

    // Regex for CVV, CVC, OTP, Security Codes, and PINs
    private static final Pattern CVV_OTP_PATTERN = Pattern.compile("(?i)\\b(cvv\\d?|cvc\\d?|security\\s+code|otp|pin)(\\s*[:\\-]?\\s*)(\\d{3,8})\\b");

    // Regex for card ending numbers (e.g., "card ending 1234", "Mastercard ending in 5678", "Visa card ending in ****1234", "card no. 1234", "card *1234")
    private static final Pattern CARD_ENDING_PATTERN = Pattern.compile(
            "(?i)\\b((?:(?:(?:credit|debit|visa|mastercard|amex)\\s+)?card|(?:visa|mastercard|amex))?(?:\\s+(?:no\\.?|number|#))?\\s*ending(?:\\s+in)?|(?:(?:credit|debit|visa|mastercard|amex)\\s+)?card(?:\\s+(?:no\\.?|number|#))?|(?:visa|mastercard|amex)(?:\\s+(?:no\\.?|number|#))?)(\\s*[:\\-]?\\s*)(?:[\\*xX\\s]*\\d{4})\\b"
    );

    // Regex for bank account numbers (e.g., "Account 001234567890", "A/C 12345678", "Acc No: 123456789", "Account ending 5678")
    private static final Pattern ACCOUNT_NUMBER_PATTERN = Pattern.compile(
            "(?i)\\b((?:account|acc(?:ount)?\\s*no\\.?|acc\\b|a/c(?:\\s*no\\.?)?|acc\\s*#)(?:\\s+ending(?:\\s+in)?)?(\\s*[:\\-]?\\s*))(?:[\\*xX\\s]*\\d{4,18})\\b"
    );

    /**
     * Masks sensitive financial identifiers in the given message text.
     *
     * @param messageText raw transaction message
     * @return redacted string where sensitive identifiers are replaced with [REDACTED]
     */
    public String maskSensitiveData(String messageText) {
        if (messageText == null || messageText.isEmpty()) {
            return messageText;
        }

        String masked = messageText;

        // 1. Mask full 13-19 digit card numbers
        masked = FULL_CARD_PATTERN.matcher(masked).replaceAll(REDACTED_PLACEHOLDER);

        // 2. Mask CVV / OTP / PIN
        masked = CVV_OTP_PATTERN.matcher(masked).replaceAll("$1$2" + REDACTED_PLACEHOLDER);

        // 3. Mask card ending patterns
        masked = CARD_ENDING_PATTERN.matcher(masked).replaceAll("$1$2" + REDACTED_PLACEHOLDER);

        // 4. Mask account numbers
        masked = ACCOUNT_NUMBER_PATTERN.matcher(masked).replaceAll("$1" + REDACTED_PLACEHOLDER);

        return masked;
    }
}
