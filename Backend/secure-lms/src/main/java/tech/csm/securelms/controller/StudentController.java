package tech.csm.securelms.controller;

// import jakarta.validation.constraints.Max;
// import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tech.csm.securelms.dto.response.*;
import tech.csm.securelms.security.UserPrincipal;
import tech.csm.securelms.service.CourseService;
import tech.csm.securelms.service.ModuleService;
import tech.csm.securelms.service.StudentService;

import java.util.List;

@RestController
@RequestMapping("/api/student")
@PreAuthorize("@permissionService.hasPermission(authentication)")
@RequiredArgsConstructor
public class StudentController {

    private final StudentService studentService;
    private final CourseService courseService;
    private final ModuleService moduleService;

    @GetMapping("/courses")
    public ResponseEntity<ApiResponse<List<CourseResponse>>> getAvailableCourses(
            @org.springframework.security.core.annotation.AuthenticationPrincipal tech.csm.securelms.security.UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Available courses",
                studentService.getAvailableCourses(principal.getId())));
    }

    @GetMapping("/courses/{id}")
    public ResponseEntity<ApiResponse<CourseResponse>> getCourseDetails(
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Course details",
                courseService.getCourseById(id, principal.getId())));
    }

    @GetMapping("/courses/{courseId}/modules")
    public ResponseEntity<ApiResponse<List<ModuleResponse>>> getCourseModules(
            @PathVariable Long courseId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Course modules",
                moduleService.getModulesByCourse(courseId, principal.getId())));
    }

    @GetMapping("/enrollments")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getMyEnrollments(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("My enrollments",
                studentService.getMyEnrollments(principal.getId())));
    }

    @PostMapping("/enroll/{courseId}")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> enroll(
            @PathVariable Long courseId,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Enrolled successfully",
                studentService.enrollInCourse(principal.getId(), courseId)));
    }

    @DeleteMapping("/unenroll/{courseId}")
    public ResponseEntity<ApiResponse<Void>> unenroll(
            @PathVariable Long courseId,
            @AuthenticationPrincipal UserPrincipal principal) {
        studentService.unenrollFromCourse(principal.getId(), courseId);
        return ResponseEntity.ok(ApiResponse.success("Unenrolled successfully"));
    }

    @PatchMapping("/courses/{courseId}/modules/{moduleId}/progress")
    public ResponseEntity<ApiResponse<EnrollmentResponse>> toggleModuleCompletion(
            @PathVariable Long courseId,
            @PathVariable Long moduleId,
            @RequestParam boolean completed,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ApiResponse.success("Module progress updated",
                studentService.toggleModuleCompletion(principal.getId(), courseId, moduleId, completed)));
    }
}
