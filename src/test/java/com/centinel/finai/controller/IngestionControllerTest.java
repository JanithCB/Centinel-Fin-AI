package com.centinel.finai.controller;

import com.centinel.finai.entity.IngestedMessage;
import com.centinel.finai.entity.Transaction;
import com.centinel.finai.repository.IngestedMessageRepository;
import com.centinel.finai.repository.TransactionRepository;
import com.centinel.finai.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
public class IngestionControllerTest {

    private static final String API_KEY_HEADER = "X-INGESTION-API-KEY";
    private static final String VALID_TEST_API_KEY = "test-ingestion-secret-key";

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private IngestedMessageRepository ingestedMessageRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        transactionRepository.deleteAll();
        ingestedMessageRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void whenMissingApiKeyHeader_thenReturns401Unauthorized() throws Exception {
        String jsonPayload = """
                {
                    "source": "mock_n8n",
                    "externalMessageId": "mock-msg-001",
                    "userReference": "demo-user-001",
                    "messageText": "LKR 2,500.00 was spent at Keells Super",
                    "receivedAt": "2026-09-05T20:30:00+05:30"
                }
                """;

        mockMvc.perform(post("/api/v1/ingestion/transaction-messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Missing required X-INGESTION-API-KEY header."));

        assertThat(ingestedMessageRepository.findAll()).isEmpty();
    }

