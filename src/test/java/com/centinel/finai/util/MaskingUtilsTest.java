package com.centinel.finai.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

public class MaskingUtilsTest {

    @Test
    void maskSensitiveData_whenCardNumberPresent_thenMasksAllExceptLast4Digits() {
        String input = "Spent LKR 2500 using card 4111 2222 3333 4444 on 2026-09-05";
        String result = MaskingUtils.maskSensitiveData(input);

        assertThat(result).doesNotContain("4111");
        assertThat(result).doesNotContain("2222");
        assertThat(result).doesNotContain("3333");
        assertThat(result).contains("****4444");
    }

    @Test
    void maskSensitiveData_whenCVVPresent_thenMasksCVV() {
        String input = "Verification code CVV: 123 for transaction";
        String result = MaskingUtils.maskSensitiveData(input);

        assertThat(result).doesNotContain("123");
        assertThat(result).contains("CVV: ***");
    }

    @Test
    void getSafePreview_whenTextExceedsMaxLength_thenTruncatesAndAppendsSummary() {
        String input = "LKR 2,500.00 was spent at Keells Super using card 4111222233331234 on 2026-09-05.";
        String preview = MaskingUtils.getSafePreview(input, 20);

        assertThat(preview).hasSizeLessThan(input.length() + 30);
        assertThat(preview).contains("truncated");
        assertThat(preview).doesNotContain("411122223333");
    }

    @Test
    void getSafePreview_whenNull_thenReturnsNullString() {
        assertThat(MaskingUtils.getSafePreview(null, 10)).isEqualTo("null");
    }
}
