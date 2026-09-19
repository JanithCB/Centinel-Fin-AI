package com.centinel.finai.purchase;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ApprovalDecisionRepository extends JpaRepository<ApprovalDecision, Long> {
}
