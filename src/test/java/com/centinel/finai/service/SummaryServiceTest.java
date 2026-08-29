package com.centinel.finai.service;

import com.centinel.finai.dto.SummaryResponse;
import com.centinel.finai.entity.Transaction;
import com.centinel.finai.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class SummaryServiceTest {

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private SummaryService summaryService;

    private List<Transaction> sampleTransactions;

    @BeforeEach
    void setUp() {
        Transaction t1 = new Transaction();
        t1.setAmount(new BigDecimal("1500.00"));
        t1.setTransactionDate(LocalDateTime.of(2026, 8, 15, 10, 0));
        t1.setCategory("Groceries");

        Transaction t2 = new Transaction();
        t2.setAmount(new BigDecimal("500.00"));
        t2.setTransactionDate(LocalDateTime.of(2026, 8, 15, 12, 0));
        t2.setCategory("Groceries");

        Transaction t3 = new Transaction();
        t3.setAmount(new BigDecimal("2000.00"));
        t3.setTransactionDate(LocalDateTime.of(2026, 8, 16, 12, 0));
        t3.setCategory("Utilities");

        Transaction t4 = new Transaction();
        t4.setAmount(new BigDecimal("1000.00"));
        t4.setTransactionDate(LocalDateTime.of(2026, 9, 1, 10, 0));
        t4.setCategory(""); // Should default to Uncategorized

        sampleTransactions = Arrays.asList(t1, t2, t3, t4);
    }

    @Test
    void getSummary_whenPeriodIsDaily_thenGroupsByDayAndCategory() {
        when(transactionRepository.findByUserPhoneNumber("+94771234567")).thenReturn(sampleTransactions);

        SummaryResponse response = summaryService.getSummary("+94771234567", "daily");

        assertThat(response.getTotalsPerPeriod()).hasSize(3);
        assertThat(response.getTotalsPerPeriod().get("2026-08-15")).isEqualByComparingTo(new BigDecimal("2000.00"));
        assertThat(response.getTotalsPerPeriod().get("2026-08-16")).isEqualByComparingTo(new BigDecimal("2000.00"));
        assertThat(response.getTotalsPerPeriod().get("2026-09-01")).isEqualByComparingTo(new BigDecimal("1000.00"));

        assertThat(response.getTotalsByCategory()).hasSize(3);
        assertThat(response.getTotalsByCategory().get("Groceries")).isEqualByComparingTo(new BigDecimal("2000.00"));
        assertThat(response.getTotalsByCategory().get("Utilities")).isEqualByComparingTo(new BigDecimal("2000.00"));
        assertThat(response.getTotalsByCategory().get("Uncategorized")).isEqualByComparingTo(new BigDecimal("1000.00"));
    }

    @Test
    void getSummary_whenPeriodIsMonthly_thenGroupsByMonthAndCategory() {
        when(transactionRepository.findByUserPhoneNumber("+94771234567")).thenReturn(sampleTransactions);

        SummaryResponse response = summaryService.getSummary("+94771234567", "monthly");

        assertThat(response.getTotalsPerPeriod()).hasSize(2);
        assertThat(response.getTotalsPerPeriod().get("2026-08")).isEqualByComparingTo(new BigDecimal("4000.00"));
        assertThat(response.getTotalsPerPeriod().get("2026-09")).isEqualByComparingTo(new BigDecimal("1000.00"));

        assertThat(response.getTotalsByCategory()).hasSize(3);
        assertThat(response.getTotalsByCategory().get("Groceries")).isEqualByComparingTo(new BigDecimal("2000.00"));
        assertThat(response.getTotalsByCategory().get("Utilities")).isEqualByComparingTo(new BigDecimal("2000.00"));
        assertThat(response.getTotalsByCategory().get("Uncategorized")).isEqualByComparingTo(new BigDecimal("1000.00"));
    }

    @Test
    void getSummary_whenNoTransactions_thenReturnsEmptyResponse() {
        when(transactionRepository.findByUserPhoneNumber("+94000000000")).thenReturn(Collections.emptyList());

        SummaryResponse response = summaryService.getSummary("+94000000000", "daily");

        assertThat(response.getTotalsPerPeriod()).isEmpty();
        assertThat(response.getTotalsByCategory()).isEmpty();
    }
}
