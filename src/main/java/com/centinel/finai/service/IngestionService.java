package com.centinel.finai.service;

import com.centinel.finai.dto.*;
import com.centinel.finai.entity.IngestedMessage;
import com.centinel.finai.entity.Transaction;
import com.centinel.finai.entity.User;
import com.centinel.finai.repository.IngestedMessageRepository;
import com.centinel.finai.repository.TransactionRepository;
import com.centinel.finai.repository.UserRepository;
import com.centinel.finai.util.MaskingUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Service coordinating the end-to-end ingestion lifecycle:
 * Webhook Ingestion -> Deduplication -> Masking -> Parsing -> Categorization -> Persistence.
 */
@Service
public class IngestionService {

    private static final Logger logger = LoggerFactory.getLogger(IngestionService.class);

    private final IngestedMessageRepository ingestedMessageRepository;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final SensitiveDataMaskingService maskingService;
    private final TransactionMessageParserService parserService;
    private final MerchantCategorizationService categorizationService;

    public IngestionService(
            IngestedMessageRepository ingestedMessageRepository,
            TransactionRepository transactionRepository,
            UserRepository userRepository,
            SensitiveDataMaskingService maskingService,
            TransactionMessageParserService parserService,
            MerchantCategorizationService categorizationService) {
        this.ingestedMessageRepository = ingestedMessageRepository;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
        this.maskingService = maskingService;
        this.parserService = parserService;
        this.categorizationService = categorizationService;
    }

    @Transactional
    public TransactionMessageIngestionResponse ingestMessage(TransactionMessageIngestionRequest request) {
        // 1. Idempotency Check: check if externalMessageId has already been recorded
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

        // 2. Sensitive Data Masking (Privacy by Design)
        String maskedText = maskingService.maskSensitiveData(request.getMessageText());
        logger.info("Ingesting message externalMessageId={}, source={}, safePreview={}",
                request.getExternalMessageId(), request.getSource(), MaskingUtils.getSafePreview(request.getMessageText(), 40));

        // 3. Create IngestedMessage Record
        IngestedMessage ingestedMessage = new IngestedMessage(
                request.getSource(),
                request.getExternalMessageId(),
                request.getUserReference(),
                maskedText,
                request.getReceivedAt()
        );

        // 4. Message Parsing (Deterministic Rule-Based Extraction)
        ParsedTransactionData parsedData = parserService.parseMessage(maskedText);

        if (!parsedData.isSuccess()) {
            ingestedMessage.setStatus(TransactionProcessingStatus.PARSE_FAILED.name());
            IngestedMessage savedMsg = ingestedMessageRepository.save(ingestedMessage);
            logger.warn("Message parsing failed for externalMessageId={}: {}",
                    request.getExternalMessageId(), parsedData.getFailureReason());

            return TransactionMessageIngestionResponse.parseFailed(
                    savedMsg.getId(),
                    savedMsg.getExternalMessageId(),
                    "Message ingested but field parsing failed: " + parsedData.getFailureReason()
            );
        }

        // 5. Rule-Based Categorization
        CategorizationResult catResult = categorizationService.categorize(parsedData.getMerchant());

        TransactionProcessingStatus status;
        String finalCategory;
        boolean pendingForAi;

        if (catResult.isCategorized()) {
            status = TransactionProcessingStatus.RULE_CATEGORIZED;
            finalCategory = catResult.getCategoryName();
            pendingForAi = false;
        } else {
            status = TransactionProcessingStatus.PENDING_AI;
            finalCategory = "Uncategorized";
            pendingForAi = true;
        }

        ingestedMessage.setStatus(status.name());
        IngestedMessage savedMsg = ingestedMessageRepository.save(ingestedMessage);

        // 6. User Resolution & Transaction Persistence
        User user = userRepository.findByPhoneNumber(request.getUserReference())
                .orElseGet(() -> userRepository.save(new User(request.getUserReference(), null)));

        Transaction transaction = new Transaction();
        transaction.setUser(user);
        transaction.setRawMessage(maskedText);
        transaction.setAmount(parsedData.getAmount());
        transaction.setCurrency(parsedData.getCurrency());
        transaction.setMerchant(parsedData.getMerchant());
        transaction.setCategory(finalCategory);
        transaction.setTransactionDate(
                parsedData.getTransactionDate() != null
                        ? parsedData.getTransactionDate()
                        : request.getReceivedAt().toLocalDateTime()
        );
        transaction.setProcessingStatus(status.name());
        transaction.setSource(request.getSource());
        transaction.setExternalMessageId(request.getExternalMessageId());
        transaction.setPendingForAi(pendingForAi);
        transaction.setIsAiCategorized(false);

        transactionRepository.save(transaction);

        logger.info("Successfully processed and persisted transaction: merchant={}, amount={} {}, status={}",
                transaction.getMerchant(), transaction.getAmount(), transaction.getCurrency(), status);

        if (status == TransactionProcessingStatus.RULE_CATEGORIZED) {
            return TransactionMessageIngestionResponse.ruleCategorized(
                    savedMsg.getId(),
                    savedMsg.getExternalMessageId(),
                    "Transaction successfully parsed and rule-categorized as " + finalCategory
            );
        } else {
            return TransactionMessageIngestionResponse.pendingAi(
                    savedMsg.getId(),
                    savedMsg.getExternalMessageId(),
                    "Transaction parsed successfully and queued for AI categorization."
            );
        }
    }
}
