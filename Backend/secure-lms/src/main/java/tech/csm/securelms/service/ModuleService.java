package tech.csm.securelms.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.dto.request.ModuleRequest;
import tech.csm.securelms.dto.response.ModuleResponse;
import tech.csm.securelms.constants.RoleCodes;
import tech.csm.securelms.entity.Course;
import tech.csm.securelms.entity.CourseModule;
import tech.csm.securelms.entity.User;
import tech.csm.securelms.exception.ResourceNotFoundException;
import tech.csm.securelms.exception.UnauthorizedException;
import tech.csm.securelms.repository.CourseModuleRepository;
import tech.csm.securelms.repository.CourseRepository;
import tech.csm.securelms.repository.EnrollmentRepository;
import tech.csm.securelms.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ModuleService {

    private final CourseModuleRepository moduleRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final RoleMasterService roleMasterService;

    @Transactional
    public ModuleResponse createModule(ModuleRequest request, Long creatorId) {
        Course course = getCourse(request.getCourseId());
        User creator = getUser(creatorId);
        validateCourseOwnership(course, creator);

        int orderIndex = request.getOrderIndex() != null
                ? request.getOrderIndex()
                : moduleRepository.findMaxOrderIndexByCourse(course) + 1;

        CourseModule module = CourseModule.builder()
                .title(request.getTitle())
                .content(request.getContent())
                .resourceUrl(request.getResourceUrl())
                .moduleType(request.getModuleType())
                .orderIndex(orderIndex)
                .durationMinutes(request.getDurationMinutes())
                .course(course)
                .build();

        return toResponse(moduleRepository.save(module));
    }

    // @Transactional(readOnly = true)
    // public List<ModuleResponse> getModulesByCourse(Long courseId, Long
    // requesterId) {
    // Course course = getCourse(courseId);
    // User requester = getUser(requesterId);

    // List<CourseModule> modules;
    // if (requester.getRole() == Role.STUDENT) {
    // modules =
    // moduleRepository.findByCourseAndActiveTrueOrderByOrderIndexAsc(course);
    // } else {
    // modules = moduleRepository.findByCourseOrderByOrderIndexAsc(course);
    // }
    // return modules.stream().map(this::toResponse).collect(Collectors.toList());
    // }
    @Transactional(readOnly = true)
    public List<ModuleResponse> getModulesByCourse(Long courseId, Long requesterId) {
        Course course = getCourse(courseId);
        User requester = getUser(requesterId);

        // ADD: Students must be enrolled to access module content
        if (roleMasterService.hasRole(requester.getRole(), RoleCodes.STUDENT)) {
            boolean enrolled = enrollmentRepository
                    .existsByStudentAndCourseAndActiveTrue(requester, course);
            if (!enrolled) {
                throw new UnauthorizedException("You must be enrolled in this course to access its modules");
            }
        }

        List<CourseModule> modules;
        if (roleMasterService.hasRole(requester.getRole(), RoleCodes.STUDENT)) {
            modules = moduleRepository.findByCourseAndActiveTrueOrderByOrderIndexAsc(course);
        } else {
            modules = moduleRepository.findByCourseOrderByOrderIndexAsc(course);
        }
        return modules.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ModuleResponse getModuleById(Long moduleId, Long requesterId) {
        CourseModule module = getModule(moduleId);
        User requester = getUser(requesterId);
        if (roleMasterService.hasRole(requester.getRole(), RoleCodes.TRAINER)) {
            validateCourseOwnership(module.getCourse(), requester);
        }
        return toResponse(module);
    }

    @Transactional
    public ModuleResponse updateModule(Long moduleId, ModuleRequest request, Long requesterId) {
        CourseModule module = getModule(moduleId);
        User requester = getUser(requesterId);
        validateCourseOwnership(module.getCourse(), requester);

        module.setTitle(request.getTitle());
        module.setContent(request.getContent());
        module.setResourceUrl(request.getResourceUrl());
        module.setModuleType(request.getModuleType());
        if (request.getOrderIndex() != null)
            module.setOrderIndex(request.getOrderIndex());
        if (request.getDurationMinutes() != null)
            module.setDurationMinutes(request.getDurationMinutes());

        return toResponse(moduleRepository.save(module));
    }

    @Transactional
    public void deleteModule(Long moduleId, Long requesterId) {
        CourseModule module = getModule(moduleId);
        User requester = getUser(requesterId);
        validateCourseOwnership(module.getCourse(), requester);
        module.setActive(false);
        moduleRepository.save(module);
    }

    private void validateCourseOwnership(Course course, User user) {
        if (roleMasterService.hasRole(user.getRole(), RoleCodes.ADMIN))
            return;
        if (!course.getCreatedBy().getId().equals(user.getId())) {
            throw new UnauthorizedException("You can only modify modules in your own courses");
        }
    }

    private CourseModule getModule(Long id) {
        return moduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Module", "id", id));
    }

    private Course getCourse(Long id) {
        return courseRepository.findById(id)
                .filter(Course::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Course", "id", id));
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    public ModuleResponse toResponse(CourseModule m) {
        return ModuleResponse.builder()
                .id(m.getId())
                .title(m.getTitle())
                .content(m.getContent())
                .resourceUrl(m.getResourceUrl())
                .moduleType(m.getModuleType())
                .orderIndex(m.getOrderIndex())
                .durationMinutes(m.getDurationMinutes())
                .active(m.isActive())
                .courseId(m.getCourse().getId())
                .courseTitle(m.getCourse().getTitle())
                .createdAt(m.getCreatedAt())
                .updatedAt(m.getUpdatedAt())
                .build();
    }
}
