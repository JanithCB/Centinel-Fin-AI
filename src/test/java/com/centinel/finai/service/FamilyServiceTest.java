package com.centinel.finai.service;

import com.centinel.finai.dto.FamilyResponseDTO;
import com.centinel.finai.family.Family;
import com.centinel.finai.family.FamilyMember;
import com.centinel.finai.family.FamilyMemberRepository;
import com.centinel.finai.family.FamilyRepository;
import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import com.centinel.finai.identity.UserRole;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class FamilyServiceTest {

    @Mock
    private FamilyRepository familyRepository;

    @Mock
    private FamilyMemberRepository familyMemberRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private FamilyService familyService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testCreateFamily_Success() {
        Long parentId = 1L;
        User parent = new User("parent@test.com", "Parent", UserRole.PARENT);
        parent.setId(parentId);

        when(userRepository.findByIdAndRole(parentId, UserRole.PARENT)).thenReturn(Optional.of(parent));
        
        Family family = new Family("My Family");
        family.setId(10L);
        family.setCreatedAt(LocalDateTime.now());
        when(familyRepository.save(any(Family.class))).thenReturn(family);

        FamilyResponseDTO response = familyService.createFamily("My Family", parentId);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(10L);
        assertThat(response.getName()).isEqualTo("My Family");

        verify(familyRepository, times(1)).save(any(Family.class));
        verify(familyMemberRepository, times(1)).save(any(FamilyMember.class));
    }

    @Test
    void testCreateFamily_FailsIfUserNotParent() {
        Long parentId = 1L;
        when(userRepository.findByIdAndRole(parentId, UserRole.PARENT)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> familyService.createFamily("My Family", parentId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("User not found or is not a PARENT");

        verify(familyRepository, never()).save(any());
        verify(familyMemberRepository, never()).save(any());
    }

    @Test
    void testAddChild_Success() {
        Long familyId = 10L;
        Long childId = 2L;

        Family family = new Family("My Family");
        family.setId(familyId);

        User child = new User("child@test.com", "Child", UserRole.CHILD);
        child.setId(childId);

        when(familyRepository.findById(familyId)).thenReturn(Optional.of(family));
        when(userRepository.findByIdAndRole(childId, UserRole.CHILD)).thenReturn(Optional.of(child));
        when(familyMemberRepository.findByFamilyIdAndUserId(familyId, childId)).thenReturn(Optional.empty());

        familyService.addChild(familyId, childId);

        verify(familyMemberRepository, times(1)).save(any(FamilyMember.class));
    }

    @Test
    void testAddChild_FailsIfAlreadyMember() {
        Long familyId = 10L;
        Long childId = 2L;

        Family family = new Family("My Family");
        family.setId(familyId);

        User child = new User("child@test.com", "Child", UserRole.CHILD);
        child.setId(childId);

        FamilyMember existingMember = new FamilyMember(family, child, UserRole.CHILD);

        when(familyRepository.findById(familyId)).thenReturn(Optional.of(family));
        when(userRepository.findByIdAndRole(childId, UserRole.CHILD)).thenReturn(Optional.of(child));
        when(familyMemberRepository.findByFamilyIdAndUserId(familyId, childId)).thenReturn(Optional.of(existingMember));

        assertThatThrownBy(() -> familyService.addChild(familyId, childId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Child is already a member of this family");

        verify(familyMemberRepository, never()).save(any(FamilyMember.class));
    }

    @Test
    void testIsParentOfChild_True() {
        Long parentId = 1L;
        Long childId = 2L;
        
        Family family = new Family("My Family");
        family.setId(10L);

        FamilyMember parentMember = new FamilyMember(family, null, UserRole.PARENT);
        FamilyMember childMember = new FamilyMember(family, null, UserRole.CHILD);

        when(familyMemberRepository.findByUserId(parentId)).thenReturn(List.of(parentMember));
        when(familyMemberRepository.findByUserId(childId)).thenReturn(List.of(childMember));

        boolean isParent = familyService.isParentOfChild(parentId, childId);
        
        assertThat(isParent).isTrue();
    }

    @Test
    void testIsParentOfChild_False() {
        Long parentId = 1L;
        Long childId = 2L;
        
        Family family1 = new Family("My Family");
        family1.setId(10L);

        Family family2 = new Family("Other Family");
        family2.setId(11L);

        FamilyMember parentMember = new FamilyMember(family1, null, UserRole.PARENT);
        FamilyMember childMember = new FamilyMember(family2, null, UserRole.CHILD);

        when(familyMemberRepository.findByUserId(parentId)).thenReturn(List.of(parentMember));
        when(familyMemberRepository.findByUserId(childId)).thenReturn(List.of(childMember));

        boolean isParent = familyService.isParentOfChild(parentId, childId);
        
        assertThat(isParent).isFalse();
    }

    @Test
    void testGetChildrenOfParent() {
        Long parentId = 1L;
        
        Family family = new Family("My Family");
        family.setId(10L);

        FamilyMember parentMember = new FamilyMember(family, null, UserRole.PARENT);
        
        User child1 = new User("child1@test.com", "Child 1", UserRole.CHILD);
        User child2 = new User("child2@test.com", "Child 2", UserRole.CHILD);
        
        FamilyMember childMember1 = new FamilyMember(family, child1, UserRole.CHILD);
        FamilyMember childMember2 = new FamilyMember(family, child2, UserRole.CHILD);

        when(familyMemberRepository.findByUserId(parentId)).thenReturn(List.of(parentMember));
        when(familyMemberRepository.findByFamilyIdAndRelationshipRole(10L, UserRole.CHILD))
                .thenReturn(Arrays.asList(childMember1, childMember2));

        List<User> children = familyService.getChildrenOfParent(parentId);
        
        assertThat(children).hasSize(2);
        assertThat(children).contains(child1, child2);
    }
}
