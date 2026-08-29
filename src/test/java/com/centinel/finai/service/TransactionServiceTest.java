package com.centinel.finai.service;

import com.centinel.finai.dto.TransactionRequest;
import com.centinel.finai.entity.Transaction;
import com.centinel.finai.entity.User;
import com.centinel.finai.repository.TransactionRepository;
import com.centinel.finai.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TransactionServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TransactionRepository transactionRepository;

    @InjectMocks
    private TransactionService transactionService;

    private TransactionRequest request;

    @BeforeEach
    void setUp() {
        request = new TransactionRequest();
        request.setUserPhone("+94771234567");
        request.setRawMessage("Visa Card charged Rs. 1500");
        request.setAmount(new BigDecimal("1500.00"));
        request.setCurrency("LKR");
        request.setTransactionDate(LocalDateTime.of(2026, 8, 16, 10, 15));
    }

    @Test
    void saveTransaction_whenUserExists_thenSavesTransaction() {
        User existingUser = new User("+94771234567", "John Doe");
        existingUser.setId(1L);

        when(userRepository.findByPhoneNumber("+94771234567")).thenReturn(Optional.of(existingUser));
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArguments()[0]);

        Transaction savedTx = transactionService.saveTransaction(request);

        assertThat(savedTx.getUser()).isEqualTo(existingUser);
        assertThat(savedTx.getAmount()).isEqualByComparingTo(new BigDecimal("1500.00"));
        assertThat(savedTx.getCurrency()).isEqualTo("LKR");
        assertThat(savedTx.getRawMessage()).isEqualTo("Visa Card charged Rs. 1500");
        assertThat(savedTx.getTransactionDate()).isEqualTo(LocalDateTime.of(2026, 8, 16, 10, 15));
        assertThat(savedTx.getPendingForAi()).isTrue();
        assertThat(savedTx.getIsAiCategorized()).isFalse();

        verify(userRepository, never()).save(any(User.class));
        verify(transactionRepository, times(1)).save(any(Transaction.class));
    }

    @Test
    void saveTransaction_whenUserDoesNotExist_thenCreatesUserAndSavesTransaction() {
        when(userRepository.findByPhoneNumber("+94771234567")).thenReturn(Optional.empty());
        
        User newUser = new User("+94771234567", null);
        when(userRepository.save(any(User.class))).thenReturn(newUser);
        when(transactionRepository.save(any(Transaction.class))).thenAnswer(i -> i.getArguments()[0]);

        Transaction savedTx = transactionService.saveTransaction(request);

        assertThat(savedTx.getUser()).isEqualTo(newUser);
        assertThat(savedTx.getAmount()).isEqualByComparingTo(new BigDecimal("1500.00"));

        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository, times(1)).save(userCaptor.capture());
        assertThat(userCaptor.getValue().getPhoneNumber()).isEqualTo("+94771234567");
        
        verify(transactionRepository, times(1)).save(any(Transaction.class));
    }
}