    @Test
    void whenInvalidApiKeyHeader_thenReturns401Unauthorized() throws Exception {
        String jsonPayload = """
                {
                    "source": "mock_n8n",
                    "externalMessageId": "mock-msg-001",
                    "userReference": "demo-user-001",
                    "messageText": "LKR 2,500.00 was spent at Keells Super",
                    "receivedAt": "2026-09-05T20:30:00+05:30"
                }
                """;

        mockMvc.perform(post("/api/v1/ingestion/transaction-messages")
                        .header(API_KEY_HEADER, "wrong-fraudulent-api-key")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Invalid X-INGESTION-API-KEY header value."));

        assertThat(ingestedMessageRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("End-to-End: Valid known merchant message stores RULE_CATEGORIZED transaction")
    void whenValidKnownMerchant_thenReturns202AndSavesRuleCategorizedTransaction() throws Exception {
        String jsonPayload = """
                {
                    "source": "mock_n8n",
                    "externalMessageId": "mock-msg-001",
                    "userReference": "+94771234567",
                    "messageText": "LKR 2,500.00 was spent at Keells Super using card ending 1234 on 2026-09-05.",
                    "receivedAt": "2026-09-05T20:30:00+05:30"
                }
                """;

        mockMvc.perform(post("/api/v1/ingestion/transaction-messages")
                        .header(API_KEY_HEADER, VALID_TEST_API_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("RULE_CATEGORIZED"))
                .andExpect(jsonPath("$.externalMessageId").value("mock-msg-001"))
                .andExpect(jsonPath("$.messageId").exists())
                .andExpect(jsonPath("$.ingestedAt").exists());

        List<IngestedMessage> messages = ingestedMessageRepository.findAll();
        assertThat(messages).hasSize(1);
        IngestedMessage saved = messages.get(0);
        assertThat(saved.getSource()).isEqualTo("mock_n8n");
        assertThat(saved.getExternalMessageId()).isEqualTo("mock-msg-001");
        assertThat(saved.getUserReference()).isEqualTo("+94771234567");
        assertThat(saved.getStatus()).isEqualTo("RULE_CATEGORIZED");

        List<Transaction> transactions = transactionRepository.findAll();
        assertThat(transactions).hasSize(1);
        Transaction tx = transactions.get(0);
        assertThat(tx.getMerchant()).isEqualTo("Keells Super");
        assertThat(tx.getCategory()).isEqualTo("Groceries");
        assertThat(tx.getAmount()).isEqualByComparingTo(new BigDecimal("2500.00"));
        assertThat(tx.getProcessingStatus()).isEqualTo("RULE_CATEGORIZED");
        assertThat(tx.getPendingForAi()).isFalse();
    }

    @Test
    @DisplayName("End-to-End: Valid unknown merchant message stores PENDING_AI transaction")
    void whenValidUnknownMerchant_thenReturns202AndSavesPendingAiTransaction() throws Exception {
        String jsonPayload = """
                {
                    "source": "mock_n8n",
                    "externalMessageId": "mock-msg-unknown",
                    "userReference": "+94771234567",
                    "messageText": "LKR 3,400.00 spent at Mysterious Boutique X99.",
                    "receivedAt": "2026-09-05T20:30:00+05:30"
                }
                """;

        mockMvc.perform(post("/api/v1/ingestion/transaction-messages")
                        .header(API_KEY_HEADER, VALID_TEST_API_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("PENDING_AI"));

        List<Transaction> transactions = transactionRepository.findAll();
        assertThat(transactions).hasSize(1);
        Transaction tx = transactions.get(0);
        assertThat(tx.getCategory()).isEqualTo("Uncategorized");
        assertThat(tx.getProcessingStatus()).isEqualTo("PENDING_AI");
        assertThat(tx.getPendingForAi()).isTrue();
    }

    @Test
    @DisplayName("End-to-End: Malformed message returns 202 with PARSE_FAILED without crashing")
    void whenMalformedMessage_thenReturns202AndSavesParseFailedWithoutTransaction() throws Exception {
        String jsonPayload = """
                {
                    "source": "mock_n8n",
                    "externalMessageId": "mock-msg-bad",
                    "userReference": "+94771234567",
                    "messageText": "Thank you for using our banking services!",
                    "receivedAt": "2026-09-05T20:30:00+05:30"
                }
                """;

        mockMvc.perform(post("/api/v1/ingestion/transaction-messages")
                        .header(API_KEY_HEADER, VALID_TEST_API_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("PARSE_FAILED"));

        assertThat(transactionRepository.findAll()).isEmpty();
        List<IngestedMessage> messages = ingestedMessageRepository.findAll();
        assertThat(messages).hasSize(1);
        assertThat(messages.get(0).getStatus()).isEqualTo("PARSE_FAILED");
    }

    @Test
    void whenMissingSource_thenReturns400BadRequest() throws Exception {
        String jsonPayload = """
                {
                    "externalMessageId": "mock-msg-002",
                    "userReference": "demo-user-001",
                    "messageText": "LKR 1,000.00 spent at Uber",
                    "receivedAt": "2026-09-05T20:30:00+05:30"
                }
                """;

        mockMvc.perform(post("/api/v1/ingestion/transaction-messages")
                        .header(API_KEY_HEADER, VALID_TEST_API_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.validationErrors.source").exists());
    }

    @Test
    void whenMissingExternalMessageId_thenReturns400BadRequest() throws Exception {
        String jsonPayload = """
                {
                    "source": "mock_n8n",
                    "userReference": "demo-user-001",
                    "messageText": "LKR 1,000.00 spent at Uber",
                    "receivedAt": "2026-09-05T20:30:00+05:30"
                }
                """;

        mockMvc.perform(post("/api/v1/ingestion/transaction-messages")
                        .header(API_KEY_HEADER, VALID_TEST_API_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.validationErrors.externalMessageId").exists());
    }

    @Test
    void whenMissingUserReference_thenReturns400BadRequest() throws Exception {
        String jsonPayload = """
                {
                    "source": "mock_n8n",
                    "externalMessageId": "mock-msg-003",
                    "messageText": "LKR 1,000.00 spent at Uber",
                    "receivedAt": "2026-09-05T20:30:00+05:30"
                }
                """;

        mockMvc.perform(post("/api/v1/ingestion/transaction-messages")
                        .header(API_KEY_HEADER, VALID_TEST_API_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.validationErrors.userReference").exists());
    }

    @Test
    void whenMissingMessageText_thenReturns400BadRequest() throws Exception {
        String jsonPayload = """
                {
                    "source": "mock_n8n",
                    "externalMessageId": "mock-msg-004",
                    "userReference": "demo-user-001",
                    "receivedAt": "2026-09-05T20:30:00+05:30"
                }
                """;

        mockMvc.perform(post("/api/v1/ingestion/transaction-messages")
                        .header(API_KEY_HEADER, VALID_TEST_API_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.validationErrors.messageText").exists());
    }

    @Test
    void whenMissingReceivedAt_thenReturns400BadRequest() throws Exception {
        String jsonPayload = """
                {
                    "source": "mock_n8n",
                    "externalMessageId": "mock-msg-005",
                    "userReference": "demo-user-001",
                    "messageText": "LKR 1,000.00 spent at Uber"
                }
                """;

        mockMvc.perform(post("/api/v1/ingestion/transaction-messages")
                        .header(API_KEY_HEADER, VALID_TEST_API_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.validationErrors.receivedAt").exists());
    }

    @Test
    @DisplayName("Duplicate submission returns 200 DUPLICATE and creates no duplicate records")
    void whenDuplicateMessageSubmitted_thenPreventsDuplicateAndReturnsStatusDuplicate() throws Exception {
        String jsonPayload = """
                {
                    "source": "mock_n8n",
                    "externalMessageId": "mock-dup-001",
                    "userReference": "+94771234567",
                    "messageText": "LKR 500.00 spent at Blue Bottle Coffee on 2026-09-05",
                    "receivedAt": "2026-09-05T20:30:00+05:30"
                }
                """;

        // First submission -> Accepted (202)
        mockMvc.perform(post("/api/v1/ingestion/transaction-messages")
                        .header(API_KEY_HEADER, VALID_TEST_API_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("RULE_CATEGORIZED"));

        // Second submission with exact same externalMessageId -> OK (200) with DUPLICATE status
        mockMvc.perform(post("/api/v1/ingestion/transaction-messages")
                        .header(API_KEY_HEADER, VALID_TEST_API_KEY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DUPLICATE"))
                .andExpect(jsonPath("$.message").value("Duplicate transaction message ignored. Already ingested."));

        // Confirm database has exactly 1 IngestedMessage and 1 Transaction entry
        assertThat(ingestedMessageRepository.findAll()).hasSize(1);
        assertThat(transactionRepository.findAll()).hasSize(1);
    }
}
