package tech.csm.securelms.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tech.csm.securelms.dto.request.PrimaryLinkRequest;
import tech.csm.securelms.dto.request.ReorderItemRequest;
import tech.csm.securelms.dto.response.ApiResponse;
import tech.csm.securelms.dto.response.PrimaryLinkResponse;
import tech.csm.securelms.service.PrimaryLinkService;

import java.util.List;

@RestController
@RequestMapping("/api/primary-links")
@RequiredArgsConstructor
@PreAuthorize("@permissionService.hasPermission(authentication)")
public class PrimaryLinkController {

    private final PrimaryLinkService primaryLinkService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PrimaryLinkResponse>>> list(
            @RequestParam(required = false) Long globalLinkId,
            @RequestParam(required = false) Long functionLinkId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Primary links fetched",
                primaryLinkService.list(globalLinkId, functionLinkId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<PrimaryLinkResponse>> create(@Valid @RequestBody PrimaryLinkRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Primary link created", primaryLinkService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PrimaryLinkResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody PrimaryLinkRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Primary link updated", primaryLinkService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<PrimaryLinkResponse>> delete(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Primary link deactivated", primaryLinkService.softDelete(id)));
    }

    @PatchMapping("/reorder")
    public ResponseEntity<ApiResponse<List<PrimaryLinkResponse>>> reorder(
            @Valid @RequestBody List<ReorderItemRequest> request) {
        return ResponseEntity.ok(ApiResponse.success("Primary link order updated", primaryLinkService.reorder(request)));
    }
}

