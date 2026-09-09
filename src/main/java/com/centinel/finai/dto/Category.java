package com.centinel.finai.dto;

/**
 * Standard expense and income categories supported by Centinel Fin AI.
 */
public enum Category {
    GROCERIES("Groceries"),
    TRANSPORT("Transport"),
    FOOD_AND_DINING("Food and Dining"),
    BILLS_AND_UTILITIES("Bills and Utilities"),
    SUBSCRIPTIONS("Subscriptions"),
    SHOPPING("Shopping"),
    HEALTHCARE("Healthcare"),
    ENTERTAINMENT("Entertainment"),
    EDUCATION("Education"),
    OTHER("Other");

    private final String displayName;

    Category(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static Category fromDisplayName(String name) {
        if (name == null) return OTHER;
        for (Category c : values()) {
            if (c.displayName.equalsIgnoreCase(name) || c.name().equalsIgnoreCase(name)) {
                return c;
            }
        }
        return OTHER;
    }
}
