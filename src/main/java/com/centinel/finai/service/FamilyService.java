package com.centinel.finai.service;

import com.centinel.finai.dto.FamilyResponseDTO;
import com.centinel.finai.family.Family;
import com.centinel.finai.family.FamilyMember;
import com.centinel.finai.family.FamilyMemberRepository;
import com.centinel.finai.family.FamilyRepository;
import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import com.centinel.finai.identity.UserRole;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class FamilyService {

    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final UserRepository userRepository;

    public FamilyService(FamilyRepository familyRepository, FamilyMemberRepository familyMemberRepository, UserRepository userRepository) {
        this.familyRepository = familyRepository;
        this.familyMemberRepository = familyMemberRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public FamilyResponseDTO createFamily(String name, Long parentUserId) {
        User parent = userRepository.findByIdAndRole(parentUserId, UserRole.PARENT)
                .orElseThrow(() -> new IllegalArgumentException("User not found or is not a PARENT"));

        Family family = new Family(name);
        family = familyRepository.save(family);

        FamilyMember member = new FamilyMember(family, parent, UserRole.PARENT);
        familyMemberRepository.save(member);

        return new FamilyResponseDTO(family.getId(), family.getName(), family.getCreatedAt());
    }

    @Transactional
    public void addChild(Long familyId, Long childUserId) {
        Family family = familyRepository.findById(familyId)
                .orElseThrow(() -> new IllegalArgumentException("Family not found"));

        User child = userRepository.findByIdAndRole(childUserId, UserRole.CHILD)
                .orElseThrow(() -> new IllegalArgumentException("User not found or is not a CHILD"));

        Optional<FamilyMember> existingMember = familyMemberRepository.findByFamilyIdAndUserId(familyId, childUserId);
        if (existingMember.isPresent()) {
            throw new IllegalArgumentException("Child is already a member of this family");
        }

        FamilyMember member = new FamilyMember(family, child, UserRole.CHILD);
        familyMemberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public boolean isParentOfChild(Long parentUserId, Long childUserId) {
        // A user is a parent of a child if they both belong to the same family 
        // with the respective roles.
        List<FamilyMember> parentMemberships = familyMemberRepository.findByUserId(parentUserId).stream()
                .filter(m -> m.getRelationshipRole() == UserRole.PARENT)
                .collect(Collectors.toList());
        
        List<FamilyMember> childMemberships = familyMemberRepository.findByUserId(childUserId).stream()
                .filter(m -> m.getRelationshipRole() == UserRole.CHILD)
                .collect(Collectors.toList());

        for (FamilyMember pMem : parentMemberships) {
            for (FamilyMember cMem : childMemberships) {
                if (pMem.getFamily().getId().equals(cMem.getFamily().getId())) {
                    return true;
                }
            }
        }
        return false;
    }

    @Transactional(readOnly = true)
    public List<User> getChildrenOfParent(Long parentUserId) {
        List<FamilyMember> parentMemberships = familyMemberRepository.findByUserId(parentUserId).stream()
                .filter(m -> m.getRelationshipRole() == UserRole.PARENT)
                .collect(Collectors.toList());

        return parentMemberships.stream()
                .flatMap(pMem -> familyMemberRepository.findByFamilyIdAndRelationshipRole(pMem.getFamily().getId(), UserRole.CHILD).stream())
                .map(FamilyMember::getUser)
                .distinct()
                .collect(Collectors.toList());
    }
}
