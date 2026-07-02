package tech.csm.securelms.controller;

import jakarta.servlet.http.HttpServletRequest;
//import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import tech.csm.securelms.dto.request.LoginRequest;
import tech.csm.securelms.dto.request.PasswordChangeRequest;
import tech.csm.securelms.dto.request.PasswordResetConfirmRequest;
import tech.csm.securelms.dto.request.PasswordResetRequest;
import tech.csm.securelms.dto.request.RegisterRequest;
import tech.csm.securelms.dto.request.UpdateProfileRequest;
import tech.csm.securelms.dto.request.VerifyOtpRequest;
import tech.csm.securelms.dto.response.ApiResponse;
import tech.csm.securelms.dto.response.AuthResponse;
import tech.csm.securelms.dto.response.PasswordExpiryStatusResponse;
import tech.csm.securelms.dto.response.RoleMasterResponse;
import tech.csm.securelms.dto.response.UserResponse;
import tech.csm.securelms.security.UserPrincipal;
import tech.csm.securelms.service.AesEncryptionService;
import tech.csm.securelms.service.AuthService;
import tech.csm.securelms.service.PasswordResetRateLimitService;
import tech.csm.securelms.service.RoleMasterService;
import tech.csm.securelms.service.GroupMasterService;
import tech.csm.securelms.dto.response.GroupMasterResponse;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final AesEncryptionService aesEncryptionService;
    private final PasswordResetRateLimitService passwordResetRateLimitService;
    private final RoleMasterService roleMasterService;
    private final GroupMasterService groupMasterService;
    private final tech.csm.securelms.repository.GroupMasterRepository groupMasterRepository;

    @GetMapping("/groups")
    public ResponseEntity<ApiResponse<List<GroupMasterResponse>>> getPublicGroups() {
        // Return active groups for public registration
        return ResponseEntity.ok(ApiResponse.success("Groups fetched",
                groupMasterService.list().stream().filter(GroupMasterResponse::isActive).toList()));
    }

    @GetMapping("/registration-roles")
    public ResponseEntity<ApiResponse<List<RoleMasterResponse>>> getRegistrationRoles() {
        tech.csm.securelms.entity.GroupMaster pendingGroup = groupMasterRepository.findByGroupName("Pending Users")
                .orElseThrow(() -> new RuntimeException("Pending Users group not found"));
        return ResponseEntity.ok(ApiResponse.success("Roles fetched",
                roleMasterService.getRolesForGroup(pendingGroup.getId())));
    }

    @GetMapping("/roles")
    public ResponseEntity<ApiResponse<List<RoleMasterResponse>>> getAssignableRoles(
            @RequestParam(required = false) Long groupId) {
        
        List<RoleMasterResponse> roles;
        if (groupId != null) {
            // we should ideally add a method to RoleMasterService, but we can just map it here or fetch via service.
            // For now, let's use list(includeInactive, assignableOnly, UserPrincipal) but since it's public, we don't have UserPrincipal.
            // Wait, we can add a public method in RoleMasterService.
            roles = roleMasterService.getRolesForGroup(groupId);
        } else {
            // none group
            roles = roleMasterService.getRolesForNoneGroup();
        }
        return ResponseEntity.ok(ApiResponse.success("Roles fetched", roles));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        authService.register(request, httpRequest);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Registration successful! Please log in."));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            HttpServletRequest httpRequest,
            @Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/otp-request")
    public ResponseEntity<ApiResponse<AuthResponse>> requestOtp(
            HttpServletRequest httpRequest,
            @RequestBody java.util.Map<String, String> request) {
        String identifier = request.get("identifier");
        if (identifier == null || identifier.isBlank()) {
            throw new org.springframework.security.authentication.BadCredentialsException("Identifier is required");
        }
        AuthResponse response = authService.requestOtp(identifier, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("OTP sent successfully", response));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyOtp(
            HttpServletRequest httpRequest,
            @Valid @RequestBody VerifyOtpRequest request) {
        AuthResponse response = authService.verifyOtp(request.getPreAuthToken(), request.getOtp(), httpRequest);
        return ResponseEntity.ok(ApiResponse.success("Login successful", response));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            HttpServletRequest request,
            Authentication authentication) {
        try {
            authService.logLogout(authentication, request);
        } catch (Exception ex) {
            log.error("Failed to write LOGOUT audit event", ex);
        }

        try {
            if (request.getSession(false) != null) {
                request.getSession().removeAttribute(org.springframework.security.web.context.HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY);
                request.getSession().invalidate();
            }
        } catch (IllegalStateException ex) {
            log.debug("Session already invalidated during logout");
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<Map<String, Object>>> me(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Not authenticated"));
        }
        return ResponseEntity.ok(ApiResponse.success("User info", Map.of(
                "id", principal.getId(),
                "username", principal.getUsername(),
                "encryptedEmail", aesEncryptionService.encrypt(principal.getEmail()),
                "role", principal.getRole(),
                "roleId", principal.getRoleId(),
                "roleName", principal.getRoleName())));
    }

    @GetMapping("/password-expiry-status")
    public ResponseEntity<ApiResponse<PasswordExpiryStatusResponse>> getPasswordExpiryStatus(
            @AuthenticationPrincipal UserPrincipal principal) {

        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Not authenticated"));
        }

        return ResponseEntity.ok(ApiResponse.success(
                "Password expiry status",
                authService.getPasswordExpiryStatus(principal.getId())));
    }

    // @GetMapping("/session")
    // public ResponseEntity<ApiResponse<AuthResponse>> session(
    // @AuthenticationPrincipal UserPrincipal principal) {
    // if (principal == null) {
    // return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
    // .body(ApiResponse.error("Not authenticated"));
    // }
    // AuthResponse response = AuthResponse.builder()
    // .userId(principal.getId())
    // .username(principal.getUsername())
    // .email(principal.getEmail())
    // .role(principal.getRole())
    // .build();
    // return ResponseEntity.ok(ApiResponse.success("Session retrieved", response));
    // }
    // Replace the existing session() method
    @GetMapping("/session")
    public ResponseEntity<ApiResponse<AuthResponse>> session(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Not authenticated"));
        }
        // Fetch fresh from DB for latest profile/session state
        AuthResponse response = authService.getSession(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Session retrieved", response));
    }

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> getProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Not authenticated"));
        }
        UserResponse profile = authService.getUserProfile(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Profile retrieved", profile));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdateProfileRequest request) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Not authenticated"));
        }
        UserResponse updated = authService.updateUserProfile(principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", updated));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(
            HttpServletRequest httpRequest,
            @Valid @RequestBody PasswordResetRequest request) {
        passwordResetRateLimitService.enforceForgotPasswordLimit(resolveClientIp(httpRequest), request.getEmail());
        authService.requestPasswordReset(request);
        return ResponseEntity.ok(ApiResponse.success(
                "If the email exists, a password reset link has been sent. Check your inbox."));
    }

    @GetMapping("/reset-password/validate")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> validateResetToken(
            HttpServletRequest httpRequest,
            @RequestParam("token") String token) {
        passwordResetRateLimitService.enforceValidateTokenLimit(resolveClientIp(httpRequest), token);
        boolean valid = StringUtils.hasText(token) && authService.isPasswordResetTokenValid(token);
        return ResponseEntity.ok(ApiResponse.success("Token validation completed", Map.of("valid", valid)));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            HttpServletRequest httpRequest,
            @Valid @RequestBody PasswordResetConfirmRequest request) {
        passwordResetRateLimitService.enforceResetPasswordLimit(resolveClientIp(httpRequest), request.getToken());
        authService.resetPassword(request, resolveClientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Password has been reset successfully"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            HttpServletRequest httpRequest,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody PasswordChangeRequest request) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Not authenticated"));
        }
        authService.changePassword(principal.getId(), request, resolveClientIp(httpRequest));
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully"));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (StringUtils.hasText(forwardedFor)) {
            return forwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (StringUtils.hasText(realIp)) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
