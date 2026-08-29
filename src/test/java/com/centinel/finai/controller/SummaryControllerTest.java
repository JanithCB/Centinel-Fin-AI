package com.centinel.finai.controller;

import com.centinel.finai.entity.Transaction;
import com.centinel.finai.entity.User;
import com.centinel.finai.repository.TransactionRepository;
import com.centinel.finai.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
public class SummaryControllerTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        transactionRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void whenTransactionsExist_thenReturnsDailySummary() throws Exception {
        User user = new User("+94771234567", "Test User");
        user = userRepository.save(user);

        Transaction t1 = new Transaction();
        t1.setUser(user);
        t1.setAmount(new BigDecimal("1000.00"));
        t1.setTransactionDate(LocalDateTime.of(2026, 8, 15, 10, 0));
        t1.setCategory("Groceries");

        Transaction t2 = new Transaction();
        t2.setUser(user);
        t2.setAmount(new BigDecimal("500.00"));
        t2.setTransactionDate(LocalDateTime.of(2026, 8, 15, 15, 0));
        t2.setCategory("Groceries");

        Transaction t3 = new Transaction();
        t3.setUser(user);
        t3.setAmount(new BigDecimal("2000.00"));
        t3.setTransactionDate(LocalDateTime.of(2026, 8, 16, 12, 0));
        t3.setCategory("Utilities");

        transactionRepository.save(t1);
        transactionRepository.save(t2);
        transactionRepository.save(t3);

        mockMvc.perform(get("/api/summary")
                .param("phone", "+94771234567")
                .param("period", "daily"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalsPerPeriod['2026-08-15']").value(1500.00))
                .andExpect(jsonPath("$.totalsPerPeriod['2026-08-16']").value(2000.00))
                .andExpect(jsonPath("$.totalsByCategory['Groceries']").value(1500.00))
                .andExpect(jsonPath("$.totalsByCategory['Utilities']").value(2000.00));
    }

    @Test
    void whenTransactionsExist_thenReturnsMonthlySummary() throws Exception {
        User user = new User("+94771234567", "Test User");
        user = userRepository.save(user);

        Transaction t1 = new Transaction();
        t1.setUser(user);
        t1.setAmount(new BigDecimal("1500.00"));
        t1.setTransactionDate(LocalDateTime.of(2026, 8, 15, 10, 0));

        Transaction t2 = new Transaction();
        t2.setUser(user);
        t2.setAmount(new BigDecimal("3000.00"));
        t2.setTransactionDate(LocalDateTime.of(2026, 9, 1, 10, 0));

        transactionRepository.save(t1);
        transactionRepository.save(t2);

        mockMvc.perform(get("/api/summary")
                .param("phone", "+94771234567")
                .param("period", "monthly"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalsPerPeriod['2026-08']").value(1500.00))
                .andExpect(jsonPath("$.totalsPerPeriod['2026-09']").value(3000.00))
                .andExpect(jsonPath("$.totalsByCategory['Uncategorized']").value(4500.00));
    }

    @Test
    void whenNoTransactions_thenReturnsEmptySummary() throws Exception {
        mockMvc.perform(get("/api/summary")
                .param("phone", "+94000000000")
                .param("period", "daily"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalsPerPeriod").isEmpty())
                .andExpect(jsonPath("$.totalsByCategory").isEmpty());
    }
}
