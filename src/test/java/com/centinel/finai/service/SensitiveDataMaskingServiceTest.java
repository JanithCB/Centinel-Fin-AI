package com.centinel.finai.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

public class SensitiveDataMaskingServiceTest {

    private SensitiveDataMaskingService maskingService;

    @BeforeEach
    void setUp() {
        maskingService = new SensitiveDataMaskingService();
    }

    @ParameterizedTest
    @CsvSource(value = {
            "Visa card ending 1234 charged LKR 2,500 at Keells Super|Visa card ending [REDACTED] charged LKR 2,500 at Keells Super",
            "Mastercard ending in 5678 debited USD 45.00|Mastercard ending in [REDACTED] debited USD 45.00",
            "Card ending ****1234 was used at Uber|Card ending [REDACTED] was used at Uber",
            "Card *9988 approved at Starbucks for $15.50|Card [REDACTED] approved at Starbucks for $15.50",
            "Credit card no. 4321 charged LKR 1,500|Credit card no. [REDACTED] charged LKR 1,500",
            "Card ending in **** 7766 payment received|Card ending in [REDACTED] payment received"
    }, delimiter = '|')
    void maskSensitiveData_whenCardEndingPatterns_thenMasksDigitsWithRedacted(String input, String expected) {
        String result = maskingService.maskSensitiveData(input);
        assertThat(result).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource(value = {
            "Account 001234567890 debited by LKR 5,000|Account [REDACTED] debited by LKR 5,000",
            "A/C 12345678 credited with Rs. 10,000 at Dialog|A/C [REDACTED] credited with Rs. 10,000 at Dialog",
            "Acc No: 9876543210 debited LKR 2,000|Acc No: [REDACTED] debited LKR 2,000",
            "A/C No. 555666777 transfer successful|A/C No. [REDACTED] transfer successful",
            "Account ending in 4321 debited LKR 3,000|Account ending in [REDACTED] debited LKR 3,000"
    }, delimiter = '|')
    void maskSensitiveData_whenAccountPatterns_thenMasksAccountWithRedacted(String input, String expected) {
        String result = maskingService.maskSensitiveData(input);
        assertThat(result).isEqualTo(expected);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "Payment of LKR 5000 on card 4111 2222 3333 4444 approved",
            "Payment of LKR 5000 on card 4111-2222-3333-4444 approved",
            "Payment of LKR 5000 on card 4111222233334444 approved"
    })
    void maskSensitiveData_whenFullCardNumberPattern_thenReplacesWithRedacted(String input) {
        String result = maskingService.maskSensitiveData(input);
        assertThat(result).doesNotContain("4111");
        assertThat(result).doesNotContain("2222");
        assertThat(result).doesNotContain("3333");
        assertThat(result).doesNotContain("4444");
        assertThat(result).contains("[REDACTED]");
    }

    @ParameterizedTest
    @CsvSource(value = {
            "Verification code CVV: 123 for transaction|Verification code CVV: [REDACTED] for transaction",
            "CVC 456 entered for payment|CVC [REDACTED] entered for payment",
            "Your OTP: 123456 is valid for 5 mins|Your OTP: [REDACTED] is valid for 5 mins",
            "Security code: 9988 entered|Security code: [REDACTED] entered"
    }, delimiter = '|')
    void maskSensitiveData_whenCvvOrOtp_thenMasksWithRedacted(String input, String expected) {
        String result = maskingService.maskSensitiveData(input);
        assertThat(result).isEqualTo(expected);
    }

    @Test
    void maskSensitiveData_whenNoSensitiveIdentifiers_thenPreservesExactContent() {
        String input = "LKR 2,500.00 was spent at Keells Super on 2026-09-05.";
        String result = maskingService.maskSensitiveData(input);
        assertThat(result).isEqualTo(input);
    }

    @Test
    void maskSensitiveData_whenNullOrEmpty_thenReturnsInput() {
        assertThat(maskingService.maskSensitiveData(null)).isNull();
        assertThat(maskingService.maskSensitiveData("")).isEmpty();
    }
}
