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
import tech.csm.securelms.dto.request.FunctionLinkRequest;
import tech.csm.securelms.dto.request.ReorderItemRequest;
import tech.csm.securelms.dto.response.ApiResponse;
import tech.csm.securelms.dto.response.FunctionLinkResponse;
import tech.csm.securelms.service.FunctionLinkService;

import java.util.List;

@RestController
@RequestMapping("/api/function-links")
@RequiredArgsConstructor
@PreAuthorize("@permissionService.hasPermission(authentication)")
public class FunctionLinkController {

    private final FunctionLinkService functionLinkService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FunctionLinkResponse>>> list(
            @RequestParam(defaultValue = "true") boolean includeInactive) {
        return ResponseEntity.ok(ApiResponse.success("Function links fetched", functionLinkService.list(includeInactive)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<FunctionLinkResponse>> create(@Valid @RequestBody FunctionLinkRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Function link created", functionLinkService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<FunctionLinkResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody FunctionLinkRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Function link updated", functionLinkService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<FunctionLinkResponse>> delete(@PathVariable Long id) {
        long activePrimaryCount = functionLinkService.countActivePrimaryLinks(id);
        long mappedUserCount = functionLinkService.countMappedUsers(id);
        FunctionLinkResponse response = functionLinkService.softDelete(id);
        String message = "Function link deactivated. " + activePrimaryCount
                + " active Primary Links are hidden from navigation. Mapped to " + mappedUserCount
                + " user permissions. Permission mappings were retained.";
        return ResponseEntity.ok(ApiResponse.success(message, response));
    }

    @PatchMapping("/reorder")
    public ResponseEntity<ApiResponse<List<FunctionLinkResponse>>> reorder(
            @Valid @RequestBody List<ReorderItemRequest> request) {
        return ResponseEntity.ok(ApiResponse.success("Function link order updated", functionLinkService.reorder(request)));
    }
}
