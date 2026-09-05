package com.centinel.finai.service;

import com.centinel.finai.dto.TransactionMessageIngestionRequest;
import com.centinel.finai.dto.TransactionMessageIngestionResponse;
import com.centinel.finai.entity.IngestedMessage;
import com.centinel.finai.repository.IngestedMessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class IngestionServiceTest {

    @Mock
    private IngestedMessageRepository ingestedMessageRepository;

    @InjectMocks
    private IngestionService ingestionService;

    private TransactionMessageIngestionRequest request;

    @BeforeEach
    void setUp() {
        request = new TransactionMessageIngestionRequest(
                "mock_n8n",
                "mock-msg-001",
                "demo-user-001",
                "LKR 2,500.00 was spent at Keells Super using card ending 1234 on 2026-09-05.",
                OffsetDateTime.parse("2026-09-05T20:30:00+05:30")
        );
    }

    @Test
    void ingestMessage_whenNewMessage_thenSavesAndReturnsAccepted() {
        when(ingestedMessageRepository.findByExternalMessageId("mock-msg-001")).thenReturn(Optional.empty());
        when(ingestedMessageRepository.save(any(IngestedMessage.class))).thenAnswer(invocation -> {
            IngestedMessage msg = invocation.getArgument(0);
            msg.setId(101L);
            return msg;
        });

        TransactionMessageIngestionResponse response = ingestionService.ingestMessage(request);

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo("ACCEPTED");
        assertThat(response.getMessageId()).isEqualTo(101L);
        assertThat(response.getExternalMessageId()).isEqualTo("mock-msg-001");
        assertThat(response.getMessage()).contains("accepted");

        ArgumentCaptor<IngestedMessage> captor = ArgumentCaptor.forClass(IngestedMessage.class);
        verify(ingestedMessageRepository, times(1)).save(captor.capture());
        IngestedMessage captured = captor.getValue();
        assertThat(captured.getSource()).isEqualTo("mock_n8n");
        assertThat(captured.getExternalMessageId()).isEqualTo("mock-msg-001");
        assertThat(captured.getUserReference()).isEqualTo("demo-user-001");
        assertThat(captured.getStatus()).isEqualTo("PENDING");
    }

    @Test
    void ingestMessage_whenDuplicateMessage_thenIgnoresAndReturnsDuplicate() {
        IngestedMessage existing = new IngestedMessage(
                "mock_n8n",
                "mock-msg-001",
                "demo-user-001",
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
    }
}
