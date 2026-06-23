package tech.csm.securelms.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tech.csm.securelms.dto.request.AdminUserCreateRequest;
import tech.csm.securelms.dto.request.CourseRequest;
import tech.csm.securelms.dto.request.ModuleRequest;
import tech.csm.securelms.dto.request.UserUpdateRequest;
import tech.csm.securelms.dto.response.*;
import tech.csm.securelms.enums.SecurityEventType;
import tech.csm.securelms.security.UserPrincipal;
import tech.csm.securelms.service.AdminService;
import tech.csm.securelms.service.CourseService;
import tech.csm.securelms.service.ModuleService;
import tech.csm.securelms.service.SecurityAuditService;
import org.springframework.transaction.annotation.Transactional;

import tech.csm.securelms.repository.EnrollmentRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("@permissionService.hasPermission(authentication)")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final CourseService courseService;
    private final ModuleService moduleService;
    private final SecurityAuditService securityAuditService;
    private final EnrollmentRepository enrollmentRepository;

    // --- User Management --------------------------------------------
    @GetMapping("/users")
    public ResponseEntity<ApiResponse<?>> getAllUsers(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Boolean locked,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (page == null || size == null) {
            return ResponseEntity.ok(ApiResponse.success("Users fetched",
                    adminService.getAllUsers(principal, q, role, active, locked)));
        }
        return ResponseEntity.ok(ApiResponse.success("Users fetched",
                adminService.getAllUsers(principal, page, size, q, role, active, locked)));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> getUserById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("User fetched", adminService.getUserById(id, principal)));
    }

    @PostMapping("/users")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(
            @Valid @RequestBody AdminUserCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("User created", adminService.createUser(request, principal)));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserResponse>> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("User updated", adminService.updateUser(id, request, principal)));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        adminService.deleteUser(id, principal.getId(), principal);
        return ResponseEntity.ok(ApiResponse.success("User deleted"));
    }

    @PatchMapping("/users/{id}/toggle-lock")
    public ResponseEntity<ApiResponse<Void>> toggleUserLock(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        adminService.toggleUserLock(id, principal.getId(), principal);
        return ResponseEntity.ok(ApiResponse.success("User lock status toggled"));
    }

    @PatchMapping("/users/{id}/toggle-active")
    public ResponseEntity<ApiResponse<Void>> toggleUserActive(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        adminService.toggleUserActive(id, principal.getId(), principal);
        return ResponseEntity.ok(ApiResponse.success("User active status toggled"));
    }

    // --- Audit Logs (unified endpoint with tab support) ---
    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<PageResponse<SecurityAuditLogResponse>>> getAuditLogs(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "all") String tab,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String outcome,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        List<SecurityEventType> eventTypes = null;

        // Map tab to event types
        if ("registrations".equalsIgnoreCase(tab)) {
            eventTypes = List.of(SecurityEventType.USER_REGISTERED);
        } else if ("logins".equalsIgnoreCase(tab)) {
            eventTypes = List.of(SecurityEventType.LOGIN_SUCCESS, SecurityEventType.LOGIN_FAILED,
                    SecurityEventType.LOGOUT);
        }
        // For "all" tab or any other value, eventTypes remains null (no filter)

        return ResponseEntity.ok(ApiResponse.success(
                "Audit logs fetched",
                securityAuditService.getSecurityEvents(
                        page,
                        size,
                        eventTypes,
                        parseSecurityEventType(eventType),
                        outcome,
                        role,
                        userId,
                        q,
                        fromDate,
                        toDate,
                        principal)));
    }

    @GetMapping("/security-events")
    public ResponseEntity<ApiResponse<PageResponse<SecurityAuditLogResponse>>> getSecurityEvents(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String outcome,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.success(
                "Security events fetched",
                securityAuditService.getSecurityEvents(
                        page,
                        size,
                        null,
                        parseSecurityEventType(eventType),
                        outcome,
                        role,
                        userId,
                        q,
                        fromDate,
                        toDate,
                        principal)));
    }

    // NEW - only registrations
    @GetMapping("/security-events/registrations")
    public ResponseEntity<ApiResponse<PageResponse<SecurityAuditLogResponse>>> getRegistrationEvents(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String outcome,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.success("Registration events fetched",
                securityAuditService.getSecurityEvents(
                        page,
                        size,
                        List.of(SecurityEventType.USER_REGISTERED),
                        parseSecurityEventType(eventType),
                        outcome,
                        role,
                        userId,
                        q,
                        fromDate,
                        toDate,
                        principal)));
    }

    // NEW - only login activity
    @GetMapping("/security-events/logins")
    public ResponseEntity<ApiResponse<PageResponse<SecurityAuditLogResponse>>> getLoginEvents(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String outcome,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.success("Login events fetched",
                securityAuditService.getSecurityEvents(
                        page,
                        size,
                        List.of(SecurityEventType.LOGIN_SUCCESS, SecurityEventType.LOGIN_FAILED,
                                SecurityEventType.LOGOUT),
                        parseSecurityEventType(eventType),
                        outcome,
                        role,
                        userId,
                        q,
                        fromDate,
                        toDate,
                        principal)));
    }

    // NEW - specific user's full audit trail
    @GetMapping("/users/{userId}/audit")
    public ResponseEntity<ApiResponse<PageResponse<SecurityAuditLogResponse>>> getUserAudit(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String outcome,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        return ResponseEntity.ok(ApiResponse.success("User audit events fetched",
                securityAuditService.getSecurityEvents(
                        page,
                        size,
                        null,
                        parseSecurityEventType(eventType),
                        outcome,
                        role,
                        userId,
                        q,
                        fromDate,
                        toDate,
                        principal)));
    }

    private SecurityEventType parseSecurityEventType(String eventType) {
        if (eventType == null || eventType.isBlank()) {
            return null;
        }
        try {
            return SecurityEventType.valueOf(eventType.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    // --- Course Management ------------------------------------------
    @PostMapping("/courses")
    public ResponseEntity<ApiResponse<CourseResponse>> createCourse(
            @Valid @RequestBody CourseRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Course created",
                courseService.createCourse(request, principal.getId())));
    }

    @GetMapping("/courses")
    public ResponseEntity<ApiResponse<List<CourseResponse>>> getAllCourses(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Courses fetched",
                courseService.getAllCourses(principal.getId())));
    }

    @GetMapping("/courses/{id}")
    public ResponseEntity<ApiResponse<CourseResponse>> getCourse(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Course fetched",
                courseService.getCourseById(id, principal.getId())));
    }

    @PutMapping("/courses/{id}")
    public ResponseEntity<ApiResponse<CourseResponse>> updateCourse(
            @PathVariable Long id,
            @Valid @RequestBody CourseRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Course updated",
                courseService.updateCourse(id, request, principal.getId())));
    }

    @DeleteMapping("/courses/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCourse(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        courseService.deleteCourse(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Course deleted"));
    }

    // --- Module Management ------------------------------------------
    @PostMapping("/modules")
    public ResponseEntity<ApiResponse<ModuleResponse>> createModule(
            @Valid @RequestBody ModuleRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Module created",
                moduleService.createModule(request, principal.getId())));
    }

    @GetMapping("/courses/{courseId}/modules")
    public ResponseEntity<ApiResponse<List<ModuleResponse>>> getModules(
            @PathVariable Long courseId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Modules fetched",
                moduleService.getModulesByCourse(courseId, principal.getId())));
    }

    @PutMapping("/modules/{id}")
    public ResponseEntity<ApiResponse<ModuleResponse>> updateModule(
            @PathVariable Long id,
            @Valid @RequestBody ModuleRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Module updated",
                moduleService.updateModule(id, request, principal.getId())));
    }

    @DeleteMapping("/modules/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteModule(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        moduleService.deleteModule(id, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Module deleted"));
    }

    // --- Enrolled Students ------------------------------------------
    @GetMapping("/courses/{courseId}/enrollments")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getCourseEnrollments(
            @PathVariable Long courseId,
            @AuthenticationPrincipal UserPrincipal principal) {

        courseService.getCourseById(courseId, principal.getId());

        // List<EnrollmentResponse> enrollments = enrollmentRepository
        // .findByCourse_IdAndActiveTrue(courseId)
        // .stream()
        // .map(e -> {
        // //int totalModules = e.getCourse().getModules() != null ?
        // e.getCourse().getModules().size() : 0;
        // int totalModules = e.getCourse().getModules() != null ?
        // e.getCourse().getModules().size() : 0;

        // int completedModules = e.getCompletedModuleIds() != null ?
        // e.getCompletedModuleIds().size() : 0;
        // return EnrollmentResponse.builder()
        // .id(e.getId())
        // .studentId(e.getStudent().getId())
        // .studentUsername(e.getStudent().getUsername())
        // .courseId(e.getCourse().getId())
        // .courseTitle(e.getCourse().getTitle())
        // .progressPercent(e.getProgressPercent())
        // .completedModuleCount(completedModules)
        // .totalModuleCount(totalModules)
        // .active(e.isActive())
        // .enrolledAt(e.getEnrolledAt())
        // .completedAt(e.getCompletedAt())
        // .completedModuleIds(e.getCompletedModuleIds())
        // .build();
        // })
        // .collect(Collectors.toList());
        // AFTER
        List<EnrollmentResponse> enrollments = enrollmentRepository
                .findByCourse_IdAndActiveTrue(courseId)
                .stream()
                .map(e -> {
                    int totalModules = e.getCourse().getModules() != null
                            ? (int) e.getCourse().getModules().stream().filter(m -> m.isActive()).count()
                            : 0;
                    int completedModules = e.getCompletedModuleIds() != null ? e.getCompletedModuleIds().size() : 0;
                    return EnrollmentResponse.builder()
                            .id(e.getId())
                            .studentId(e.getStudent().getId())
                            .studentUsername(e.getStudent().getUsername())
                            .courseId(e.getCourse().getId())
                            .courseTitle(e.getCourse().getTitle())
                            .progressPercent(e.getProgressPercent())
                            .completedModuleCount(completedModules)
                            .totalModuleCount(totalModules)
                            .active(e.isActive())
                            .enrolledAt(e.getEnrolledAt())
                            .completedAt(e.getCompletedAt())
                            .completedModuleIds(e.getCompletedModuleIds())
                            .build();
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("Enrollments fetched", enrollments));
    }

    @GetMapping("/users/{userId}/enrollments")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getUserEnrollments(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserPrincipal principal) {

        adminService.getUserById(userId, principal);

        // List<EnrollmentResponse> enrollments = enrollmentRepository
        // .findByStudent_IdAndActiveTrue(userId)
        // .stream()
        // .map(e -> {
        // int totalModules = e.getCourse().getModules() != null ?
        // e.getCourse().getModules().size() : 0;
        // int completedModules = e.getCompletedModuleIds() != null ?
        // e.getCompletedModuleIds().size() : 0;
        // return EnrollmentResponse.builder()
        // .id(e.getId())
        // .studentId(e.getStudent().getId())
        // .studentUsername(e.getStudent().getUsername())
        // .courseId(e.getCourse().getId())
        // .courseTitle(e.getCourse().getTitle())
        // .progressPercent(e.getProgressPercent())
        // .completedModuleCount(completedModules)
        // .totalModuleCount(totalModules)
        // .active(e.isActive())
        // .enrolledAt(e.getEnrolledAt())
        // .completedAt(e.getCompletedAt())
        // .completedModuleIds(e.getCompletedModuleIds())
        // .build();
        // })
        // .collect(Collectors.toList());
        // AFTER
        List<EnrollmentResponse> enrollments = enrollmentRepository
                .findByStudent_IdAndActiveTrue(userId)
                .stream()
                .map(e -> {
                    int totalModules = e.getCourse().getModules() != null
                            ? (int) e.getCourse().getModules().stream().filter(m -> m.isActive()).count()
                            : 0;
                    int completedModules = e.getCompletedModuleIds() != null ? e.getCompletedModuleIds().size() : 0;
                    return EnrollmentResponse.builder()
                            .id(e.getId())
                            .studentId(e.getStudent().getId())
                            .studentUsername(e.getStudent().getUsername())
                            .courseId(e.getCourse().getId())
                            .courseTitle(e.getCourse().getTitle())
                            .progressPercent(e.getProgressPercent())
                            .completedModuleCount(completedModules)
                            .totalModuleCount(totalModules)
                            .active(e.isActive())
                            .enrolledAt(e.getEnrolledAt())
                            .completedAt(e.getCompletedAt())
                            .completedModuleIds(e.getCompletedModuleIds())
                            .build();
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("User enrollments fetched", enrollments));
    }
}
