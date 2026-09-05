package com.centinel.finai.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final IngestionApiKeyInterceptor ingestionApiKeyInterceptor;

    public WebMvcConfig(IngestionApiKeyInterceptor ingestionApiKeyInterceptor) {
        this.ingestionApiKeyInterceptor = ingestionApiKeyInterceptor;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:3000")
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("Content-Type", "X-INGESTION-API-KEY")
                .maxAge(3600);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(ingestionApiKeyInterceptor)
                .addPathPatterns("/api/v1/ingestion/**");
    }
}
