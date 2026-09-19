package com.centinel.finai.identity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for {@link User} entities.
 *
 * <p>Moved from {@code repository.UserRepository} to {@code identity.UserRepository}
 * as part of the ParentGuard modular-monolith refactor (PG-BE-1A).
 *
 * <p>Existing method {@link #findByPhoneNumber} is retained for backward
 * compatibility with the legacy SMS ingestion pipeline ({@code IngestionService}).
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /** Legacy lookup used by the SMS ingestion pipeline. */
    Optional<User> findByPhoneNumber(String phoneNumber);

    /** ParentGuard lookup for web-app email-based authentication. */
    Optional<User> findByEmail(String email);

    /**
     * Verifies that a user with the given ID has the expected role.
     * Useful for authorization checks without loading the full entity first.
     */
    Optional<User> findByIdAndRole(Long id, UserRole role);
}
