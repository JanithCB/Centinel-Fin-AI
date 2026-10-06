package com.centinel.finai.service;

import com.centinel.finai.common.CurrentUserResolver;
import com.centinel.finai.common.exception.ForbiddenOperationException;
import com.centinel.finai.dto.RegisterUserDTO;
import com.centinel.finai.dto.UserResponseDTO;
import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import com.centinel.finai.identity.UserRole;
import com.centinel.finai.family.FamilyMember;
import com.centinel.finai.family.FamilyMemberRepository;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final CurrentUserResolver currentUserResolver;
    private final FamilyMemberRepository familyMemberRepository;

    public UserService(UserRepository userRepository, CurrentUserResolver currentUserResolver, FamilyMemberRepository familyMemberRepository) {
        this.userRepository = userRepository;
        this.currentUserResolver = currentUserResolver;
        this.familyMemberRepository = familyMemberRepository;
    }

    public UserResponseDTO registerOrSyncUser(RegisterUserDTO dto, Jwt jwt) {
        if (jwt == null) {
            throw new ForbiddenOperationException("Authentication token required for user registration.");
        }

        String authId = jwt.getSubject();
        String lockKey = (authId != null && !authId.isBlank()) ? authId.intern() : "global_register_lock";

        // Synchronize on authId to guarantee concurrency safety and idempotency (AC-07, AC-91)
        synchronized (lockKey) {
            return doRegisterOrSyncUser(dto, jwt);
        }
    }

    @Transactional
    protected UserResponseDTO doRegisterOrSyncUser(RegisterUserDTO dto, Jwt jwt) {
        String authId = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        
        // Try finding existing user by authId or email
        Optional<User> existingUser = Optional.empty();
        if (authId != null && !authId.isBlank()) {
            existingUser = userRepository.findByAuthId(authId);
        }
        if (existingUser.isEmpty() && email != null && !email.isBlank()) {
            existingUser = userRepository.findByEmail(email);
        }

        User user;
        if (existingUser.isPresent()) {
            user = existingUser.get();
            if (authId != null && !authId.isBlank()) {
                user.setAuthId(authId);
            }
            if (email != null && !email.isBlank()) {
                user.setEmail(email);
            }
            // Do not overwrite existing role during sync to prevent privilege escalation (AC-06, AC-94)
            if (dto.getDisplayName() != null && !dto.getDisplayName().isBlank()) {
                user.setDisplayName(dto.getDisplayName());
            }
            if (dto.getPhoneNumber() != null && !dto.getPhoneNumber().isBlank()) {
                user.setPhoneNumber(dto.getPhoneNumber());
            }
        } else {
            String displayName = dto.getDisplayName();
            if (displayName == null || displayName.isBlank()) {
                displayName = email != null ? email.split("@")[0] : "User";
            }
            UserRole role = dto.getRole() != null ? dto.getRole() : UserRole.CHILD;
            user = new User(authId, email, displayName, role);
            if (dto.getPhoneNumber() != null) {
                user.setPhoneNumber(dto.getPhoneNumber());
            }
        }

        User savedUser = userRepository.save(user);
        return mapToDTO(savedUser);
    }

    @Transactional(readOnly = true)
    public UserResponseDTO getCurrentUserProfile(Jwt jwt) {
        if (jwt == null) {
            throw new ForbiddenOperationException("User not authenticated.");
        }

        User user = currentUserResolver.getCurrentUser()
                .orElseThrow(() -> new ForbiddenOperationException("User profile not found. Please complete registration."));

        return mapToDTO(user);
    }

    private UserResponseDTO mapToDTO(User user) {
        Long familyId = null;
        String familyName = null;
        if (user.getId() != null) {
            List<FamilyMember> memberships = familyMemberRepository.findByUserId(user.getId());
            if (!memberships.isEmpty()) {
                FamilyMember member = memberships.get(0);
                if (member.getFamily() != null) {
                    familyId = member.getFamily().getId();
                    familyName = member.getFamily().getName();
                }
            }
        }

        return new UserResponseDTO(
                user.getId(),
                user.getAuthId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getPhoneNumber(),
                user.getRole(),
                user.getCreatedAt(),
                familyId,
                familyName
        );
    }
}
