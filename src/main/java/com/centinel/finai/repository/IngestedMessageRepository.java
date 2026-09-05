package com.centinel.finai.repository;

import com.centinel.finai.entity.IngestedMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IngestedMessageRepository extends JpaRepository<IngestedMessage, Long> {
    boolean existsByExternalMessageId(String externalMessageId);
    Optional<IngestedMessage> findByExternalMessageId(String externalMessageId);
}
