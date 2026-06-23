package tech.csm.securelms.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tech.csm.securelms.constants.RoleCodes;
import tech.csm.securelms.dto.response.*;
import tech.csm.securelms.enums.SecurityEventType;
import tech.csm.securelms.exception.BadRequestException;
import tech.csm.securelms.repository.CourseRepository;
import tech.csm.securelms.repository.EnrollmentRepository;
import tech.csm.securelms.security.UserPrincipal;
import tech.csm.securelms.service.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * Streams styled PDF exports for every data section in the dashboard.
 *
 * All endpoints: GET /api/export/{resource}/pdf
 *
 * "Export All" vs "Export Current View" is fully driven by which
 * query parameters the Angular frontend sends:
 * - "Export All" -> no filter params (tab param only for audit logs)
 * - "Export Current View" -> same filters currently active on screen
 *
 * Role guards (enforced via @PreAuthorize):
 * /users/pdf -> ADMIN only
 * /courses/pdf -> ADMIN + TRAINER (TRAINER scoped to own courses)
 * /modules/pdf -> ADMIN + TRAINER (TRAINER scoped to own courses)
 * /enrollments/pdf -> ADMIN + TRAINER (requires courseId; ownership enforced)
 * /audit-logs/pdf -> ADMIN only, tab-aware
 * /my-enrollments/pdf -> STUDENT only
 */
@RestController
@RequestMapping("/api/export")
@RequiredArgsConstructor
@Slf4j
public class ExportController {

