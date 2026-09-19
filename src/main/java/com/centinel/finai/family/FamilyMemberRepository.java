package com.centinel.finai.family;

import com.centinel.finai.identity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FamilyMemberRepository extends JpaRepository<FamilyMember, Long> {
    
    List<FamilyMember> findByFamilyId(Long familyId);
    
    List<FamilyMember> findByUserId(Long userId);
    
    List<FamilyMember> findByFamilyIdAndRelationshipRole(Long familyId, UserRole relationshipRole);
    
    Optional<FamilyMember> findByFamilyIdAndUserId(Long familyId, Long userId);
}
