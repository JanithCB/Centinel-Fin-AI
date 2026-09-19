package com.centinel.finai.entity;

/**
 * @deprecated Moved to {@link com.centinel.finai.identity.User}.
 * This type alias is retained only for backward compatibility during the PG-BE-1A
 * refactor. All new code must use {@code com.centinel.finai.identity.User}.
 * This class will be deleted after all references are migrated.
 *
 * <p>Note: The {@code @Entity} mapping now lives exclusively in
 * {@code com.centinel.finai.identity.User} to avoid duplicate JPA mapping errors.
 */
@Deprecated(since = "PG-BE-1A", forRemoval = true)
public class User extends com.centinel.finai.identity.User {

    public User() {
        super();
    }

    /** Legacy constructor used by SMS ingestion pipeline. */
    public User(String phoneNumber, String displayName) {
        super(phoneNumber, displayName);
    }
}
