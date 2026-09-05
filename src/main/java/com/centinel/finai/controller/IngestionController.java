package com.centinel.finai.controller;

import com.centinel.finai.dto.TransactionMessageIngestionRequest;
import com.centinel.finai.dto.TransactionMessageIngestionResponse;
import com.centinel.finai.service.IngestionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/ingestion/transaction-messages")
public class IngestionController {

    private final IngestionService ingestionService;

    public IngestionController(IngestionService ingestionService) {
        this.ingestionService = ingestionService;
    }

    @PostMapping
    public ResponseEntity<TransactionMessageIngestionResponse> ingestTransactionMessage(
            @Valid @RequestBody TransactionMessageIngestionRequest request) {

        TransactionMessageIngestionResponse response = ingestionService.ingestMessage(request);

        if ("DUPLICATE".equalsIgnoreCase(response.getStatus())) {
            return ResponseEntity.ok(response);
        }

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }
}
