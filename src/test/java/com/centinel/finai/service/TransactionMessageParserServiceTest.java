package com.centinel.finai.service;

import com.centinel.finai.dto.ParsedTransactionData;
import com.centinel.finai.dto.TransactionDirection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

public class TransactionMessageParserServiceTest {

    private TransactionMessageParserService parserService;

    @BeforeEach
    void setUp() {
        parserService = new TransactionMessageParserService();
    }

    @Test
    @DisplayName("Extracts fields from Keells Super mock format")
    void parseMessage_whenKeellsSuperMessage_thenExtractsAllFieldsCorrectly() {
        String msg = "LKR 2,500.00 was spent at Keells Super using card ending 1234.";
        ParsedTransactionData result = parserService.parseMessage(msg);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("2500.00"));
        assertThat(result.getCurrency()).isEqualTo("LKR");
        assertThat(result.getMerchant()).isEqualTo("Keells Super");
        assertThat(result.getDirection()).isEqualTo(TransactionDirection.DEBIT);
    }

    @Test
    @DisplayName("Extracts fields from Uber debit format")
    void parseMessage_whenUberDebitMessage_thenExtractsAllFieldsCorrectly() {
        String msg = "Your account was debited by Rs. 1,200.00 at Uber.";
        ParsedTransactionData result = parserService.parseMessage(msg);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("1200.00"));
        assertThat(result.getCurrency()).isEqualTo("LKR");
        assertThat(result.getMerchant()).isEqualTo("Uber");
        assertThat(result.getDirection()).isEqualTo(TransactionDirection.DEBIT);
    }

    @Test
    @DisplayName("Extracts fields from PickMe Food payment format")
    void parseMessage_whenPickMeFoodPaymentMessage_thenExtractsAllFieldsCorrectly() {
        String msg = "Payment of LKR 850.00 completed to PickMe Food.";
        ParsedTransactionData result = parserService.parseMessage(msg);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("850.00"));
        assertThat(result.getCurrency()).isEqualTo("LKR");
        assertThat(result.getMerchant()).isEqualTo("PickMe Food");
        assertThat(result.getDirection()).isEqualTo(TransactionDirection.DEBIT);
    }

    @Test
    @DisplayName("Extracts fields and detects CREDIT direction from salary deposit message")
    void parseMessage_whenSalaryDepositMessage_thenExtractsCreditAndMerchant() {
        String msg = "Salary credit of LKR 150,000.00 received from Acme Corp.";
        ParsedTransactionData result = parserService.parseMessage(msg);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("150000.00"));
        assertThat(result.getCurrency()).isEqualTo("LKR");
        assertThat(result.getMerchant()).isEqualTo("Acme Corp");
        assertThat(result.getDirection()).isEqualTo(TransactionDirection.CREDIT);
    }

    @Test
    @DisplayName("Extracts embedded ISO date when available")
    void parseMessage_whenMessageContainsIsoDate_thenExtractsDate() {
        String msg = "Refund of USD 45.50 received from Amazon on 2026-09-08.";
        ParsedTransactionData result = parserService.parseMessage(msg);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal("45.50"));
        assertThat(result.getCurrency()).isEqualTo("USD");
        assertThat(result.getMerchant()).isEqualTo("Amazon");
        assertThat(result.getDirection()).isEqualTo(TransactionDirection.CREDIT);
        assertThat(result.getTransactionDate()).isNotNull();
        assertThat(result.getTransactionDate().toLocalDate()).isEqualTo(LocalDate.of(2026, 9, 8));
    }

    @ParameterizedTest(name = "Message: \"{0}\" -> Amount: {1}, Currency: {2}, Merchant: {3}")
    @CsvSource(value = {
            "Paid $45.00 at Starbucks Coffee on card *9988|45.00|USD|Starbucks",
            "Payment of EUR 89.50 completed to Zara|89.50|EUR|Zara",
            "Cargills Food City: Charged LKR 3,450.00 for grocery purchase|3450.00|LKR|Cargills Food City",
            "Bill payment of Rs. 2,800.00 paid to Dialog Axiata on 10/26|2800.00|LKR|Dialog Axiata",
            "Subscription charge of USD 15.99 at Netflix|15.99|USD|Netflix"
    }, delimiter = '|')
    void parseMessage_whenVariousSupportedFormats_thenParsesAccurately(
            String rawMessage, String expectedAmount, String expectedCurrency, String expectedMerchant) {

        ParsedTransactionData result = parserService.parseMessage(rawMessage);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getAmount()).isEqualByComparingTo(new BigDecimal(expectedAmount));
        assertThat(result.getCurrency()).isEqualTo(expectedCurrency);
        assertThat(result.getMerchant()).isEqualTo(expectedMerchant);
    }

    @Test
    @DisplayName("Returns failure when amount cannot be parsed")
    void parseMessage_whenNoAmountPresent_thenReturnsFailureResult() {
        String msg = "Thank you for shopping at Keells Super!";
        ParsedTransactionData result = parserService.parseMessage(msg);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getFailureReason()).contains("amount");
    }

    @Test
    @DisplayName("Returns failure when merchant cannot be determined")
    void parseMessage_whenNoMerchantPresent_thenReturnsFailureResult() {
        String msg = "Your account was debited by LKR 2,500.00.";
        ParsedTransactionData result = parserService.parseMessage(msg);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getFailureReason()).contains("merchant");
    }

    @Test
    @DisplayName("Returns failure for null or empty messages")
    void parseMessage_whenNullOrEmpty_thenReturnsFailureResult() {
        ParsedTransactionData nullResult = parserService.parseMessage(null);
        assertThat(nullResult.isSuccess()).isFalse();

        ParsedTransactionData emptyResult = parserService.parseMessage("   ");
        assertThat(emptyResult.isSuccess()).isFalse();
    }
}
