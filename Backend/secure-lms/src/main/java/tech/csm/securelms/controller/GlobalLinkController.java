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
import tech.csm.securelms.dto.request.GlobalLinkRequest;
import tech.csm.securelms.dto.request.ReorderItemRequest;
import tech.csm.securelms.dto.response.ApiResponse;
import tech.csm.securelms.dto.response.GlobalLinkResponse;
import tech.csm.securelms.service.GlobalLinkService;

import java.util.List;

@RestController
@RequestMapping("/api/global-links")
@RequiredArgsConstructor
@PreAuthorize("@permissionService.hasPermission(authentication)")
public class GlobalLinkController {

    private final GlobalLinkService globalLinkService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<GlobalLinkResponse>>> list(
            @RequestParam(defaultValue = "true") boolean includeInactive) {
        return ResponseEntity.ok(ApiResponse.success("Global links fetched", globalLinkService.list(includeInactive)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<GlobalLinkResponse>> create(@Valid @RequestBody GlobalLinkRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Global link created", globalLinkService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<GlobalLinkResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody GlobalLinkRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Global link updated", globalLinkService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<GlobalLinkResponse>> delete(@PathVariable Long id) {
        long impacted = globalLinkService.countActivePrimaryLinks(id);
        GlobalLinkResponse response = globalLinkService.softDelete(id);
        return ResponseEntity.ok(ApiResponse.success(
                "Global link deactivated. " + impacted + " associated active Primary Links are hidden from navigation.",
                response));
    }

    @PatchMapping("/reorder")
    public ResponseEntity<ApiResponse<List<GlobalLinkResponse>>> reorder(@Valid @RequestBody List<ReorderItemRequest> request) {
        return ResponseEntity.ok(ApiResponse.success("Global link order updated", globalLinkService.reorder(request)));
    }
}
