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
import tech.csm.securelms.dto.request.RoleMasterRequest;
import tech.csm.securelms.dto.request.RolePermissionSaveRequest;
import tech.csm.securelms.dto.response.ApiResponse;
import tech.csm.securelms.dto.response.RolePermissionResponse;
import tech.csm.securelms.dto.response.RoleMasterResponse;
import tech.csm.securelms.dto.response.UserPermissionSaveSummaryResponse;
import tech.csm.securelms.service.RolePermissionService;
import tech.csm.securelms.service.RoleMasterService;

import tech.csm.securelms.security.UserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/roles")
@RequiredArgsConstructor
public class RoleMasterController {

    private final RoleMasterService roleMasterService;
    private final RolePermissionService rolePermissionService;

    @GetMapping
    @PreAuthorize("@permissionService.hasAnyPermission(authentication, '/admin/manage-links/role-master', '/admin/manage-links/permissions')")
    public ResponseEntity<ApiResponse<List<RoleMasterResponse>>> list(
            @RequestParam(defaultValue = "true") boolean includeInactive,
            @RequestParam(defaultValue = "false") boolean assignableOnly,
            @RequestParam(required = false) List<Long> groupIds,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Roles fetched",
                roleMasterService.list(includeInactive, assignableOnly, principal, groupIds)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RoleMasterResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Role fetched", roleMasterService.get(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<RoleMasterResponse>> create(@Valid @RequestBody RoleMasterRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Role created", roleMasterService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<RoleMasterResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody RoleMasterRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Role updated", roleMasterService.update(id, request)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<RoleMasterResponse>> setActive(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> request) {
        boolean active = request.getOrDefault("active", true);
        return ResponseEntity.ok(ApiResponse.success("Role status updated", roleMasterService.setActive(id, active)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable Long id) {
        roleMasterService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Role deleted"));
    }

    @GetMapping("/{id}/permissions")
    public ResponseEntity<ApiResponse<RolePermissionResponse>> getPermissions(
            @PathVariable Long id,
            org.springframework.security.core.Authentication authentication) {
        tech.csm.securelms.security.UserPrincipal principal = 
            (authentication != null && authentication.getPrincipal() instanceof tech.csm.securelms.security.UserPrincipal) 
            ? (tech.csm.securelms.security.UserPrincipal) authentication.getPrincipal() 
            : null;
        return ResponseEntity.ok(ApiResponse.success("Role permissions fetched",
                rolePermissionService.getPermissionsForRole(id, principal)));
    }

    @PutMapping("/{id}/permissions")
    public ResponseEntity<ApiResponse<UserPermissionSaveSummaryResponse>> savePermissions(
            @PathVariable Long id,
            @Valid @RequestBody RolePermissionSaveRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Role permissions saved",
                rolePermissionService.savePermissions(id, request)));
    }

    @GetMapping("/permissions/list")
    @PreAuthorize("@permissionService.hasAnyPermission(authentication, '/admin/manage-links/role-master', '/admin/manage-links/permissions')")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<tech.csm.securelms.dto.response.PermissionListResponse>>> listPermissions(
            @RequestParam(required = false) String search,
            @org.springframework.data.web.PageableDefault(size = 10) org.springframework.data.domain.Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Permissions fetched", rolePermissionService.getPaginatedRolePermissions(search, pageable)));
    }

    @DeleteMapping("/permissions/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePermission(@PathVariable Long id) {
        rolePermissionService.deleteRolePermission(id);
        return ResponseEntity.ok(ApiResponse.success("Permission deleted"));
    }
}
