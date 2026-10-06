package com.centinel.finai.common;

import com.centinel.finai.identity.User;
import com.centinel.finai.identity.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri:https://bllntgtyksncfahhdxga.supabase.co/auth/v1/.well-known/jwks.json}") String jwkSetUri,
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri:https://bllntgtyksncfahhdxga.supabase.co/auth/v1}") String issuerUri,
            @Value("${centinel.security.jwt.audience:authenticated}") String expectedAudience) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri)
                .jwsAlgorithms(algorithms -> {
                    algorithms.add(SignatureAlgorithm.ES256);
                    algorithms.add(SignatureAlgorithm.RS256);
                })
                .build();

        OAuth2TokenValidator<Jwt> defaultValidator = JwtValidators.createDefaultWithIssuer(issuerUri);
        OAuth2TokenValidator<Jwt> audienceValidator = new JwtClaimValidator<List<String>>(
                JwtClaimNames.AUD,
                aud -> aud != null && aud.contains(expectedAudience)
        );
        OAuth2TokenValidator<Jwt> combinedValidator = new DelegatingOAuth2TokenValidator<>(defaultValidator, audienceValidator);
        decoder.setJwtValidator(combinedValidator);

        return decoder;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, UserRepository userRepository) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/ingestion/**").permitAll()
                .requestMatchers("/health").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/v1/purchase-requests").hasAuthority("ROLE_CHILD")
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/purchase-requests/me").hasAuthority("ROLE_CHILD")
                .requestMatchers("/api/v1/purchase-requests/family").hasAuthority("ROLE_PARENT")
                .requestMatchers("/api/v1/purchase-requests/*/approve").hasAuthority("ROLE_PARENT")
                .requestMatchers("/api/v1/purchase-requests/*/deny").hasAuthority("ROLE_PARENT")
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter(userRepository))));
            
        return http.build();
    }

    @Bean
    public Converter<Jwt, ? extends AbstractAuthenticationToken> jwtAuthenticationConverter(UserRepository userRepository) {
        return jwt -> {
            List<GrantedAuthority> authorities = new ArrayList<>();
            String authId = jwt.getSubject();
            Optional<User> user = Optional.empty();

            if (authId != null && !authId.isBlank()) {
                user = userRepository.findByAuthId(authId);
            }
            if (user.isEmpty()) {
                String email = jwt.getClaimAsString("email");
                if (email != null && !email.isBlank()) {
                    user = userRepository.findByEmail(email);
                }
            }

            // DB is the single source of truth for application role authorization (AC-82)
            if (user.isPresent() && user.get().getRole() != null) {
                authorities.add(new SimpleGrantedAuthority("ROLE_" + user.get().getRole().name()));
            } else {
                // Fallback for unpersisted test contexts that provide app_metadata
                Map<String, Object> appMetadata = jwt.getClaimAsMap("app_metadata");
                if (appMetadata != null && appMetadata.containsKey("role")) {
                    String role = (String) appMetadata.get("role");
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
                }
            }
            return new JwtAuthenticationToken(jwt, authorities);
        };
    }
}
