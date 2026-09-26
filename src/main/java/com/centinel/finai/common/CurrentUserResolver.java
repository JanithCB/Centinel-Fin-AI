package com.centinel.finai.common;

import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import com.centinel.finai.identity.UserRole;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;

@Component
public class CurrentUserResolver {

    private final UserRepository userRepository;

    public CurrentUserResolver(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Long getCurrentUserId() {
        Jwt jwt = getJwt();
        if (jwt == null) {
            return null;
        }

        String sub = jwt.getSubject();

        // 1. Try resolving persisted user by auth_id (Supabase UUID)
        if (sub != null && !sub.isBlank()) {
            Optional<User> userByAuthId = userRepository.findByAuthId(sub);
            if (userByAuthId.isPresent()) {
                return userByAuthId.get().getId();
            }
        }

        // 2. Try resolving persisted user by email claim
        String email = jwt.getClaimAsString("email");
        if (email != null && !email.isBlank()) {
            Optional<User> userByEmail = userRepository.findByEmail(email);
            if (userByEmail.isPresent()) {
                return userByEmail.get().getId();
            }
        }

        // 3. Fallback: If sub is a numeric ID (used in test mocks or direct mapping)
        if (sub != null) {
            try {
                return Long.parseLong(sub);
            } catch (NumberFormatException ignored) {
                // Non-numeric subject with no matching DB record
            }
        }

        return null;
    }

    public Optional<User> getCurrentUser() {
        Long userId = getCurrentUserId();
        if (userId != null) {
            return userRepository.findById(userId);
        }
        return Optional.empty();
    }

    public UserRole getCurrentUserRole() {
        Jwt jwt = getJwt();
        if (jwt != null) {
            Map<String, Object> appMetadata = jwt.getClaimAsMap("app_metadata");
            if (appMetadata != null && appMetadata.containsKey("role")) {
                String roleStr = (String) appMetadata.get("role");
                try {
                    return UserRole.valueOf(roleStr.toUpperCase());
                } catch (IllegalArgumentException ignored) {
                }
            }
        }

        Optional<User> user = getCurrentUser();
        if (user.isPresent() && user.get().getRole() != null) {
            return user.get().getRole();
        }

        return null;
    }

    private Jwt getJwt() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt) {
            return (Jwt) authentication.getPrincipal();
        }
        return null;
    }
}
