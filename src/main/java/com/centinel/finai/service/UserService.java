package com.centinel.finai.service;

import com.centinel.finai.common.CurrentUserResolver;
import com.centinel.finai.common.exception.ForbiddenOperationException;
import com.centinel.finai.dto.RegisterUserDTO;
import com.centinel.finai.dto.UserResponseDTO;
import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import com.centinel.finai.identity.UserRole;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final CurrentUserResolver currentUserResolver;

    public UserService(UserRepository userRepository, CurrentUserResolver currentUserResolver) {
        this.userRepository = userRepository;
        this.currentUserResolver = currentUserResolver;
    }

    @Transactional
    public UserResponseDTO registerOrSyncUser(RegisterUserDTO dto, Jwt jwt) {
        if (jwt == null) {
            throw new ForbiddenOperationException("Authentication token required for user registration.");
        }

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
            if (dto.getRole() != null) {
                user.setRole(dto.getRole());
            }
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
        return new UserResponseDTO(
                user.getId(),
                user.getAuthId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getPhoneNumber(),
                user.getRole(),
                user.getCreatedAt()
        );
    }
}
