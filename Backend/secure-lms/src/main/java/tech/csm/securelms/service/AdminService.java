package tech.csm.securelms.service;

import java.util.ArrayList;
import java.util.Locale;
import java.time.LocalDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.dto.request.AdminUserCreateRequest;
import tech.csm.securelms.dto.request.UserUpdateRequest;
import tech.csm.securelms.dto.response.PageResponse;
import tech.csm.securelms.dto.response.UserResponse;
import tech.csm.securelms.entity.User;
import tech.csm.securelms.enums.SecurityEventType;
import tech.csm.securelms.exception.BadRequestException;
import tech.csm.securelms.exception.DuplicateUserException;
import tech.csm.securelms.exception.ResourceNotFoundException;
import tech.csm.securelms.repository.PasswordHistoryRepository;
import tech.csm.securelms.repository.PasswordResetTokenRepository;
import tech.csm.securelms.repository.SecurityAuditLogRepository;
import tech.csm.securelms.repository.CourseRepository;
import tech.csm.securelms.repository.EnrollmentRepository;
import tech.csm.securelms.repository.GroupMasterRepository;
import tech.csm.securelms.repository.UserRepository;
import tech.csm.securelms.entity.GroupMaster;
import tech.csm.securelms.security.UserPrincipal;
import tech.csm.securelms.constants.RoleCodes;

