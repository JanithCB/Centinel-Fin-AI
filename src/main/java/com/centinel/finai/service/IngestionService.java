package com.centinel.finai.service;

import com.centinel.finai.dto.TransactionMessageIngestionRequest;
import com.centinel.finai.dto.TransactionMessageIngestionResponse;
import com.centinel.finai.entity.IngestedMessage;
import com.centinel.finai.repository.IngestedMessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class IngestionService {

    private static final Logger logger = LoggerFactory.getLogger(IngestionService.class);

    private final IngestedMessageRepository ingestedMessageRepository;

    public IngestionService(IngestedMessageRepository ingestedMessageRepository) {
        this.ingestedMessageRepository = ingestedMessageRepository;
    }

    @Transactional
    public TransactionMessageIngestionResponse ingestMessage(TransactionMessageIngestionRequest request) {
        // Idempotency check: check if externalMessageId has already been recorded
        Optional<IngestedMessage> existingMessage = ingestedMessageRepository.findByExternalMessageId(request.getExternalMessageId());

        if (existingMessage.isPresent()) {
            IngestedMessage existing = existingMessage.get();
            logger.warn("Duplicate ingestion detected: externalMessageId={}, source={}, userReference={}. Ignoring duplicate.",
                    request.getExternalMessageId(), request.getSource(), request.getUserReference());

            return TransactionMessageIngestionResponse.duplicate(
                    existing.getId(),
                    request.getExternalMessageId(),
                    "Duplicate transaction message ignored. Already ingested."
            );
        }

        // Create and persist new IngestedMessage record
        IngestedMessage ingestedMessage = new IngestedMessage(
                request.getSource(),
                request.getExternalMessageId(),
                request.getUserReference(),
                request.getMessageText(),
                request.getReceivedAt()
        );

        IngestedMessage saved = ingestedMessageRepository.save(ingestedMessage);

        logger.info("Successfully ingested transaction message: id={}, source={}, externalMessageId={}, userReference={}, textLength={}",
                saved.getId(), saved.getSource(), saved.getExternalMessageId(), saved.getUserReference(),
                saved.getMessageText() != null ? saved.getMessageText().length() : 0);

        return TransactionMessageIngestionResponse.accepted(
                saved.getId(),
                saved.getExternalMessageId(),
                "Transaction message accepted for processing."
        );
    }
}
