package com.centinel.finai.config;

import com.centinel.finai.exception.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class IngestionApiKeyInterceptor implements HandlerInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(IngestionApiKeyInterceptor.class);
    public static final String API_KEY_HEADER = "X-INGESTION-API-KEY";

    @Value("${centinel.ingestion.api-key:}")
    private String configuredApiKey;

    public void setConfiguredApiKey(String configuredApiKey) {
        this.configuredApiKey = configuredApiKey;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String providedKey = request.getHeader(API_KEY_HEADER);

        if (configuredApiKey == null || configuredApiKey.trim().isEmpty()) {
            logger.error("Ingestion API key is not configured on the server. Rejecting ingestion request for URI={}", request.getRequestURI());
            throw new UnauthorizedException("Ingestion endpoint is not properly configured on server.");
        }

        if (providedKey == null || providedKey.trim().isEmpty()) {
            logger.warn("Ingestion request rejected: missing '{}' header for URI={}", API_KEY_HEADER, request.getRequestURI());
            throw new UnauthorizedException("Missing required " + API_KEY_HEADER + " header.");
        }

        boolean matches = MessageDigest.isEqual(
                configuredApiKey.trim().getBytes(StandardCharsets.UTF_8),
                providedKey.trim().getBytes(StandardCharsets.UTF_8)
        );

        if (!matches) {
            logger.warn("Ingestion request rejected: invalid API key provided for URI={}", request.getRequestURI());
            throw new UnauthorizedException("Invalid " + API_KEY_HEADER + " header value.");
        }

        return true;
    }
}