import jakarta.persistence.criteria.Predicate;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final AesEncryptionService aesEncryptionService;
    private final PasswordEncoder passwordEncoder;
    private final PasswordGovernanceService passwordGovernanceService;
    private final SecurityAuditService securityAuditService;
    private final PasswordHistoryRepository passwordHistoryRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final SecurityAuditLogRepository securityAuditLogRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final RoleMasterService roleMasterService;
    private final GroupMasterRepository groupMasterRepository;

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers(UserPrincipal principal) {
        return getAllUsers(principal, null, null, null, null);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers(UserPrincipal principal, String q, String role, Boolean active, Boolean locked) {
        Specification<User> spec = buildUserFilterSpec(principal, q, role, active, locked);
        return userRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt")).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> getAllUsers(UserPrincipal principal, int page, int size) {
        return getAllUsers(principal, page, size, null, null, null, null);
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> getAllUsers(UserPrincipal principal, int page, int size, String q, String role, Boolean active, Boolean locked) {
        Specification<User> spec = buildUserFilterSpec(principal, q, role, active, locked);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<User> result = userRepository.findAll(spec, pageable);
        return PageResponse.from(result
                .map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id, UserPrincipal principal) {
        return toResponse(findUser(id, principal));
    }

    @Transactional
    public UserResponse createUser(AdminUserCreateRequest request, UserPrincipal principal) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Passwords do not match");
        }
        passwordGovernanceService.validatePasswordStrength(request.getPassword());

        String normalised = request.getEmail().toLowerCase().trim();
        String emailHash = aesEncryptionService.hashEmail(normalised);

        if (userRepository.existsByUsername(request.getUsername().trim())) {
            throw new DuplicateUserException("Username '" + request.getUsername() + "' is already taken");
        }
        if (userRepository.existsByEmailHash(emailHash)) {
            throw new DuplicateUserException(
                    "An account with this email already exists. Each email can only be registered once.");
        }
        if (userRepository.existsByAadharNumber(request.getAadharNumber())) {
            throw new DuplicateUserException(
                    "Aadhar number '" + request.getAadharNumber() + "' is already registered.");
        }

        GroupMaster group = null;
        if (principal != null && !RoleCodes.SUPER_ADMIN.equals(principal.getRole())) {
            group = groupMasterRepository.findById(principal.getGroupId())
                    .orElseThrow(() -> new BadRequestException("Group not found"));
        } else {
            if (request.getGroupId() != null) {
                group = groupMasterRepository.findById(request.getGroupId())
                        .orElseThrow(() -> new BadRequestException("Group not found"));
            }
        }

        if (principal != null && !RoleCodes.SUPER_ADMIN.equals(principal.getRole())) {
            if (RoleCodes.SUPER_ADMIN.equalsIgnoreCase(request.getRole())) {
                throw new BadRequestException("You do not have permission to assign the Super Admin role");
            }
        }

        User user = User.builder()
                .username(request.getUsername().trim())
                .email(normalised)
                .emailHash(emailHash)
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .contactNumber(request.getContactNumber())
                .aadharNumber(request.getAadharNumber())
                .role(roleMasterService.findAssignableActiveByCode(request.getRole()))
                .group(group)
                .active(request.getActive() != null ? request.getActive() : true)
                .accountNonLocked(true)
                .build();

        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateUser(Long id, UserUpdateRequest request, UserPrincipal principal) {
        User user = findUser(id, principal);

        if (request.getUsername() != null) {
            String newUsername = request.getUsername().trim();
            if (newUsername.isEmpty()) {
                throw new BadRequestException("Username cannot be empty");
            }
            if (!newUsername.equals(user.getUsername()) && userRepository.existsByUsername(newUsername)) {
                throw new DuplicateUserException(
                        "Username '" + newUsername + "' is already taken");
            }
            user.setUsername(newUsername);
        }

        if (request.getEmail() != null) {
            String normalised = request.getEmail().toLowerCase().trim();
            if (normalised.isEmpty()) {
                throw new BadRequestException("Email cannot be empty");
            }
            String newHash = aesEncryptionService.hashEmail(normalised);

            if (!newHash.equals(user.getEmailHash())
                    && userRepository.existsByEmailHash(newHash)) {
                throw new DuplicateUserException(
                        "Email is already registered to another account");
            }
            user.setEmail(normalised);
            user.setEmailHash(newHash);
        }

        if (request.getFirstName() != null) {
            user.setFirstName(request.getFirstName().trim());
        }
        if (request.getLastName() != null) {
            user.setLastName(request.getLastName().trim());
        }
        if (request.getContactNumber() != null) {
            user.setContactNumber(request.getContactNumber().trim());
        }
        if (request.getAadharNumber() != null) {
            String newAadhar = request.getAadharNumber().trim();
            if (!newAadhar.equals(user.getAadharNumber()) && userRepository.existsByAadharNumber(newAadhar)) {
                throw new DuplicateUserException("Aadhar number '" + newAadhar + "' is already registered.");
            }
            user.setAadharNumber(newAadhar);
        }

        if (request.getPassword() != null || request.getConfirmPassword() != null) {
            if (request.getPassword() == null || request.getConfirmPassword() == null) {
                throw new BadRequestException("Both password and confirm password are required");
            }
            if (!request.getPassword().equals(request.getConfirmPassword())) {
                throw new BadRequestException("Passwords do not match");
            }
            passwordGovernanceService.validatePasswordStrength(request.getPassword());
            if (passwordEncoder.matches(request.getPassword(), user.getPassword())) {
                throw new BadRequestException("New password must be different from current password");
            }
            passwordGovernanceService.validatePasswordReuse(user, request.getPassword());
            String previousPasswordHash = user.getPassword();
            user.setPassword(passwordEncoder.encode(request.getPassword()));
            user.setPasswordChangedAt(LocalDateTime.now());
            passwordGovernanceService.savePasswordHistory(user, previousPasswordHash);
            securityAuditService.logEvent(
                    user,
                    SecurityEventType.PASSWORD_CHANGED,
                    "SUCCESS",
                    null,
                    user.getEmail(),
                    "Password changed by admin action");
        }

        if (request.getRole() != null) {
            if (principal != null && !RoleCodes.SUPER_ADMIN.equals(principal.getRole())) {
                if (RoleCodes.SUPER_ADMIN.equalsIgnoreCase(request.getRole())) {
                    throw new BadRequestException("You do not have permission to assign the Super Admin role");
                }
            }
            user.setRole(roleMasterService.findAssignableActiveByCode(request.getRole()));
        }

        if (principal != null && RoleCodes.SUPER_ADMIN.equals(principal.getRole())) {
            if (request.getGroupId() != null) {
                GroupMaster group = groupMasterRepository.findById(request.getGroupId())
                        .orElseThrow(() -> new BadRequestException("Group not found"));
                user.setGroup(group);
            }
        }

        if (request.getActive() != null)
            user.setActive(request.getActive());

        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(Long id, Long adminId, UserPrincipal principal) {
        User user = findUser(id, principal);
        ensureNotSelfAction(id, adminId, "delete");
        try {
            // Remove enrollments where this user is a student.
            enrollmentRepository.deleteAll(enrollmentRepository.findByStudent(user));

            // Remove courses created by this user (modules/enrollments cascade from
            // Course).
            courseRepository.deleteAll(courseRepository.findByCreatedBy(user));

            // Remove dependent security artifacts that are not cascaded from User entity.
            passwordResetTokenRepository.deleteByUser_Id(id);
            passwordHistoryRepository.deleteByUser_Id(id);
            securityAuditLogRepository.deleteByUser_Id(id);

            userRepository.delete(user);
            userRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            String rootMessage = ex.getMostSpecificCause() != null
                    ? ex.getMostSpecificCause().getMessage()
                    : ex.getMessage();
            throw new BadRequestException(
                    "Unable to delete user due to linked records. Database says: " + rootMessage);
        }
    }

    @Transactional
    public void toggleUserActive(Long id, Long adminId, UserPrincipal principal) {
        User user = findUser(id, principal);
        ensureNotSelfAction(id, adminId, "activate/deactivate");
        user.setActive(!user.isActive());
        userRepository.save(user);
        securityAuditService.logEvent(
                user,
                SecurityEventType.USER_ACTIVE_TOGGLED_BY_ADMIN,
                "SUCCESS",
                null,
                user.getEmail(),
                "Admin toggled active status to " + user.isActive());
    }

    @Transactional
    public void toggleUserLock(Long id, Long adminId, UserPrincipal principal) {
        User user = findUser(id, principal);
        ensureNotSelfAction(id, adminId, "lock/unlock");
        boolean unlocked = !user.isAccountNonLocked();
        user.setAccountNonLocked(unlocked);
        if (unlocked) {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
            user.setLockoutLevel(0);
        } else {
            user.setLockedUntil(null);
        }
        userRepository.save(user);
        securityAuditService.logEvent(
                user,
                unlocked ? SecurityEventType.ACCOUNT_UNLOCKED_ADMIN : SecurityEventType.ACCOUNT_LOCKED_BY_ADMIN,
                "SUCCESS",
                null,
                user.getEmail(),
                unlocked ? "Admin unlocked account" : "Admin locked account");
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
    }

    private void ensureNotSelfAction(Long targetUserId, Long actingUserId, String actionLabel) {
        if (actingUserId != null && actingUserId.equals(targetUserId)) {
            throw new BadRequestException("You cannot " + actionLabel + " your own account");
        }
    }

    private User findUser(Long id, UserPrincipal principal) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        if (principal != null && !RoleCodes.SUPER_ADMIN.equals(principal.getRole())) {
            if (user.getRole() != null && RoleCodes.SUPER_ADMIN.equalsIgnoreCase(user.getRole().getCode())) {
                throw new BadRequestException("You do not have permission to modify a Super Admin account");
            }
            Long userGroupId = user.getGroup() != null ? user.getGroup().getId() : null;
            if (userGroupId == null || !userGroupId.equals(principal.getGroupId())) {
                throw new ResourceNotFoundException("User not found with id: " + id);
            }
        }
        return user;
    }

    private Specification<User> buildUserFilterSpec(UserPrincipal principal, String q, String role, Boolean active, Boolean locked) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (principal != null && !"SUPER_ADMIN".equals(principal.getRole())) {
                if (principal.getGroupId() == null) {
                    predicates.add(cb.isNull(root.get("group").get("id")));
                } else {
                    predicates.add(cb.equal(root.get("group").get("id"), principal.getGroupId()));
                }
            }

            if (role != null && !role.isBlank()) {
                predicates.add(cb.equal(cb.upper(root.get("role").get("code")), role.trim().toUpperCase(Locale.ROOT)));
            }
            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            if (locked != null) {
                predicates.add(cb.equal(root.get("accountNonLocked"), !locked));
            }
            if (q != null && !q.isBlank()) {
                String search = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("username")), search),
                        cb.like(cb.lower(root.get("email")), search),
                        cb.like(cb.lower(cb.coalesce(root.get("firstName"), "")), search),
                        cb.like(cb.lower(cb.coalesce(root.get("lastName"), "")), search)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    public UserResponse toResponse(User user) {
        String plainEmail = aesEncryptionService.decrypt(user.getEmail());
        log.debug("Decrypted email for admin response of user {} (plaintext len={})",
                user.getUsername(), plainEmail != null ? plainEmail.length() : 0);

        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                // .email(plainEmail)
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .contactNumber(user.getContactNumber())
                .aadharNumber(user.getAadharNumber())
                .role(roleMasterService.roleCode(user.getRole()))
                .roleId(user.getRole() != null ? user.getRole().getId() : null)
                .roleName(user.getRole() != null ? user.getRole().getDisplayName() : null)
                .groupId(user.getGroup() != null ? user.getGroup().getId() : null)
                .groupName(user.getGroup() != null ? user.getGroup().getGroupName() : null)
                .active(user.isActive())
                .accountNonLocked(user.isAccountNonLocked())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}

