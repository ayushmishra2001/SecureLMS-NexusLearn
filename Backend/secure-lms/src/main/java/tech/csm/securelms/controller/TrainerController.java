package tech.csm.securelms.controller;

// import jakarta.persistence.EntityManager;
// import jakarta.persistence.Query;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import tech.csm.securelms.dto.request.CourseRequest;
import tech.csm.securelms.dto.request.ModuleRequest;
import tech.csm.securelms.dto.response.*;
// import tech.csm.securelms.entity.Course;
// import tech.csm.securelms.entity.Enrollment;
import tech.csm.securelms.repository.EnrollmentRepository;
import tech.csm.securelms.security.UserPrincipal;
import tech.csm.securelms.service.CourseService;
import tech.csm.securelms.service.ModuleService;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/trainer")
@PreAuthorize("@permissionService.hasPermission(authentication)")
@RequiredArgsConstructor
public class TrainerController {

        private final CourseService courseService;
        private final ModuleService moduleService;
        private final EnrollmentRepository enrollmentRepository;

        // --- Courses ----------------------------------------------
        @PostMapping("/courses")
        public ResponseEntity<ApiResponse<CourseResponse>> createCourse(
                        @Valid @RequestBody CourseRequest request,
                        @AuthenticationPrincipal UserPrincipal principal) {
                return ResponseEntity.ok(ApiResponse.success("Course created",
                                courseService.createCourse(request, principal.getId())));
        }

        @GetMapping("/courses")
        public ResponseEntity<ApiResponse<List<CourseResponse>>> getMyCourses(
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

        // --- Modules ----------------------------------------------
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

        @GetMapping("/modules/{id}")
        public ResponseEntity<ApiResponse<ModuleResponse>> getModule(
                        @PathVariable Long id,
                        @AuthenticationPrincipal UserPrincipal principal) {
                return ResponseEntity.ok(ApiResponse.success("Module fetched",
                                moduleService.getModuleById(id, principal.getId())));
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

        // --- Enrolled Students (view only) ------------------------
        /**
         * FIXED: Properly retrieve students enrolled in a specific course
         * 
         * The old implementation was calling getAvailableCourses() which returns
         * courses, not enrollments. Now it properly fetches enrollments from
         * the EnrollmentRepository for the given course.
         */
        @GetMapping("/courses/{courseId}/enrollments")
        @Transactional(readOnly = true)
        public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getCourseEnrollments(
                        @PathVariable Long courseId,
                        @AuthenticationPrincipal UserPrincipal principal) {

                // NOTE: FIXED: Verify trainer owns this course first
                courseService.getCourseById(courseId, principal.getId());

                // NOTE: FIXED: Get actual enrollments for this course with full details
                // List<EnrollmentResponse> enrollments = enrollmentRepository
                // .findByCourse_IdAndActiveTrue(courseId)
                // .stream()
                // .map(e -> {
                // int totalModules = e.getCourse().getModules() != null
                // ? e.getCourse().getModules().size()
                // : 0;
                // int completedModules = e.getCompletedModuleIds() != null
                // ? e.getCompletedModuleIds().size()
                // : 0;
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
                                                        ? (int) e.getCourse().getModules().stream()
                                                                        .filter(m -> m.isActive()).count()
                                                        : 0;
                                        int completedModules = e.getCompletedModuleIds() != null
                                                        ? e.getCompletedModuleIds().size()
                                                        : 0;
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
}
