package tech.csm.securelms.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.dto.response.CourseResponse;
import tech.csm.securelms.dto.response.EnrollmentResponse;
import tech.csm.securelms.entity.Course;
import tech.csm.securelms.entity.CourseModule;
import tech.csm.securelms.entity.Enrollment;
import tech.csm.securelms.entity.User;
import tech.csm.securelms.exception.BadRequestException;
import tech.csm.securelms.exception.ResourceNotFoundException;
import tech.csm.securelms.repository.CourseRepository;
import tech.csm.securelms.repository.EnrollmentRepository;
import tech.csm.securelms.repository.UserRepository;
//import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class StudentService {

    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final CourseService courseService;

    // @Transactional
    // public EnrollmentResponse enrollInCourse(Long studentId, Long courseId) {
    // User student = userRepository.findById(studentId)
    // .orElseThrow(() -> new RuntimeException("Student not found"));
    // Course course = courseRepository.findById(courseId)
    // .orElseThrow(() -> new RuntimeException("Course not found"));

    // if (enrollmentRepository.existsByStudentAndCourseAndActiveTrue(student,
    // course)) {
    // throw new RuntimeException("Already enrolled in this course");
    // }

    // Optional<Enrollment> inactiveEnrollment =
    // enrollmentRepository.findByStudentAndCourse(student, course);

    // Enrollment enrollment;
    // if (inactiveEnrollment.isPresent()) {
    // enrollment = inactiveEnrollment.get();
    // enrollment.setActive(true);
    // enrollment.setProgressPercent(0);
    // enrollment.setEnrolledAt(LocalDateTime.now());
    // enrollment.setCompletedAt(null);
    // } else {
    // enrollment = Enrollment.builder()
    // .student(student)
    // .course(course)
    // .active(true)
    // .progressPercent(0)
    // .enrolledAt(LocalDateTime.now())
    // .build();
    // }

    // Enrollment saved = enrollmentRepository.save(enrollment);
    // return buildEnrollmentResponse(saved);
    // }

    @Transactional
    public EnrollmentResponse enrollInCourse(Long studentId, Long courseId) {
        User student = userRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", studentId));
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));

        if (enrollmentRepository.existsByStudentAndCourseAndActiveTrue(student, course)) {
            throw new BadRequestException("Already enrolled in this course");
        }

        Optional<Enrollment> existing = enrollmentRepository.findByStudentAndCourse(student, course);

        Enrollment enrollment;
        if (existing.isPresent()) {
            // DELETE the old record so a new one with a fresh enrolledAt is created
            enrollmentRepository.delete(existing.get());
            enrollmentRepository.flush();
        }

        // Always create fresh - enrolledAt will be set by @CreatedDate on insert
        enrollment = Enrollment.builder()
                .student(student)
                .course(course)
                .active(true)
                .progressPercent(0)
                .build();

        Enrollment saved = enrollmentRepository.save(enrollment);
        return buildEnrollmentResponse(saved);
    }

    private EnrollmentResponse buildEnrollmentResponse(Enrollment enrollment) {
        int totalModules = enrollment.getCourse().getModules() != null ? enrollment.getCourse().getModules().size() : 0;
        int completedModules = enrollment.getCompletedModuleIds() != null ? enrollment.getCompletedModuleIds().size()
                : 0;

        return EnrollmentResponse.builder()
                .id(enrollment.getId())
                .studentId(enrollment.getStudent().getId())
                .studentUsername(enrollment.getStudent().getUsername())
                .courseId(enrollment.getCourse().getId())
                .courseTitle(enrollment.getCourse().getTitle())
                .progressPercent(enrollment.getProgressPercent())
                .completedModuleCount(completedModules)
                .totalModuleCount(totalModules)
                .active(enrollment.isActive())
                .enrolledAt(enrollment.getEnrolledAt())
                .completedAt(enrollment.getCompletedAt())
                .completedModuleIds(enrollment.getCompletedModuleIds())
                .build();
    }

    @Transactional
    public void unenrollFromCourse(Long studentId, Long courseId) {
        User student = getUser(studentId);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));

        Enrollment enrollment = enrollmentRepository.findByStudentAndCourse(student, course)
                .orElseThrow(() -> new BadRequestException("You are not enrolled in this course"));

        enrollment.setActive(false);
        enrollmentRepository.save(enrollment);
    }

    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getMyEnrollments(Long studentId) {
        User student = getUser(studentId);
        return enrollmentRepository.findByStudentAndActiveTrue(student)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<CourseResponse> getAvailableCourses(Long studentId) {
        User student = getUser(studentId);
        Long groupId = student.getGroup() != null ? student.getGroup().getId() : null;
        
        List<Course> courses;
        if (groupId != null) {
            courses = courseRepository.findAllPublishedActiveByGroupId(groupId);
        } else {
            courses = courseRepository.findAllPublishedActive();
        }
        
        return courses.stream()
                .map(c -> courseService.toResponse(c, false))
                .collect(Collectors.toList());
    }

    @Transactional
    public EnrollmentResponse toggleModuleCompletion(Long studentId, Long courseId, Long moduleId, boolean completed) {
        User student = getUser(studentId);
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new ResourceNotFoundException("Course", "id", courseId));
        Enrollment enrollment = enrollmentRepository.findByStudentAndCourse(student, course)
                .orElseThrow(() -> new BadRequestException("Enrollment not found"));

        if (completed) {
            enrollment.getCompletedModuleIds().add(moduleId);
        } else {
            enrollment.getCompletedModuleIds().remove(moduleId);
        }

        // int totalModules = course.getModules() != null ? course.getModules().size() :
        // 0;
        int totalModules = course.getModules() != null
                ? (int) course.getModules().stream().filter(CourseModule::isActive).count()
                : 0;
        int progress = 0;
        if (totalModules > 0) {
            progress = (int) Math.round((double) enrollment.getCompletedModuleIds().size() / totalModules * 100);
        }

        enrollment.setProgressPercent(progress);

        if (progress == 100 && enrollment.getCompletedAt() == null) {
            enrollment.setCompletedAt(java.time.LocalDateTime.now());
        } else if (progress < 100) {
            enrollment.setCompletedAt(null);
        }

        return toResponse(enrollmentRepository.save(enrollment));
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    private EnrollmentResponse toResponse(Enrollment e) {
        // int totalModules = e.getCourse().getModules() != null ?
        // e.getCourse().getModules().size() : 0;
        int totalModules = e.getCourse().getModules() != null
                ? (int) e.getCourse().getModules().stream().filter(CourseModule::isActive).count()
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
    }
}

