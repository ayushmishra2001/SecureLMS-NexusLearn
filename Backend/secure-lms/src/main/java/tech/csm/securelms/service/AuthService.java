package tech.csm.securelms.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.dto.request.LoginRequest;
import tech.csm.securelms.dto.request.PasswordChangeRequest;
import tech.csm.securelms.dto.request.PasswordResetConfirmRequest;
import tech.csm.securelms.dto.request.PasswordResetRequest;
import tech.csm.securelms.dto.request.RegisterRequest;
import tech.csm.securelms.dto.request.UpdateProfileRequest;
import tech.csm.securelms.dto.response.AuthResponse;
import tech.csm.securelms.dto.response.UserResponse;
import tech.csm.securelms.entity.User;
//import tech.csm.securelms.enums.Role;
import tech.csm.securelms.enums.SecurityEventType;
import tech.csm.securelms.exception.BadRequestException;
import tech.csm.securelms.exception.DuplicateUserException;
import tech.csm.securelms.repository.PasswordResetTokenRepository;
import tech.csm.securelms.repository.UserRepository;
import tech.csm.securelms.security.UserPrincipal;

import tech.csm.securelms.dto.response.PasswordExpiryStatusResponse;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;

import tech.csm.securelms.repository.GroupMasterRepository;
import tech.csm.securelms.entity.GroupMaster;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final GroupMasterRepository groupMasterRepository;
    private final PasswordEncoder passwordEncoder;
    private final AesEncryptionService aesEncryptionService;
    private final PasswordResetService passwordResetService;
    private final PasswordGovernanceService passwordGovernanceService;
    private final SecurityAuditService securityAuditService;
    private final EmailService emailService;
    private final AuthenticationManager authenticationManager;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final RoleMasterService roleMasterService;
    private final OtpService otpService;

    @Value("${app.security.lockout.max-failed-attempts:3}")
    private int maxFailedAttempts;

    @Value("${app.security.lockout.first-duration-minutes:5}")
    private int firstLockDurationMinutes;

    @Value("${app.security.lockout.second-duration-minutes:15}")
    private int secondLockDurationMinutes;

    @Value("${app.security.password.expiry.days:30}")
    private int passwordExpiryDays;

    @Value("${app.security.password.expiry.alert-after-days:15}")
    private int passwordExpiryAlertAfterDays;

    // @Transactional
    // public void register(RegisterRequest request) {
    // if (!request.getPassword().equals(request.getConfirmPassword())) {
    // throw new BadRequestException("Passwords do not match");
    // }
    // // if (request.getRole() == Role.ADMIN) {
    // // throw new BadRequestException("Admin accounts cannot be self-registered.
    // // Contact an existing administrator.");
    // // }
    // passwordGovernanceService.validatePasswordStrength(request.getPassword());

    // String normalised = request.getEmail().toLowerCase().trim();
    // String emailHash = aesEncryptionService.hashEmail(normalised);

    // if (userRepository.existsByUsername(request.getUsername())) {
    // throw new DuplicateUserException("Username '" + request.getUsername() + "' is
    // already taken");
    // }
    // if (userRepository.existsByEmailHash(emailHash)) {
    // throw new DuplicateUserException(
    // "An account with this email already exists. Each email can only be registered
    // once.");
    // }
    // if (userRepository.existsByAadharNumber(request.getAadharNumber())) {
    // throw new DuplicateUserException(
    // "Aadhar number '" + request.getAadharNumber() + "' is already registered.");
    // }

    // User user = User.builder()
    // .username(request.getUsername().trim())
    // .email(normalised)
    // .emailHash(emailHash)
    // .password(passwordEncoder.encode(request.getPassword()))
    // .firstName(request.getFirstName().trim())
    // .lastName(request.getLastName().trim())
    // .contactNumber(request.getContactNumber())
    // .aadharNumber(request.getAadharNumber())
    // .role(request.getRole())
    // .active(true)
    // .accountNonLocked(true)
    // .build();

    // userRepository.save(user);
    // log.info("New user registered: {} as {}", user.getUsername(),
    // user.getRole());
    // }

    @Value("${securelms.superadmin.registration-secret:}")
    private String superAdminSecret;

    @Transactional
    public void register(RegisterRequest request, HttpServletRequest httpRequest) {
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("Passwords do not match");
        }

        passwordGovernanceService.validatePasswordStrength(request.getPassword());

        String normalised = request.getEmail().toLowerCase().trim();
        String emailHash = aesEncryptionService.hashEmail(normalised);

        if (userRepository.existsByUsername(request.getUsername())) {
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
        String roleCode = request.getRole();

        if (request.getSuperAdminSecret() != null && !request.getSuperAdminSecret().isBlank()) {
            if (request.getSuperAdminSecret().equals(superAdminSecret)) {
                roleCode = tech.csm.securelms.constants.RoleCodes.SUPER_ADMIN;
                group = groupMasterRepository.findByGroupName("System Administration")
                        .orElseThrow(() -> new RuntimeException("System Administration group not found"));
            } else {
                throw new BadRequestException("Invalid super admin secret");
            }
        } else {
            group = groupMasterRepository.findByGroupName("Pending Users")
                    .orElseThrow(() -> new RuntimeException("Pending Users group not found"));
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
                .role(roleMasterService.findAssignableActiveByCode(roleCode))
                .group(group)
                .active(true)
                .accountNonLocked(true)
                .build();

        userRepository.save(user);
        log.info("New user registered: {} as {}", user.getUsername(), user.getRole());
        // -- Audit log the registration -------------------------------------------
        String clientIp = resolveClientIp(httpRequest);
        String browser = resolveBrowser(httpRequest);
        
        securityAuditService.logEvent(
                user,
                SecurityEventType.USER_REGISTERED,
                "SUCCESS",
                clientIp,
                browser,
                user.getEmail(),
                "New " + roleMasterService.roleCode(user.getRole()) + " account registered");
        // ------------------------------------------------------------------------

        // -- NEW: send welcome email ----------------------------------------------
        try {
            emailService.sendRegistrationWelcome(
                    normalised,
                    user.getFirstName(),
                    user.getUsername(),
                    roleMasterService.roleCode(user.getRole()));
        } catch (Exception ex) {
            // Email failure must NOT roll back the registration.
            // User is already saved - just log the failure.
            log.warn("Registration succeeded for {} but welcome email could not be sent: {}",
                    user.getUsername(), ex.getMessage());
        }
        // -------------------------------------------------------------------------
    }

    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String identifier = request.getIdentifier().trim();
        String clientIp = resolveClientIp(httpRequest);
        String browser = resolveBrowser(httpRequest);
        
        Optional<User> existingUser;
        if (identifier.contains("@")) {
            existingUser = userRepository.findByEmailHash(aesEncryptionService.hashEmail(identifier.toLowerCase()));
        } else if (identifier.matches("^[\\d\\+\\-]+$")) {
            existingUser = userRepository.findByContactNumber(identifier);
        } else {
            existingUser = userRepository.findByUsername(identifier);
        }

        Authentication authentication;
        try {
            // Spring Security UserDetailsService likely uses email (or we pass email to be safe if it's the principal)
            // Let's pass the actual email from the existing user if found, else pass identifier so it fails naturally
            String authPrincipal = existingUser.map(User::getEmail).orElse(identifier);
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(authPrincipal, request.getPassword()));
        } catch (BadCredentialsException ex) {
            String lockMessage = null;
            if (existingUser.isPresent()) {
                lockMessage = handleFailedLoginAttempt(existingUser.get(), clientIp);
            }
            securityAuditService.logEvent(
                    existingUser.orElse(null),
                    SecurityEventType.LOGIN_FAILED,
                    "FAILURE",
                    clientIp,
                    browser,
                    identifier,
                    "Invalid login credentials");
            if (lockMessage != null) {
                throw new LockedException(lockMessage);
            }
            throw ex;
        } catch (LockedException ex) {
            securityAuditService.logEvent(
                    existingUser.orElse(null),
                    SecurityEventType.LOGIN_FAILED,
                    "FAILURE",
                    clientIp,
                    browser,
                    identifier,
                    "Login blocked because account is locked");
            throw ex;
        }

        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

        // Check if password has expired
        User authenticatedUser = userRepository.findById(userPrincipal.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (isPasswordExpired(authenticatedUser)) {
            securityAuditService.logEvent(
                    authenticatedUser,
                    SecurityEventType.LOGIN_FAILED,
                    "FAILURE",
                    clientIp,
                    browser,
                    authenticatedUser.getEmail(),
                    "Login blocked: password has expired");
            throw new BadRequestException(
                    "Your password has expired. Please use the 'Forgot Password' feature to reset it.");
        }

        userRepository.findById(userPrincipal.getId()).ifPresent(u -> {
            u.setFailedLoginAttempts(0);
            u.setLockedUntil(null);
            u.setAccountNonLocked(true);
            userRepository.save(u);
        });

        // Direct Login without OTP
        SecurityContextHolder.getContext().setAuthentication(authentication);
        HttpSession session = httpRequest.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                SecurityContextHolder.getContext());
        session.setAttribute("CLIENT_IP", clientIp);
        session.setAttribute("CLIENT_BROWSER", browser);

        log.info("User logged in via password: {} ({})", userPrincipal.getUsername(), userPrincipal.getRole());
        securityAuditService.logEvent(
                authenticatedUser,
                SecurityEventType.LOGIN_SUCCESS,
                "SUCCESS",
                clientIp,
                browser,
                authenticatedUser.getEmail(),
                "User authenticated successfully via password");

        return AuthResponse.builder()
                .userId(userPrincipal.getId())
                .username(userPrincipal.getUsername())
                .email(userPrincipal.getEmail())
                .role(userPrincipal.getRole())
                .roleId(userPrincipal.getRoleId())
                .build();
    }

    public AuthResponse requestOtp(String identifier, HttpServletRequest httpRequest) {
        identifier = identifier.trim();
        String clientIp = resolveClientIp(httpRequest);
        String browser = resolveBrowser(httpRequest);
        
        Optional<User> existingUser;
        if (identifier.contains("@")) {
            existingUser = userRepository.findByEmailHash(aesEncryptionService.hashEmail(identifier.toLowerCase()));
        } else if (identifier.matches("^[\\d\\+\\-]+$")) {
            existingUser = userRepository.findByContactNumber(identifier);
        } else {
            existingUser = userRepository.findByUsername(identifier);
        }

        if (existingUser.isEmpty()) {
            // Do not reveal that user doesn't exist, just act like we sent it or throw a generic error.
            // Since it's internal we can throw BadCredentialsException.
            securityAuditService.logEvent(
                    null,
                    SecurityEventType.LOGIN_FAILED,
                    "FAILURE",
                    clientIp,
                    browser,
                    identifier,
                    "OTP requested for non-existent user");
            throw new BadCredentialsException("Invalid credentials");
        }

        User user = existingUser.get();

        if (!user.isAccountNonLocked()) {
            securityAuditService.logEvent(
                    user,
                    SecurityEventType.LOGIN_FAILED,
                    "FAILURE",
                    clientIp,
                    browser,
                    identifier,
                    "OTP blocked because account is locked");
            throw new LockedException("Your account is locked.");
        }

        // Generate OTP, store it, send email, and return preAuthToken
        String userEmail = user.getEmail();
        String preAuthToken = otpService.generateAndStoreOtp(userEmail);
        String otp = otpService.getOtpByPreAuthToken(preAuthToken);
        
        try {
            emailService.sendOtpEmail(userEmail, otp);
            log.info("Sent OTP to {}", userEmail);
            log.info("********** OTP for {} is: {} **********", userEmail, otp);
        } catch (Exception ex) {
            log.warn("Failed to send OTP email: {}", ex.getMessage());
            log.info("********** LOCAL FALLBACK: OTP for {} is: {} **********", userEmail, otp);
            // We no longer throw an exception so that local testing still works without a mail server
        }

        return AuthResponse.builder()
                .preAuthToken(preAuthToken)
                .build();
    }

    @Transactional
    public AuthResponse verifyOtp(String preAuthToken, String otp, HttpServletRequest httpRequest) {
        String email = otpService.validateOtp(preAuthToken, otp);
        if (email == null) {
            String pendingEmail = otpService.getEmailByPreAuthToken(preAuthToken);
            String clientIp = resolveClientIp(httpRequest);
            String browser = resolveBrowser(httpRequest);
            
            if (pendingEmail != null) {
                User user = userRepository.findByEmailHash(aesEncryptionService.hashEmail(pendingEmail.toLowerCase().trim())).orElse(null);
                securityAuditService.logEvent(
                        user,
                        SecurityEventType.LOGIN_FAILED,
                        "FAILURE",
                        clientIp,
                        browser,
                        pendingEmail,
                        "Invalid or expired OTP");
            }
            throw new BadRequestException("Invalid or expired OTP");
        }

        User user = userRepository.findByEmailHash(aesEncryptionService.hashEmail(email.toLowerCase().trim()))
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Load principal from DB since we skipped authentication manager here
        // We can create a UsernamePasswordAuthenticationToken and authenticate it using a dedicated provider,
        // but since we already verified password in step 1, we can just build the UserPrincipal directly.
        UserPrincipal userPrincipal = UserPrincipal.create(user);
        
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                userPrincipal, null, userPrincipal.getAuthorities());
                
        SecurityContextHolder.getContext().setAuthentication(authentication);
        HttpSession session = httpRequest.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                SecurityContextHolder.getContext());
                
        String clientIp = resolveClientIp(httpRequest);
        String browser = resolveBrowser(httpRequest);
        session.setAttribute("CLIENT_IP", clientIp);
        session.setAttribute("CLIENT_BROWSER", browser);
        log.info("User logged in: {} ({})", userPrincipal.getUsername(), userPrincipal.getRole());
        securityAuditService.logEvent(
                user,
                SecurityEventType.LOGIN_SUCCESS,
                "SUCCESS",
                clientIp,
                browser,
                email,
                "User authenticated successfully via OTP");

        return AuthResponse.builder()
                .userId(userPrincipal.getId())
                .username(userPrincipal.getUsername())
                .email(userPrincipal.getEmail())
                .role(userPrincipal.getRole())
                .roleId(userPrincipal.getRoleId())
                .roleName(userPrincipal.getRoleName())
                .build();
    }

    @Transactional
    public void logLogout(Authentication authentication, HttpServletRequest httpRequest) {
        String clientIp = resolveClientIp(httpRequest);
        String browser = resolveBrowser(httpRequest);
        User user = null;
        String contextInfo = null;

        if (authentication != null) {
            Object principal = authentication.getPrincipal();

            if (principal instanceof UserPrincipal userPrincipal) {
                user = userRepository.findById(userPrincipal.getId()).orElse(null);
                contextInfo = userPrincipal.getEmail() != null ? userPrincipal.getEmail() : userPrincipal.getUsername();
            } else if (principal instanceof UserDetails userDetails) {
                contextInfo = userDetails.getUsername();
                user = userRepository.findByUsername(userDetails.getUsername()).orElse(null);
            } else if (principal instanceof OAuth2User oauth2User) {
                Object emailAttr = oauth2User.getAttributes().get("email");
                if (emailAttr instanceof String email && !email.isBlank()) {
                    contextInfo = email;
                    String emailHash = aesEncryptionService.hashEmail(email.toLowerCase(Locale.ROOT).trim());
                    user = userRepository.findByEmailHash(emailHash).orElse(null);
                }
            }

            if ((contextInfo == null || contextInfo.isBlank()) && authentication.getName() != null
                    && !authentication.getName().isBlank()) {
                contextInfo = authentication.getName();
                if (user == null) {
                    user = userRepository.findByUsername(authentication.getName()).orElse(null);
                }
            }
        }

        securityAuditService.logEvent(
                user,
                SecurityEventType.LOGOUT,
                "SUCCESS",
                clientIp,
                browser,
                contextInfo,
                "User logged out successfully");
    }

    @Transactional(readOnly = true)
    public AuthResponse getSession(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return AuthResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(roleMasterService.roleCode(user.getRole()))
                .roleId(user.getRole() != null ? user.getRole().getId() : null)
                .roleName(user.getRole() != null ? user.getRole().getDisplayName() : null)
                .build();
    }

    @Transactional(readOnly = true)
    public PasswordExpiryStatusResponse getPasswordExpiryStatus(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        LocalDate today = LocalDate.now();

        LocalDateTime passwordBaseline = resolvePasswordBaseline(user);
        LocalDate anchorDate = passwordBaseline.toLocalDate();
        String anchorType = resolvePasswordWarningType(user, passwordBaseline);

        LocalDate expiresOn = anchorDate.plusDays(passwordExpiryDays);
        int daysUntilExpiry = (int) ChronoUnit.DAYS.between(today, expiresOn);

        // Debug logging
        log.debug("Password expiry calculation for user {}: anchorDate={}, today={}, expiresOn={}, "
                + "daysUntilExpiry={}, passwordExpiryDays={}, passwordExpiryAlertAfterDays={}, anchorType={}",
                user.getUsername(), anchorDate, today, expiresOn, daysUntilExpiry,
                passwordExpiryDays, passwordExpiryAlertAfterDays, anchorType);

        // Alert if password expires within the threshold days OR if already expired
        if (daysUntilExpiry > passwordExpiryAlertAfterDays) {
            return PasswordExpiryStatusResponse.builder()
                    .warningRequired(false)
                    .warningType(anchorType)
                    .daysUntilExpiry(daysUntilExpiry)
                    .expiresOn(expiresOn)
                    .build();
        }

        return PasswordExpiryStatusResponse.builder()
                .warningRequired(true)
                .warningType(anchorType)
                .daysUntilExpiry(daysUntilExpiry)
                .expiresOn(expiresOn)
                .build();
    }

    @Transactional
    public UserResponse updateUserProfile(Long userId, UpdateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getUsername() != null && !request.getUsername().equals(user.getUsername())) {
            if (userRepository.existsByUsername(request.getUsername())) {
                throw new DuplicateUserException("Username '" + request.getUsername() + "' is already taken");
            }
            user.setUsername(request.getUsername().trim());
        }

        if (request.getEmail() != null) {
            String normalised = request.getEmail().toLowerCase().trim();
            String newHash = aesEncryptionService.hashEmail(normalised);

            if (!newHash.equals(user.getEmailHash()) && userRepository.existsByEmailHash(newHash)) {
                throw new DuplicateUserException("Email is already registered to another account");
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
            user.setContactNumber(request.getContactNumber());
        }
        if (request.getAadharNumber() != null) {
            if (!request.getAadharNumber().equals(user.getAadharNumber())
                    && userRepository.existsByAadharNumber(request.getAadharNumber())) {
                throw new DuplicateUserException(
                        "Aadhar number '" + request.getAadharNumber() + "' is already registered.");
            }
            user.setAadharNumber(request.getAadharNumber());
        }

        User updated = userRepository.save(user);
        log.info("User profile updated: {}", updated.getUsername());

        return UserResponse.builder()
                .id(updated.getId())
                .username(updated.getUsername())
                // .email(aesEncryptionService.decrypt(updated.getEmail()))
                .email(updated.getEmail())
                .firstName(updated.getFirstName())
                .lastName(updated.getLastName())
                .contactNumber(updated.getContactNumber())
                .aadharNumber(updated.getAadharNumber())
                .role(roleMasterService.roleCode(updated.getRole()))
                .roleId(updated.getRole() != null ? updated.getRole().getId() : null)
                .roleName(updated.getRole() != null ? updated.getRole().getDisplayName() : null)
                .active(updated.isActive())
                .accountNonLocked(updated.isAccountNonLocked())
                .createdAt(updated.getCreatedAt())
                .updatedAt(updated.getUpdatedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public UserResponse getUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                // .email(aesEncryptionService.decrypt(user.getEmail()))
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .contactNumber(user.getContactNumber())
                .aadharNumber(user.getAadharNumber())
                .role(roleMasterService.roleCode(user.getRole()))
                .roleId(user.getRole() != null ? user.getRole().getId() : null)
                .roleName(user.getRole() != null ? user.getRole().getDisplayName() : null)
                .active(user.isActive())
                .accountNonLocked(user.isAccountNonLocked())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }

    @Transactional
    public void requestPasswordReset(PasswordResetRequest request) {
        passwordResetService.createPasswordResetRequest(request.getEmail());
    }

    @Transactional(readOnly = true)
    public boolean isPasswordResetTokenValid(String token) {
        return passwordResetService.isResetTokenValid(token);
    }

    @Transactional
    public void resetPassword(PasswordResetConfirmRequest request, String clientIp) {
        passwordResetService.resetPassword(request.getToken(), request.getNewPassword(),
                request.getConfirmNewPassword(),
                clientIp);
    }

    @Transactional
    public void changePassword(Long userId, PasswordChangeRequest request, String clientIp) {
        if (!request.getNewPassword().equals(request.getConfirmNewPassword())) {
            throw new BadRequestException("New passwords do not match");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        passwordGovernanceService.validatePasswordStrength(request.getNewPassword());
        passwordGovernanceService.validatePasswordReuse(user, request.getNewPassword());

        String previousPasswordHash = user.getPassword();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(user);
        passwordGovernanceService.savePasswordHistory(user, previousPasswordHash);

        try {
            emailService.sendPasswordChangedAlert(user.getEmail(), LocalDateTime.now(), "profile-password-change");
        } catch (RuntimeException ex) {
            log.warn("Password changed for user {} but alert email could not be sent: {}",
                    user.getUsername(), ex.getMessage());
        }
        securityAuditService.logEvent(
                user,
                SecurityEventType.PASSWORD_CHANGED,
                "SUCCESS",
                clientIp,
                user.getEmail(),
                "Password changed via profile");

        log.info("Password changed for user: {}", user.getUsername());
    }

    private boolean isPasswordExpired(User user) {
        LocalDate today = LocalDate.now();

        LocalDate anchorDate = resolvePasswordBaseline(user).toLocalDate();

        LocalDate expiresOn = anchorDate.plusDays(passwordExpiryDays);
        int daysUntilExpiry = (int) ChronoUnit.DAYS.between(today, expiresOn);

        // Password is expired if daysUntilExpiry is negative (already passed expiry
        // date)
        return daysUntilExpiry < 0;
    }

    private LocalDateTime resolvePasswordBaseline(User user) {
        if (user.getPasswordChangedAt() != null) {
            return user.getPasswordChangedAt();
        }
        return user.getCreatedAt();
    }

    private boolean isPasswordChangedAfterRegistration(User user, LocalDateTime passwordBaseline) {
        return user.getCreatedAt() != null && passwordBaseline.isAfter(user.getCreatedAt());
    }

    private String resolvePasswordWarningType(User user, LocalDateTime passwordBaseline) {
        if (!isPasswordChangedAfterRegistration(user, passwordBaseline)) {
            return "REGISTRATION";
        }

        return passwordResetTokenRepository.findTopByUserAndUsedAtIsNotNullOrderByUsedAtDesc(user)
                .map(token -> token.getUsedAt())
                .filter(usedAt -> !usedAt.isBefore(passwordBaseline.minusSeconds(2))
                        && !usedAt.isAfter(passwordBaseline.plusSeconds(2)))
                .map(usedAt -> "PASSWORD_RESET")
                .orElse("PASSWORD_CHANGE");
    }

    private String handleFailedLoginAttempt(User user, String clientIp) {
        LocalDateTime now = LocalDateTime.now();

        if (!user.isAccountNonLocked() && user.getLockedUntil() == null) {
            return "Account is locked. Please contact admin support.";
        }

        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        String lockMessage = null;

        if (attempts >= maxFailedAttempts) {
            user.setFailedLoginAttempts(0);
            int nextLevel = user.getLockoutLevel() + 1;
            user.setLockoutLevel(nextLevel);

            if (nextLevel == 1) {
                LocalDateTime lockUntil = now.plusMinutes(firstLockDurationMinutes);
                user.setAccountNonLocked(false);
                user.setLockedUntil(lockUntil);
                notifyAccountLocked(user, now, "Temporary lock (" + firstLockDurationMinutes + " minutes)");
                lockMessage = "Account locked for " + firstLockDurationMinutes + " minutes due to failed attempts";
                securityAuditService.logEvent(
                        user,
                        SecurityEventType.ACCOUNT_LOCKED_TEMPORARY,
                        "SUCCESS",
                        clientIp,
                        user.getEmail(),
                        "First temporary lock until " + lockUntil);
            } else if (nextLevel == 2) {
                LocalDateTime lockUntil = now.plusMinutes(secondLockDurationMinutes);
                user.setAccountNonLocked(false);
                user.setLockedUntil(lockUntil);
                notifyAccountLocked(user, now, "Temporary lock (" + secondLockDurationMinutes + " minutes)");
                lockMessage = "Account locked for " + secondLockDurationMinutes
                        + " minutes due to repeated failed attempts";
                securityAuditService.logEvent(
                        user,
                        SecurityEventType.ACCOUNT_LOCKED_TEMPORARY,
                        "SUCCESS",
                        clientIp,
                        user.getEmail(),
                        "Second temporary lock until " + lockUntil);
            } else {
                user.setAccountNonLocked(false);
                user.setLockedUntil(null);
                notifyAccountLocked(user, now, "Manual admin unlock is now required");
                lockMessage = "Account locked. Please contact admin support to unlock your account";
                securityAuditService.logEvent(
                        user,
                        SecurityEventType.ACCOUNT_LOCKED_ADMIN_REQUIRED,
                        "SUCCESS",
                        clientIp,
                        user.getEmail(),
                        "Escalated lockout level requires admin unlock");
            }
        } else if (attempts >= Math.max(maxFailedAttempts - 1, 1)) {
            try {
                emailService.sendFailedLoginAlert(user.getEmail(), attempts, now);
            } catch (Exception e) {
                log.warn("Failed to send failed-login alert for user {}", user.getUsername());
            }
        }

        userRepository.save(user);
        return lockMessage;
    }

    private void notifyAccountLocked(User user, LocalDateTime now, String lockContext) {
        try {
            emailService.sendAccountLockAlert(user.getEmail(), now, lockContext);
        } catch (Exception e) {
            log.warn("Failed to send account-lock alert for user {}", user.getUsername());
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    private String resolveBrowser(HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        if (userAgent == null || userAgent.isBlank()) {
            return null;
        }

        String ua = userAgent.toLowerCase(Locale.ROOT);

        if (ua.contains("edg/")) {
            return "Edge";
        }
        if (ua.contains("opr/") || ua.contains("opera")) {
            return "Opera";
        }
        if (ua.contains("chrome/") && !ua.contains("edg/") && !ua.contains("opr/")) {
            return "Chrome";
        }
        if (ua.contains("safari/") && !ua.contains("chrome/")) {
            return "Safari";
        }
        if (ua.contains("firefox/")) {
            return "Firefox";
        }
        if (ua.contains("msie") || ua.contains("trident/")) {
            return "Internet Explorer";
        }
        return "Other";
    }
}
