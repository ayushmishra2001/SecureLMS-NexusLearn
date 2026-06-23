package tech.csm.securelms.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tech.csm.securelms.dto.request.GroupMasterRequest;
import tech.csm.securelms.dto.request.GroupPermissionSaveRequest;
import tech.csm.securelms.dto.response.ApiResponse;
import tech.csm.securelms.dto.response.GroupMasterResponse;
import tech.csm.securelms.dto.response.GroupPermissionResponse;
import tech.csm.securelms.dto.response.UserPermissionSaveSummaryResponse;
import tech.csm.securelms.service.GroupMasterService;
import tech.csm.securelms.service.GroupPermissionService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/groups")
@PreAuthorize("@permissionService.hasPermission(authentication)")
@RequiredArgsConstructor
public class GroupMasterController {

    private final GroupMasterService groupMasterService;
    private final GroupPermissionService groupPermissionService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<GroupMasterResponse>>> list() {
        return ResponseEntity.ok(ApiResponse.success("Groups fetched", groupMasterService.list()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GroupMasterResponse>> get(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Group fetched", groupMasterService.get(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<GroupMasterResponse>> create(@Valid @RequestBody GroupMasterRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Group created", groupMasterService.create(request)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<GroupMasterResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody GroupMasterRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Group updated", groupMasterService.update(id, request)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<GroupMasterResponse>> setActive(
            @PathVariable Long id,
            @RequestBody Map<String, Boolean> request) {
        boolean active = request.getOrDefault("active", true);
        return ResponseEntity.ok(ApiResponse.success("Group status updated", groupMasterService.setActive(id, active)));
    }

    @PostMapping("/{id}/users")
    public ResponseEntity<ApiResponse<Void>> assignUsers(
            @PathVariable Long id,
            @RequestBody tech.csm.securelms.dto.request.GroupUserAssignRequest request) {
        groupMasterService.assignUsersToGroup(id, request.getUserIds());
        return ResponseEntity.ok(ApiResponse.success("Users assigned successfully"));
    }

    @GetMapping("/{id}/permissions")
    public ResponseEntity<ApiResponse<GroupPermissionResponse>> getPermissions(
            @PathVariable Long id,
            org.springframework.security.core.Authentication authentication) {
        tech.csm.securelms.security.UserPrincipal principal = 
            (authentication != null && authentication.getPrincipal() instanceof tech.csm.securelms.security.UserPrincipal) 
            ? (tech.csm.securelms.security.UserPrincipal) authentication.getPrincipal() 
            : null;
        return ResponseEntity.ok(ApiResponse.success("Group permissions fetched",
                groupPermissionService.getPermissionsForGroup(id, principal)));
    }

    @PutMapping("/{id}/permissions")
    public ResponseEntity<ApiResponse<UserPermissionSaveSummaryResponse>> savePermissions(
            @PathVariable Long id,
            @Valid @RequestBody GroupPermissionSaveRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Group permissions saved",
                groupPermissionService.savePermissions(id, request)));
    }

    @GetMapping("/permissions/list")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<tech.csm.securelms.dto.response.PermissionListResponse>>> listPermissions(
            @RequestParam(required = false) String search,
            @org.springframework.data.web.PageableDefault(size = 10) org.springframework.data.domain.Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Permissions fetched", groupPermissionService.getPaginatedGroupPermissions(search, pageable)));
    }

    @DeleteMapping("/permissions/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePermission(@PathVariable Long id) {
        groupPermissionService.deleteGroupPermission(id);
        return ResponseEntity.ok(ApiResponse.success("Permission deleted"));
    }
}