    private final AdminService adminService;
    private final CourseService courseService;
    private final ModuleService moduleService;
    private final StudentService studentService;
    private final SecurityAuditService securityAuditService;
    private final PdfExportService pdfExportService;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository; // used only for lightweight trainer lookup
    //private final RoleMasterService roleMasterService;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final DateTimeFormatter DISPLAY_DT = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm");

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // 1. Users (ADMIN only)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Exports the user list as a PDF.
     * All params mirror GET /api/admin/users but without page/size.
     * Passing no params exports every user; passing filter params mirrors
     * "Export Current View".
     */
    @GetMapping("/users/pdf")
    @PreAuthorize("@permissionService.hasPermission(authentication)")
    public ResponseEntity<byte[]> exportUsersPdf(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) Boolean locked) {

        List<UserResponse> users = adminService.getAllUsers(principal, q, role, active, locked);

        String[] headers = {
                "#", "Username", "First Name", "Last Name",
                "Role", "Active", "Locked", "Created At"
        };

        AtomicInteger seq = new AtomicInteger(1);
        List<String[]> rows = users.stream()
                .map(u -> new String[] {
                        String.valueOf(seq.getAndIncrement()),
                        nullSafe(u.getUsername()),
                        nullSafe(u.getFirstName()),
                        nullSafe(u.getLastName()),
                        u.getRole() != null ? u.getRole() : "â€”",
                        u.isActive() ? "Yes" : "No",
                        u.isAccountNonLocked() ? "No" : "Yes", // inverted: nonLocked=true â†’ "No (not locked)"
                        formatDate(u.getCreatedAt())
                })
                .collect(Collectors.toList());

        return pdfResponse(
                pdfExportService.buildReport("User Report", headers, rows),
                "securelms_users_" + today() + ".pdf");
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // 2. Courses (ADMIN + TRAINER)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @GetMapping("/courses/pdf")
    @PreAuthorize("@permissionService.hasPermission(authentication)")
    public ResponseEntity<byte[]> exportCoursesPdf(
            @AuthenticationPrincipal UserPrincipal principal) {

        // getAllCourses() already scopes TRAINER to their own courses internally
        List<CourseResponse> courses = courseService.getAllCourses(principal.getId());

        String[] headers = {
                "#", "Title", "Category", "Difficulty",
                "Trainer", "Status", "Modules", "Enrollments", "Created At"
        };

        AtomicInteger seq = new AtomicInteger(1);
        List<String[]> rows = courses.stream()
                .map(c -> new String[] {
                        String.valueOf(seq.getAndIncrement()),
                        nullSafe(c.getTitle()),
                        nullSafe(c.getCategory()),
                        nullSafe(c.getDifficultyLevel()),
                        nullSafe(c.getCreatedByUsername()),
                        c.isPublished() ? "Published" : "Draft",
                        String.valueOf(c.getModuleCount()),
                        String.valueOf(c.getEnrollmentCount()),
                        formatDate(c.getCreatedAt())
                })
                .collect(Collectors.toList());

        String title = RoleCodes.ADMIN.equals(principal.getRole()) ? "All Courses Report" : "My Courses Report";
        String filename = "securelms_courses_" + today() + ".pdf";

        return pdfResponse(pdfExportService.buildReport(title, headers, rows), filename);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // 3. Modules (ADMIN + TRAINER)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * @param courseId optional â€” exports only that course's modules when provided;
     *                 otherwise exports all modules the requester can see.
     */
    @GetMapping("/modules/pdf")
    @PreAuthorize("@permissionService.hasPermission(authentication)")
    public ResponseEntity<byte[]> exportModulesPdf(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Long courseId) {

        List<ModuleResponse> modules;
        String title;

        if (courseId != null) {
            // FIX: correct method name is getModulesByCourse(), not getModules()
            modules = moduleService.getModulesByCourse(courseId, principal.getId());
            CourseResponse course = courseService.getCourseById(courseId, principal.getId());
            title = "Modules â€” " + course.getTitle();
        } else {
            // All courses visible to the requester â†’ flatten all their modules
            List<CourseResponse> courses = courseService.getAllCourses(principal.getId());
            modules = courses.stream()
                    .flatMap(c -> {
                        try {
                            return moduleService.getModulesByCourse(c.getId(), principal.getId()).stream();
                        } catch (Exception ignored) {
                            return java.util.stream.Stream.empty();
                        }
                    })
                    .collect(Collectors.toList());
            title = RoleCodes.ADMIN.equals(principal.getRole()) ? "All Modules Report" : "My Modules Report";
        }

        String[] headers = {
                "#", "Title", "Course", "Type", "Order", "Duration (min)", "Created At"
        };

        AtomicInteger seq = new AtomicInteger(1);
        List<String[]> rows = modules.stream()
                .map(m -> new String[] {
                        String.valueOf(seq.getAndIncrement()),
                        nullSafe(m.getTitle()),
                        nullSafe(m.getCourseTitle()),
                        nullSafe(m.getModuleType()),
                        m.getOrderIndex() != null ? String.valueOf(m.getOrderIndex()) : "â€”",
                        m.getDurationMinutes() != null ? String.valueOf(m.getDurationMinutes()) : "â€”",
                        formatDate(m.getCreatedAt())
                })
                .collect(Collectors.toList());

        return pdfResponse(
                pdfExportService.buildReport(title, headers, rows),
                "securelms_modules_" + today() + ".pdf");
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // 4. Enrollments (ADMIN + TRAINER)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * courseId is required â€” enrollments are always scoped to a course,
     * consistent with the UI which also requires a course selection.
     */
    @GetMapping("/enrollments/pdf")
    @PreAuthorize("@permissionService.hasPermission(authentication)")
    public ResponseEntity<byte[]> exportEnrollmentsPdf(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Long courseId) {

        if (courseId == null) {
            throw new BadRequestException("Please select a course before exporting enrollments.");
        }

        // Ownership guard: validateCourseAccess is called internally by getCourseById.
        // A TRAINER who does not own the course will get UnauthorizedException here.
        CourseResponse course = courseService.getCourseById(courseId, principal.getId());

        List<EnrollmentResponse> enrollments = enrollmentRepository
                .findByCourse_IdAndActiveTrue(courseId)
                .stream()
                .map(e -> {
                    int total = e.getCourse().getModules() != null
                            ? (int) e.getCourse().getModules().stream()
                                    .filter(tech.csm.securelms.entity.CourseModule::isActive).count()
                            : 0;
                    int completed = e.getCompletedModuleIds() != null
                            ? e.getCompletedModuleIds().size()
                            : 0;
                    return EnrollmentResponse.builder()
                            .id(e.getId())
                            .studentId(e.getStudent().getId())
                            .studentUsername(e.getStudent().getUsername())
                            .courseId(e.getCourse().getId())
                            .courseTitle(e.getCourse().getTitle())
                            .progressPercent(e.getProgressPercent())
                            .completedModuleCount(completed)
                            .totalModuleCount(total)
                            .active(e.isActive())
                            .enrolledAt(e.getEnrolledAt())
                            .completedAt(e.getCompletedAt())
                            .build();
                })
                .collect(Collectors.toList());

        String[] headers = {
                "#", "Student", "Progress (%)", "Modules Done",
                "Total Modules", "Status", "Enrolled At", "Completed At"
        };

        AtomicInteger seq = new AtomicInteger(1);
        List<String[]> rows = enrollments.stream()
                .map(e -> new String[] {
                        String.valueOf(seq.getAndIncrement()),
                        nullSafe(e.getStudentUsername()),
                        String.valueOf(e.getProgressPercent() != null ? e.getProgressPercent() : 0),
                        String.valueOf(e.getCompletedModuleCount() != null ? e.getCompletedModuleCount() : 0),
                        String.valueOf(e.getTotalModuleCount() != null ? e.getTotalModuleCount() : 0),
                        e.getCompletedAt() != null ? "Completed" : "In Progress",
                        formatDate(e.getEnrolledAt()),
                        e.getCompletedAt() != null ? formatDate(e.getCompletedAt()) : "â€”"
                })
                .collect(Collectors.toList());

        String title = "Enrollments â€” " + course.getTitle();
        String filename = "securelms_enrollments_course" + courseId + "_" + today() + ".pdf";

        return pdfResponse(pdfExportService.buildReport(title, headers, rows), filename);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // 5. Audit Logs (ADMIN only, tab-aware)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /**
     * Tab-aware audit log export.
     *
     * @param tab "registrations" | "logins" | "all" â€” mirrors auditTab in Angular.
     *
     *            "Export All" -> Angular sends only the tab param.
     *            "Export Current View" -> Angular sends tab + all currently active
     *            filter values.
     */
    @GetMapping("/audit-logs/pdf")
    @PreAuthorize("@permissionService.hasPermission(authentication)")
    public ResponseEntity<byte[]> exportAuditLogsPdf(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "all") String tab,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String outcome,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        List<SecurityEventType> scopedTypes = resolveScopedTypes(tab);
        SecurityEventType parsedType = parseEventType(eventType);

        List<SecurityAuditLogResponse> logs = securityAuditService
                .getAllSecurityEventsForExport(
                        scopedTypes, parsedType, outcome, role, null, q, fromDate, toDate, principal);

        String[] headers = {
                "#", "Full Name", "Username", "Email",
                "Role", "Event", "Outcome", "IP Address", "Browser", "Date & Time"
        };

        AtomicInteger seq = new AtomicInteger(1);
        List<String[]> rows = logs.stream()
                .map(l -> new String[] {
                        String.valueOf(seq.getAndIncrement()),
                        nullSafe(l.getFullName()),
                        nullSafe(l.getUsername()),
                        nullSafe(l.getEmail()),
                        nullSafe(l.getRole()),
                        l.getEventType() != null ? l.getEventType().name() : "â€”",
                        nullSafe(l.getOutcome()),
                        normaliseIp(l.getIpAddress()),
                        nullSafe(l.getBrowser()),
                        formatDateTime(l.getCreatedAt())
                })
                .collect(Collectors.toList());

        String title = "Audit Log â€” " + resolveTabLabel(tab);
        String filename = "securelms_audit_" + tab + "_" + today() + ".pdf";

        return pdfResponse(pdfExportService.buildReport(title, headers, rows), filename);
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // 6. My Enrollments (STUDENT only)
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    @GetMapping("/my-enrollments/pdf")
    @PreAuthorize("@permissionService.hasPermission(authentication)")
    public ResponseEntity<byte[]> exportMyEnrollmentsPdf(
            @AuthenticationPrincipal UserPrincipal principal) {

        List<EnrollmentResponse> enrollments = studentService.getMyEnrollments(principal.getId());

        String[] headers = {
                "#", "Course", "Trainer", "Progress (%)",
                "Modules Done", "Total Modules", "Status", "Enrolled At", "Completed At"
        };

        AtomicInteger seq = new AtomicInteger(1);
        List<String[]> rows = enrollments.stream()
                .map(e -> new String[] {
                        String.valueOf(seq.getAndIncrement()),
                        nullSafe(e.getCourseTitle()),
                        // FIX: resolve trainer directly from CourseRepository to avoid
                        // getCourseById(id, null) which throws on null requesterId.
                        resolveTrainerUsername(e.getCourseId()),
                        String.valueOf(e.getProgressPercent() != null ? e.getProgressPercent() : 0),
                        String.valueOf(e.getCompletedModuleCount() != null ? e.getCompletedModuleCount() : 0),
                        String.valueOf(e.getTotalModuleCount() != null ? e.getTotalModuleCount() : 0),
                        e.getCompletedAt() != null ? "Completed" : "In Progress",
                        formatDate(e.getEnrolledAt()),
                        e.getCompletedAt() != null ? formatDate(e.getCompletedAt()) : "â€”"
                })
                .collect(Collectors.toList());

        return pdfResponse(
                pdfExportService.buildReport("My Learning Progress", headers, rows),
                "securelms_my_progress_" + today() + ".pdf");
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Shared helpers
    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    /** Wraps PDF bytes as an attachment download response. */
    private ResponseEntity<byte[]> pdfResponse(byte[] bytes, String filename) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(
                ContentDisposition.attachment().filename(filename).build());
        headers.setContentLength(bytes.length);
        return ResponseEntity.ok().headers(headers).body(bytes);
    }

    /**
     * Maps the Angular "tab" string to a SecurityEventType scope list.
     * Returning null means "no event-type restriction" (the All Events tab).
     */
    private List<SecurityEventType> resolveScopedTypes(String tab) {
        if (tab == null)
            return null;
        return switch (tab.toLowerCase(Locale.ROOT)) {
            case "registrations" -> List.of(SecurityEventType.USER_REGISTERED);
            case "logins" -> List.of(SecurityEventType.LOGIN_SUCCESS,
                    SecurityEventType.LOGIN_FAILED,
                    SecurityEventType.LOGOUT);
            default -> null;
        };
    }

    private String resolveTabLabel(String tab) {
        if (tab == null)
            return "All Events";
        return switch (tab.toLowerCase(Locale.ROOT)) {
            case "registrations" -> "Registrations";
            case "logins" -> "Login Activity";
            default -> "All Events";
        };
    }

    private SecurityEventType parseEventType(String et) {
        if (et == null || et.isBlank())
            return null;
        try {
            return SecurityEventType.valueOf(et.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /** Normalises IPv6 loopback variants to the readable string "localhost". */
    private String normaliseIp(String ip) {
        if (ip == null)
            return "â€”";
        if (ip.equals("0:0:0:0:0:0:0:1") || ip.equals("::1"))
            return "localhost";
        if (ip.startsWith("::ffff:"))
            return ip.substring(7);
        return ip;
    }

    /**
     * Resolves the trainer (createdBy) username for a course.
     *
     * FIX: Uses CourseRepository directly instead of CourseService.getCourseById(),
     * because getCourseById() requires a non-null requesterId and would throw
     * ResourceNotFoundException when null is passed (which was the original bug
     * in the student my-enrollments export).
     */
    private String resolveTrainerUsername(Long courseId) {
        if (courseId == null)
            return "â€”";
        return courseRepository.findById(courseId)
                .map(c -> c.getCreatedBy() != null ? nullSafe(c.getCreatedBy().getUsername()) : "â€”")
                .orElse("â€”");
    }

    private String nullSafe(String v) {
        return (v != null && !v.isBlank()) ? v : "â€”";
    }

    private String today() {
        return LocalDate.now().format(DATE_FMT);
    }

    private String formatDate(java.time.LocalDateTime ldt) {
        if (ldt == null)
            return "â€”";
        return ldt.toLocalDate().format(DISPLAY_DATE);
    }

    private String formatDateTime(java.time.LocalDateTime ldt) {
        if (ldt == null)
            return "â€”";
        return ldt.format(DISPLAY_DT);
    }
}
