package tech.csm.securelms.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tech.csm.securelms.dto.request.UserPermissionSaveRequest;
import tech.csm.securelms.dto.response.ApiResponse;
import tech.csm.securelms.dto.response.UserPermissionByUserResponse;
import tech.csm.securelms.dto.response.UserPermissionSaveSummaryResponse;
import tech.csm.securelms.dto.response.UserPermissionUserOptionResponse;
import tech.csm.securelms.service.UserPermissionService;

import java.util.List;

@RestController
@RequestMapping("/api/user-permissions")
@RequiredArgsConstructor
public class UserPermissionController {

    private final UserPermissionService userPermissionService;

    @GetMapping("/{userId}")
    public ResponseEntity<ApiResponse<UserPermissionByUserResponse>> getByUser(
            @PathVariable Long userId,
            org.springframework.security.core.Authentication authentication) {
        tech.csm.securelms.security.UserPrincipal principal = 
            (authentication != null && authentication.getPrincipal() instanceof tech.csm.securelms.security.UserPrincipal) 
            ? (tech.csm.securelms.security.UserPrincipal) authentication.getPrincipal() 
            : null;
        return ResponseEntity.ok(ApiResponse.success(
                "User permissions fetched",
                userPermissionService.getPermissionsForUser(userId, principal)));
    }

    @PostMapping("/save")
    public ResponseEntity<ApiResponse<UserPermissionSaveSummaryResponse>> save(
            @Valid @RequestBody UserPermissionSaveRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "User permissions saved",
                userPermissionService.savePermissions(request)));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserPermissionUserOptionResponse>>> listUsers(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) List<Long> groupIds,
            @RequestParam(required = false) List<Long> roleIds,
            org.springframework.security.core.Authentication authentication) {
        tech.csm.securelms.security.UserPrincipal principal = 
            (authentication != null && authentication.getPrincipal() instanceof tech.csm.securelms.security.UserPrincipal) 
            ? (tech.csm.securelms.security.UserPrincipal) authentication.getPrincipal() 
            : null;
        return ResponseEntity.ok(ApiResponse.success(
                "Users fetched",
                userPermissionService.listUsers(q, groupIds, roleIds, principal)));
    }

    @GetMapping("/list")
    public ResponseEntity<ApiResponse<org.springframework.data.domain.Page<tech.csm.securelms.dto.response.PermissionListResponse>>> listPermissions(
            @RequestParam(required = false) String search,
            @org.springframework.data.web.PageableDefault(size = 10) org.springframework.data.domain.Pageable pageable,
            org.springframework.security.core.Authentication authentication) {
        tech.csm.securelms.security.UserPrincipal principal = 
            (authentication != null && authentication.getPrincipal() instanceof tech.csm.securelms.security.UserPrincipal) 
            ? (tech.csm.securelms.security.UserPrincipal) authentication.getPrincipal() 
            : null;
        return ResponseEntity.ok(ApiResponse.success("Permissions fetched", userPermissionService.getPaginatedUserPermissions(search, pageable, principal)));
    }

    @org.springframework.web.bind.annotation.DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePermission(@PathVariable Long id) {
        userPermissionService.deleteUserPermission(id);
        return ResponseEntity.ok(ApiResponse.success("Permission deleted"));
    }
}

