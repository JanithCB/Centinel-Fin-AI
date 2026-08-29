package com.centinel.finai.service;

import com.centinel.finai.dto.SummaryResponse;
import com.centinel.finai.entity.Transaction;
import com.centinel.finai.repository.TransactionRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SummaryService {

    private final TransactionRepository transactionRepository;

    private static final DateTimeFormatter DAILY_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter MONTHLY_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

    public SummaryService(TransactionRepository transactionRepository) {
        this.transactionRepository = transactionRepository;
    }

    public SummaryResponse getSummary(String phoneNumber, String period) {
        List<Transaction> transactions = transactionRepository.findByUserPhoneNumber(phoneNumber);

        if (transactions == null || transactions.isEmpty()) {
            return new SummaryResponse(Collections.emptyMap(), Collections.emptyMap());
        }

        DateTimeFormatter formatter = "monthly".equalsIgnoreCase(period) ? MONTHLY_FORMATTER : DAILY_FORMATTER;

        Map<String, BigDecimal> totalsPerPeriod = transactions.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getTransactionDate() != null ? t.getTransactionDate().format(formatter) : "Unknown",
                        Collectors.reducing(BigDecimal.ZERO,
                                t -> t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO,
                                BigDecimal::add)
                ));

        Map<String, BigDecimal> totalsByCategory = transactions.stream()
                .collect(Collectors.groupingBy(
                        t -> {
                            String cat = t.getCategory();
                            return (cat == null || cat.trim().isEmpty()) ? "Uncategorized" : cat;
                        },
                        Collectors.reducing(BigDecimal.ZERO,
                                t -> t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO,
                                BigDecimal::add)
                ));

        return new SummaryResponse(totalsPerPeriod, totalsByCategory);
    }
}
