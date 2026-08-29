package com.centinel.finai.controller;

import com.centinel.finai.entity.Transaction;
import com.centinel.finai.entity.User;
import com.centinel.finai.repository.TransactionRepository;
import com.centinel.finai.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
public class TransactionControllerTest {

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
    void whenValidInput_thenReturns201AndSavesTransaction() throws Exception {
        String jsonRequest = "{\"userPhone\":\"+94771234567\",\"rawMessage\":\"Visa Card ****1234 charged Rs. 1500 at Keells Super\",\"amount\":1500.00,\"currency\":\"LKR\",\"transactionDate\":\"2026-08-16T10:15:00\"}";

        mockMvc.perform(post("/api/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonRequest))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.amount").value(1500.00))
                .andExpect(jsonPath("$.currency").value("LKR"));

        assertThat(transactionRepository.findAll()).hasSize(1);
        Transaction savedTransaction = transactionRepository.findAll().get(0);
        assertThat(savedTransaction.getAmount()).isEqualByComparingTo(new BigDecimal("1500.00"));
        assertThat(savedTransaction.getPendingForAi()).isTrue();

        Optional<User> user = userRepository.findByPhoneNumber("+94771234567");
        assertThat(user).isPresent();
        assertThat(savedTransaction.getUser().getId()).isEqualTo(user.get().getId());
    }

    @Test
    void whenInvalidInput_thenReturns400() throws Exception {
        String jsonRequest = "{}";

        mockMvc.perform(post("/api/transactions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(jsonRequest))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.userPhone").exists())
                .andExpect(jsonPath("$.amount").exists());
    }
}
