package com.centinel.finai.family;

import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import com.centinel.finai.identity.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
public class FamilyRepositoryTest {

    @Autowired
    private FamilyRepository familyRepository;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void testSaveFamilyAndMembers() {
        // Given: a parent and a child user
        User parentUser = new User("parent@test.com", "Parent Name", UserRole.PARENT);
        User childUser = new User("child@test.com", "Child Name", UserRole.CHILD);
        
        parentUser = userRepository.save(parentUser);
        childUser = userRepository.save(childUser);

        // And: a family
        Family family = new Family("The Smiths");
        family = familyRepository.save(family);

        // When: we add them as family members
        FamilyMember parentMember = new FamilyMember(family, parentUser, UserRole.PARENT);
        FamilyMember childMember = new FamilyMember(family, childUser, UserRole.CHILD);
        
        familyMemberRepository.save(parentMember);
        familyMemberRepository.save(childMember);

        // Then: we can find them by family ID and relationship role
        List<FamilyMember> parents = familyMemberRepository.findByFamilyIdAndRelationshipRole(family.getId(), UserRole.PARENT);
        assertThat(parents).hasSize(1);
        assertThat(parents.get(0).getUser().getEmail()).isEqualTo("parent@test.com");

        List<FamilyMember> children = familyMemberRepository.findByFamilyIdAndRelationshipRole(family.getId(), UserRole.CHILD);
        assertThat(children).hasSize(1);
        assertThat(children.get(0).getUser().getEmail()).isEqualTo("child@test.com");
        
        List<FamilyMember> allMembers = familyMemberRepository.findByFamilyId(family.getId());
        assertThat(allMembers).hasSize(2);
    }
}
