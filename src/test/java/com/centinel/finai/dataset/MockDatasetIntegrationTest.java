package com.centinel.finai.dataset;

import com.centinel.finai.dto.*;
import com.centinel.finai.entity.IngestedMessage;
import com.centinel.finai.entity.Transaction;
import com.centinel.finai.entity.User;
import com.centinel.finai.repository.IngestedMessageRepository;
import com.centinel.finai.repository.TransactionRepository;
import com.centinel.finai.repository.UserRepository;
import com.centinel.finai.service.IngestionService;
import com.centinel.finai.service.MerchantCategorizationService;
import com.centinel.finai.service.SensitiveDataMaskingService;
import com.centinel.finai.service.TransactionMessageParserService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class MockDatasetIntegrationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SensitiveDataMaskingService maskingService = new SensitiveDataMaskingService();
    private final TransactionMessageParserService parserService = new TransactionMessageParserService();
    private final MerchantCategorizationService categorizationService = new MerchantCategorizationService();

    @Mock
    private IngestedMessageRepository ingestedMessageRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private UserRepository userRepository;

    private IngestionService ingestionService;
    private JsonNode datasetRoot;

    @BeforeEach
    void setUp() throws Exception {
        ingestionService = new IngestionService(
                ingestedMessageRepository,
                transactionRepository,
                userRepository,
                maskingService,
                parserService,
                categorizationService
        );

        InputStream inputStream = getClass().getClassLoader().getResourceAsStream("mock-transaction-messages.json");
        assertThat(inputStream).isNotNull();
        datasetRoot = objectMapper.readTree(inputStream);
    }

    @Test
    @DisplayName("CEN-14: Dataset integrity and privacy compliance check")
    void datasetIntegrityAndPrivacyCompliance() {
        assertThat(datasetRoot.has("records")).isTrue();
        JsonNode records = datasetRoot.get("records");
        assertThat(records.isArray()).isTrue();
        assertThat(records.size()).isGreaterThanOrEqualTo(20);

        for (JsonNode record : records) {
            String id = record.get("id").asText();
            String userPhone = record.get("userPhone").asText();

            // Verify safe synthetic phone range (+947700000XX)
            assertThat(userPhone)
                    .withFailMessage("Record %s contains non-synthetic phone number: %s", id, userPhone)
                    .startsWith("+947700000");

            // Verify required fields exist
            assertThat(record.has("source")).isTrue();
            assertThat(record.has("externalMessageId")).isTrue();
            assertThat(record.has("rawMessage")).isTrue();
            assertThat(record.has("expected")).isTrue();

            JsonNode expected = record.get("expected");
            assertThat(expected.has("expectedStatus")).isTrue();
            assertThat(expected.has("maskedMessage")).isTrue();
        }
    }

    @Test
    @DisplayName("CEN-14: Verify sensitive data masking across all dataset records")
    void sensitiveDataMaskingAcrossAllRecords() {
        JsonNode records = datasetRoot.get("records");

        for (JsonNode record : records) {
            String id = record.get("id").asText();
            String rawMessage = record.get("rawMessage").asText();
            String expectedMasked = record.get("expected").get("maskedMessage").asText();

            String actualMasked = maskingService.maskSensitiveData(rawMessage);
            assertThat(actualMasked)
                    .withFailMessage("Masking mismatch for record %s: expected '%s' but got '%s'", id, expectedMasked, actualMasked)
                    .isEqualTo(expectedMasked);
        }
    }

    @Test
    @DisplayName("CEN-14: Verify deterministic parsing and categorization rules for valid records")
    void deterministicParsingAndCategorization() {
        JsonNode records = datasetRoot.get("records");

        for (JsonNode record : records) {
            String id = record.get("id").asText();
            JsonNode expected = record.get("expected");
            String expectedStatus = expected.get("expectedStatus").asText();

            if ("PARSE_FAILED".equals(expectedStatus)) {
                String masked = expected.get("maskedMessage").asText();
                ParsedTransactionData parsed = parserService.parseMessage(masked);
                assertThat(parsed.isSuccess())
                        .withFailMessage("Record %s was expected to fail parsing but succeeded: %s", id, parsed)
                        .isFalse();
            } else if ("RULE_CATEGORIZED".equals(expectedStatus) || "PENDING_AI".equals(expectedStatus)) {
                String masked = expected.get("maskedMessage").asText();
                ParsedTransactionData parsed = parserService.parseMessage(masked);
                assertThat(parsed.isSuccess())
                        .withFailMessage("Record %s failed parsing unexpectedly: %s", id, parsed.getFailureReason())
                        .isTrue();

                BigDecimal expectedAmount = BigDecimal.valueOf(expected.get("parsedAmount").asDouble()).setScale(2);
                assertThat(parsed.getAmount()).isEqualByComparingTo(expectedAmount);
                assertThat(parsed.getCurrency()).isEqualTo(expected.get("parsedCurrency").asText());

                if (expected.hasNonNull("parsedDirection")) {
                    assertThat(parsed.getDirection().name()).isEqualTo(expected.get("parsedDirection").asText());
                }

                CategorizationResult catResult = categorizationService.categorize(parsed.getMerchant());
                if ("RULE_CATEGORIZED".equals(expectedStatus)) {
                    assertThat(catResult.getSource()).isEqualTo(CategorizationSource.RULE_BASED);
                    assertThat(catResult.getCategory().getDisplayName()).isEqualTo(expected.get("expectedCategory").asText());
                } else {
                    assertThat(catResult.isAiRequired()).isTrue();
                }
            }
        }
    }

    @Test
    @DisplayName("CEN-14: Execute end-to-end IngestionService against all 31 dataset scenarios")
    void endToEndIngestionServiceSimulation() {
        JsonNode records = datasetRoot.get("records");
        Set<String> processedExternalIds = new HashSet<>();

        when(userRepository.findByPhoneNumber(any())).thenReturn(Optional.of(new User("Test User", "+94770000001")));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(ingestedMessageRepository.save(any(IngestedMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Mock idempotency checks dynamically based on whether ID was previously seen
        when(ingestedMessageRepository.findByExternalMessageId(anyString())).thenAnswer(invocation -> {
            String messageId = invocation.getArgument(0);
            if (processedExternalIds.contains(messageId)) {
                IngestedMessage existing = new IngestedMessage();
                existing.setExternalMessageId(messageId);
                existing.setStatus("RULE_CATEGORIZED");
                return Optional.of(existing);
            }
            return Optional.empty();
        });

        int ruleCategorizedCount = 0;
        int pendingAiCount = 0;
        int parseFailedCount = 0;
        int duplicateCount = 0;

        for (JsonNode record : records) {
            String id = record.get("id").asText();
            String source = record.get("source").asText();
            String userPhone = record.get("userPhone").asText();
            String externalMessageId = record.get("externalMessageId").asText();
            String rawMessage = record.get("rawMessage").asText();
            String expectedStatus = record.get("expected").get("expectedStatus").asText();

            TransactionMessageIngestionRequest request = new TransactionMessageIngestionRequest(
                    source,
                    externalMessageId,
                    userPhone,
                    rawMessage,
                    OffsetDateTime.now()
            );

            TransactionMessageIngestionResponse response = ingestionService.ingestMessage(request);

            assertThat(response.getStatus())
                    .withFailMessage("Scenario %s expected status %s but got %s", id, expectedStatus, response.getStatus())
                    .isEqualTo(expectedStatus);

            switch (response.getStatus()) {
                case "RULE_CATEGORIZED":
                    ruleCategorizedCount++;
                    processedExternalIds.add(externalMessageId);
                    break;
                case "PENDING_AI":
                    pendingAiCount++;
                    processedExternalIds.add(externalMessageId);
                    break;
                case "PARSE_FAILED":
                    parseFailedCount++;
                    processedExternalIds.add(externalMessageId);
                    break;
                case "DUPLICATE":
                    duplicateCount++;
                    break;
            }
        }

        // Verify distribution across all test categories
        assertThat(ruleCategorizedCount).isGreaterThanOrEqualTo(20);
        assertThat(pendingAiCount).isGreaterThanOrEqualTo(2);
        assertThat(parseFailedCount).isGreaterThanOrEqualTo(3);
        assertThat(duplicateCount).isGreaterThanOrEqualTo(1);
    }
}
