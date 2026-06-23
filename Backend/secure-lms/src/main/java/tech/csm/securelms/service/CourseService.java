package tech.csm.securelms.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.dto.request.CourseRequest;
import tech.csm.securelms.dto.response.CourseResponse;
import tech.csm.securelms.dto.response.ModuleResponse;
import tech.csm.securelms.constants.RoleCodes;
import tech.csm.securelms.entity.Course;
import tech.csm.securelms.entity.User;
//import tech.csm.securelms.exception.BadRequestException;
import tech.csm.securelms.exception.ResourceNotFoundException;
import tech.csm.securelms.exception.UnauthorizedException;
import tech.csm.securelms.repository.CourseRepository;
import tech.csm.securelms.repository.EnrollmentRepository;
import tech.csm.securelms.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final RoleMasterService roleMasterService;
    //private final AesEncryptionService aesEncryptionService;

    @Transactional
    public CourseResponse createCourse(CourseRequest request, Long creatorId) {
        User creator = getUserById(creatorId);
        Course course = Course.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .category(request.getCategory())
                .difficultyLevel(request.getDifficultyLevel())
                .durationHours(request.getDurationHours())
                .published(request.isPublished())
                .createdBy(creator)
                .group(creator.getGroup())
                .build();
        return toResponse(courseRepository.save(course), false);
    }

    @Transactional(readOnly = true)
    public List<CourseResponse> getAllCourses(Long requesterId) {
        User requester = getUserById(requesterId);
        List<Course> courses;
        
        if (roleMasterService.hasRole(requester.getRole(), RoleCodes.SUPER_ADMIN)) {
            courses = courseRepository.findByActiveTrue();
        } else if (roleMasterService.hasRole(requester.getRole(), RoleCodes.ADMIN)) {
            Long groupId = requester.getGroup() != null ? requester.getGroup().getId() : null;
            if (groupId != null) {
                courses = courseRepository.findByGroup_IdAndActiveTrue(groupId);
            } else {
                courses = courseRepository.findByActiveTrue();
            }
        } else if (roleMasterService.hasRole(requester.getRole(), RoleCodes.TRAINER)) {
            courses = courseRepository.findByCreatedByAndActiveTrue(requester);
        } else {
            Long groupId = requester.getGroup() != null ? requester.getGroup().getId() : null;
            if (groupId != null) {
                courses = courseRepository.findAllPublishedActiveByGroupId(groupId);
            } else {
                courses = courseRepository.findAllPublishedActive();
            }
        }
        return courses.stream().map(c -> toResponse(c, false)).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CourseResponse getCourseById(Long courseId, Long requesterId) {
        Course course = getCourse(courseId);
        User requester = getUserById(requesterId);
        validateCourseAccess(course, requester);
        return toResponse(course, true);
    }

    @Transactional
    public CourseResponse updateCourse(Long courseId, CourseRequest request, Long requesterId) {
        Course course = getCourse(courseId);
        User requester = getUserById(requesterId);
        validateCourseOwnership(course, requester);

        course.setTitle(request.getTitle());
        course.setDescription(request.getDescription());
        course.setCategory(request.getCategory());
        course.setDifficultyLevel(request.getDifficultyLevel());
        course.setDurationHours(request.getDurationHours());
        course.setPublished(request.isPublished());

        return toResponse(courseRepository.save(course), false);
    }

    @Transactional
    public void deleteCourse(Long courseId, Long requesterId) {
        Course course = getCourse(courseId);
        User requester = getUserById(requesterId);
        validateCourseOwnership(course, requester);
        course.setActive(false);
        courseRepository.save(course);
    }

    private void validateCourseAccess(Course course, User user) {
        if (!course.isActive() && !user.getId().equals(course.getCreatedBy().getId())
                && !roleMasterService.hasRole(user.getRole(), RoleCodes.ADMIN)
                && !roleMasterService.hasRole(user.getRole(), RoleCodes.SUPER_ADMIN)) {
            throw new ResourceNotFoundException("Course not found");
        }
        
        if (!roleMasterService.hasRole(user.getRole(), RoleCodes.SUPER_ADMIN)) {
            Long userGroupId = user.getGroup() != null ? user.getGroup().getId() : null;
            Long courseGroupId = course.getGroup() != null ? course.getGroup().getId() : null;
            
            if (userGroupId != null && !userGroupId.equals(courseGroupId)) {
                throw new ResourceNotFoundException("Course not found");
            }
        }
        if (roleMasterService.hasRole(user.getRole(), RoleCodes.ADMIN)) return;
        if (roleMasterService.hasRole(user.getRole(), RoleCodes.TRAINER) && course.getCreatedBy().getId().equals(user.getId())) return;
        if (roleMasterService.hasRole(user.getRole(), RoleCodes.STUDENT) && course.isPublished() && course.isActive()) return;
        throw new UnauthorizedException("You do not have access to this course");
    }

    private void validateCourseOwnership(Course course, User user) {
        if (roleMasterService.hasRole(user.getRole(), RoleCodes.ADMIN)) return;
        if (!course.getCreatedBy().getId().equals(user.getId())) {
            throw new UnauthorizedException("You can only modify your own courses");
        }
    }

    private Course getCourse(Long id) {
        return courseRepository.findById(id)
                .filter(Course::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Course", "id", id));
    }

    private User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    public CourseResponse toResponse(Course course, boolean includeModules) {
        CourseResponse.CourseResponseBuilder builder = CourseResponse.builder()
                .id(course.getId())
                .title(course.getTitle())
                .description(course.getDescription())
                .category(course.getCategory())
                .difficultyLevel(course.getDifficultyLevel())
                .durationHours(course.getDurationHours())
                .published(course.isPublished())
                .active(course.isActive())
                .createdByUsername(course.getCreatedBy().getUsername())
                .createdById(course.getCreatedBy().getId())
                //.moduleCount(course.getModules() != null ? course.getModules().size() : 0)
                .moduleCount(course.getModules() != null
        ? (int) course.getModules().stream().filter(m -> m.isActive()).count()
        : 0)
                .enrollmentCount((int) enrollmentRepository.countByCourse(course))
                .createdAt(course.getCreatedAt())
                .updatedAt(course.getUpdatedAt());

        if (includeModules && course.getModules() != null) {
            List<ModuleResponse> modules = course.getModules().stream()
                    .filter(m -> m.isActive())
                    .map(m -> ModuleResponse.builder()
                            .id(m.getId())
                            .title(m.getTitle())
                            .content(m.getContent())
                            .resourceUrl(m.getResourceUrl())
                            .moduleType(m.getModuleType())
                            .orderIndex(m.getOrderIndex())
                            .durationMinutes(m.getDurationMinutes())
                            .active(m.isActive())
                            .courseId(course.getId())
                            .courseTitle(course.getTitle())
                            .createdAt(m.getCreatedAt())
                            .updatedAt(m.getUpdatedAt())
                            .build())
                    .collect(Collectors.toList());
            builder.modules(modules);
        }

        return builder.build();
    }
}
