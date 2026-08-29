package com.centinel.finai.controller;

import com.centinel.finai.dto.SummaryResponse;
import com.centinel.finai.service.SummaryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/summary")
public class SummaryController {

    private final SummaryService summaryService;

    public SummaryController(SummaryService summaryService) {
        this.summaryService = summaryService;
    }

    @GetMapping
    public ResponseEntity<SummaryResponse> getSummary(
            @RequestParam("phone") String phone,
            @RequestParam(value = "period", defaultValue = "monthly") String period) {
        
        SummaryResponse response = summaryService.getSummary(phone, period);
        return ResponseEntity.ok(response);
    }
}
