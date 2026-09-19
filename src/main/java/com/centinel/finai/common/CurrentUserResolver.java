package com.centinel.finai.common;

import com.centinel.finai.identity.UserRole;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class CurrentUserResolver {

    public Long getCurrentUserId() {
        Jwt jwt = getJwt();
        if (jwt != null) {
            String sub = jwt.getSubject();
            if (sub != null) {
                try {
                    return Long.parseLong(sub);
                } catch (NumberFormatException e) {
                    return null; // Not a valid Long ID
                }
            }
        }
        return null;
    }

    public UserRole getCurrentUserRole() {
        Jwt jwt = getJwt();
        if (jwt != null) {
            Map<String, Object> appMetadata = jwt.getClaimAsMap("app_metadata");
            if (appMetadata != null && appMetadata.containsKey("role")) {
                String roleStr = (String) appMetadata.get("role");
                try {
                    return UserRole.valueOf(roleStr);
                } catch (IllegalArgumentException e) {
                    return null;
                }
            }
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
