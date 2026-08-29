package com.centinel.finai.service;

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

    public TransactionService(UserRepository userRepository, TransactionRepository transactionRepository) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
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
        
        // Default flags (set automatically by @PrePersist in Transaction entity, but we can explicitly set them if we want to be sure)
        transaction.setPendingForAi(true);
        transaction.setIsAiCategorized(false);

        return transactionRepository.save(transaction);
    }
}
