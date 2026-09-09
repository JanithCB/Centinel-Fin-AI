package com.centinel.finai.service;

import com.centinel.finai.dto.CategorizationResult;
import com.centinel.finai.dto.ParsedTransactionData;
import com.centinel.finai.dto.TransactionRequest;
import com.centinel.finai.entity.Transaction;
import com.centinel.finai.entity.User;
import com.centinel.finai.repository.TransactionRepository;
import com.centinel.finai.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TransactionService {

    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final MerchantCategorizationService categorizationService;
    private final TransactionMessageParserService parserService;

    public TransactionService(
            UserRepository userRepository,
            TransactionRepository transactionRepository,
            MerchantCategorizationService categorizationService,
            TransactionMessageParserService parserService) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.categorizationService = categorizationService;
        this.parserService = parserService;
    }

    @Transactional
    public Transaction saveTransaction(TransactionRequest request) {
        // Resolve user by phone number; create if not exists
        User user = userRepository.findByPhoneNumber(request.getUserPhone())
                .orElseGet(() -> {
                    User newUser = new User(request.getUserPhone(), null); // displayName is optional
                    return userRepository.save(newUser);
                });

        // Create transaction
        Transaction transaction = new Transaction();
        transaction.setUser(user);
        transaction.setRawMessage(request.getRawMessage());
        transaction.setAmount(request.getAmount());
        transaction.setCurrency(request.getCurrency());
        transaction.setTransactionDate(request.getTransactionDate());

        // Attempt rule-based parsing and categorization
        String merchant = null;
        if (request.getRawMessage() != null && !request.getRawMessage().isBlank()) {
            ParsedTransactionData parsed = parserService.parseMessage(request.getRawMessage());
            if (parsed.isSuccess()) {
                merchant = parsed.getMerchant();
            }
        }

        if (merchant != null) {
            transaction.setMerchant(merchant);
            CategorizationResult catResult = categorizationService.categorize(merchant);
            if (catResult.isCategorized()) {
                transaction.setCategory(catResult.getCategoryName());
                transaction.setPendingForAi(false);
                transaction.setIsAiCategorized(false);
            } else {
                transaction.setCategory("Uncategorized");
                transaction.setPendingForAi(true);
                transaction.setIsAiCategorized(false);
            }
        } else {
            transaction.setPendingForAi(true);
            transaction.setIsAiCategorized(false);
        }

        return transactionRepository.save(transaction);
    }
}
