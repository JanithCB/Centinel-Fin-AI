package com.centinel.finai.purchase;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface PurchaseRequestRepository extends JpaRepository<PurchaseRequest, Long> {
    List<PurchaseRequest> findByChildId(Long childId);
    List<PurchaseRequest> findByFamilyIdAndStatus(Long familyId, PurchaseRequestStatus status);
    List<PurchaseRequest> findByFamilyId(Long familyId);
}
