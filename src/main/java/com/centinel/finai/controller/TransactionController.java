package com.centinel.finai.controller;

import com.centinel.finai.dto.TransactionRequest;
import com.centinel.finai.entity.Transaction;
import com.centinel.finai.service.TransactionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @PostMapping
    public ResponseEntity<Transaction> saveTransaction(@Valid @RequestBody TransactionRequest request) {
        Transaction savedTransaction = transactionService.saveTransaction(request);
        return new ResponseEntity<>(savedTransaction, HttpStatus.CREATED);
    }
}
