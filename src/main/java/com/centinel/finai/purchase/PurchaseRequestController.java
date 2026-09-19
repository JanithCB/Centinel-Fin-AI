package com.centinel.finai.purchase;

import com.centinel.finai.purchase.dto.CreatePurchaseRequestDTO;
import com.centinel.finai.purchase.dto.PurchaseRequestResponseDTO;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/purchase-requests")
public class PurchaseRequestController {

    private final PurchaseRequestService purchaseRequestService;

    public PurchaseRequestController(PurchaseRequestService purchaseRequestService) {
        this.purchaseRequestService = purchaseRequestService;
    }

    @PostMapping
    public ResponseEntity<PurchaseRequestResponseDTO> createRequest(@Valid @RequestBody CreatePurchaseRequestDTO requestDTO) {
        PurchaseRequestResponseDTO response = purchaseRequestService.createRequest(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/me")
    public ResponseEntity<List<PurchaseRequestResponseDTO>> getMyRequests() {
        List<PurchaseRequestResponseDTO> requests = purchaseRequestService.getMyRequests();
        return ResponseEntity.ok(requests);
    }

    @GetMapping("/family")
    public ResponseEntity<List<PurchaseRequestResponseDTO>> getFamilyRequests() {
        List<PurchaseRequestResponseDTO> requests = purchaseRequestService.getFamilyRequests();
        return ResponseEntity.ok(requests);
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<PurchaseRequestResponseDTO> approveRequest(@PathVariable Long id) {
        PurchaseRequestResponseDTO response = purchaseRequestService.approveRequest(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/deny")
    public ResponseEntity<PurchaseRequestResponseDTO> denyRequest(@PathVariable Long id) {
        PurchaseRequestResponseDTO response = purchaseRequestService.denyRequest(id);
        return ResponseEntity.ok(response);
    }
}
