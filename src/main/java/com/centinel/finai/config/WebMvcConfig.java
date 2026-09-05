package com.centinel.finai.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final IngestionApiKeyInterceptor ingestionApiKeyInterceptor;

    public WebMvcConfig(IngestionApiKeyInterceptor ingestionApiKeyInterceptor) {
        this.ingestionApiKeyInterceptor = ingestionApiKeyInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(ingestionApiKeyInterceptor)
                .addPathPatterns("/api/v1/ingestion/**");
    }
}
