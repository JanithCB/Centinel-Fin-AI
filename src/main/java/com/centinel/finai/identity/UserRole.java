package com.centinel.finai.identity;

/**
 * Role assigned to every user in the ParentGuard system.
 *
 * <ul>
 *   <li>{@link #PARENT} – a guardian who can view, approve, and deny
 *       purchase requests raised by linked children.</li>
 *   <li>{@link #CHILD}  – a child account that can create purchase
 *       requests and view their own request history.</li>
 * </ul>
 *
 * Stored as a VARCHAR in the {@code users} table
 * ({@code @Enumerated(EnumType.STRING)}).
 */
public enum UserRole {
    PARENT,
    CHILD
}
