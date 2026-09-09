package com.centinel.finai.service;

import com.centinel.finai.dto.TransactionMessageIngestionRequest;
import com.centinel.finai.dto.TransactionMessageIngestionResponse;
import com.centinel.finai.entity.IngestedMessage;
import com.centinel.finai.entity.Transaction;
import com.centinel.finai.entity.User;
import com.centinel.finai.repository.IngestedMessageRepository;
import com.centinel.finai.repository.TransactionRepository;
import com.centinel.finai.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class IngestionServiceTest {

    @Mock
    private IngestedMessageRepository ingestedMessageRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @Mock
    private UserRepository userRepository;

    @Spy
    private SensitiveDataMaskingService maskingService = new SensitiveDataMaskingService();

    @Spy
    private TransactionMessageParserService parserService = new TransactionMessageParserService();

    @Spy
    private MerchantCategorizationService categorizationService = new MerchantCategorizationService();

    @InjectMocks
    private IngestionService ingestionService;

    @BeforeEach
    void setUp() {
    }

    @Test
    @DisplayName("Processes valid known merchant and persists transaction as RULE_CATEGORIZED")
    void ingestMessage_whenKnownMerchant_thenStoresTransactionAsRuleCategorized() {
        TransactionMessageIngestionRequest request = new TransactionMessageIngestionRequest(
                "mock_n8n",
                "mock-msg-001",
                "+94771234567",
                "LKR 2,500.00 was spent at Keells Super using card ending 1234 on 2026-09-05.",
                OffsetDateTime.parse("2026-09-05T20:30:00+05:30")
        );

        when(ingestedMessageRepository.findByExternalMessageId("mock-msg-001")).thenReturn(Optional.empty());
        when(ingestedMessageRepository.save(any(IngestedMessage.class))).thenAnswer(i -> {
            IngestedMessage msg = i.getArgument(0);
            msg.setId(101L);
            return msg;
        });

        User user = new User("+94771234567", null);
        user.setId(1L);
        when(userRepository.findByPhoneNumber("+94771234567")).thenReturn(Optional.of(user));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> {
            Transaction tx = i.getArgument(0);
            tx.setId(201L);
            return tx;
        });

        TransactionMessageIngestionResponse response = ingestionService.ingestMessage(request);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("RULE_CATEGORIZED");
        assertThat(response.getMessageId()).isEqualTo(101L);
        assertThat(response.getMessage()).contains("Groceries");

        ArgumentCaptor<Transaction> txCaptor = ArgumentCaptor.forClass(Transaction.class);
        verify(transactionRepository, times(1)).save(txCaptor.capture());
        Transaction savedTx = txCaptor.getValue();
        assertThat(savedTx.getMerchant()).isEqualTo("Keells Super");
        assertThat(savedTx.getCategory()).isEqualTo("Groceries");
        assertThat(savedTx.getAmount()).isEqualByComparingTo(new BigDecimal("2500.00"));
        assertThat(savedTx.getProcessingStatus()).isEqualTo("RULE_CATEGORIZED");
        assertThat(savedTx.getPendingForAi()).isFalse();
    }

    @Test
    @DisplayName("Processes valid unknown merchant and persists transaction as PENDING_AI")
    void ingestMessage_whenUnknownMerchant_thenStoresTransactionAsPendingAi() {
        TransactionMessageIngestionRequest request = new TransactionMessageIngestionRequest(
                "mock_n8n",
                "mock-msg-002",
                "+94771234567",
                "Payment of USD 50.00 completed at Unknown Mystery Boutique on 2026-09-05.",
                OffsetDateTime.parse("2026-09-05T20:30:00+05:30")
        );

        when(ingestedMessageRepository.findByExternalMessageId("mock-msg-002")).thenReturn(Optional.empty());
        when(ingestedMessageRepository.save(any(IngestedMessage.class))).thenAnswer(i -> {
            IngestedMessage msg = i.getArgument(0);
            msg.setId(102L);
            return msg;
        });

        User user = new User("+94771234567", null);
        when(userRepository.findByPhoneNumber("+94771234567")).thenReturn(Optional.of(user));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArgument(0));

        TransactionMessageIngestionResponse response = ingestionService.ingestMessage(request);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("PENDING_AI");

        ArgumentCaptor<Transaction> txCaptor = ArgumentCaptor.forClass(Transaction.class);
        verify(transactionRepository, times(1)).save(txCaptor.capture());
        Transaction savedTx = txCaptor.getValue();
        assertThat(savedTx.getProcessingStatus()).isEqualTo("PENDING_AI");
        assertThat(savedTx.getCategory()).isEqualTo("Uncategorized");
        assertThat(savedTx.getPendingForAi()).isTrue();
    }

    @Test
    @DisplayName("Handles malformed message without crashing, saving PARSE_FAILED")
    void ingestMessage_whenMalformedMessage_thenSavesParseFailedAndDoesNotCreateTransaction() {
        TransactionMessageIngestionRequest request = new TransactionMessageIngestionRequest(
                "mock_n8n",
                "mock-msg-003",
                "+94771234567",
                "Hello, thanks for your order!",
                OffsetDateTime.parse("2026-09-05T20:30:00+05:30")
        );

        when(ingestedMessageRepository.findByExternalMessageId("mock-msg-003")).thenReturn(Optional.empty());
        when(ingestedMessageRepository.save(any(IngestedMessage.class))).thenAnswer(i -> {
            IngestedMessage msg = i.getArgument(0);
            msg.setId(103L);
            return msg;
        });

        TransactionMessageIngestionResponse response = ingestionService.ingestMessage(request);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("PARSE_FAILED");
        assertThat(response.getMessage()).contains("failed");

        verify(transactionRepository, never()).save(any(Transaction.class));
    }

    @Test
    @DisplayName("Detects duplicate externalMessageId and returns DUPLICATE response")
    void ingestMessage_whenDuplicateMessage_thenIgnoresAndReturnsDuplicate() {
        TransactionMessageIngestionRequest request = new TransactionMessageIngestionRequest(
                "mock_n8n",
                "mock-msg-001",
                "+94771234567",
                "LKR 2,500.00 spent at Keells Super",
                OffsetDateTime.parse("2026-09-05T20:30:00+05:30")
        );

        IngestedMessage existing = new IngestedMessage(
                "mock_n8n",
                "mock-msg-001",
                "+94771234567",
                "Old message text",
                OffsetDateTime.parse("2026-09-05T20:30:00+05:30")
        );
        existing.setId(55L);

        when(ingestedMessageRepository.findByExternalMessageId("mock-msg-001")).thenReturn(Optional.of(existing));

        TransactionMessageIngestionResponse response = ingestionService.ingestMessage(request);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("DUPLICATE");
        assertThat(response.getMessageId()).isEqualTo(55L);
        assertThat(response.getExternalMessageId()).isEqualTo("mock-msg-001");
        assertThat(response.getMessage()).contains("Duplicate");

        verify(ingestedMessageRepository, never()).save(any(IngestedMessage.class));
        verify(transactionRepository, never()).save(any(Transaction.class));
    }
}
