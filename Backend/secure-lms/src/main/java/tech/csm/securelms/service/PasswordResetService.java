package tech.csm.securelms.service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.session.SessionInformation;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import tech.csm.securelms.entity.PasswordResetToken;
import tech.csm.securelms.entity.User;
import tech.csm.securelms.enums.SecurityEventType;
import tech.csm.securelms.exception.BadRequestException;
import tech.csm.securelms.repository.PasswordResetTokenRepository;
import tech.csm.securelms.repository.UserRepository;
import tech.csm.securelms.security.UserPrincipal;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AesEncryptionService aesEncryptionService;
    private final EmailService emailService;
    private final PasswordGovernanceService passwordGovernanceService;
    private final SecurityAuditService securityAuditService;
    private final SessionRegistry sessionRegistry;

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.password-reset.token-expiry-minutes:20}")
    private long tokenExpiryMinutes;

    @Value("${app.frontend.base-url:http://localhost:4200}")
    private String frontendBaseUrl;

    @PostConstruct
    void validateConfiguration() {
        validateFrontendBaseUrl(frontendBaseUrl);
    }

    @Transactional
    public void createPasswordResetRequest(String email) {
        String normalised = email.toLowerCase().trim();
        String emailHash = aesEncryptionService.hashEmail(normalised);
        Optional<User> userOptional = userRepository.findByEmailHash(emailHash);
        userOptional.ifPresent(user -> {
            LocalDateTime now = LocalDateTime.now();
            invalidateActiveTokens(user, now);

            String rawToken = generateToken();
            PasswordResetToken token = PasswordResetToken.builder()
                    .user(user)
                    .tokenHash(hashToken(rawToken))
                    .expiresAt(now.plusMinutes(tokenExpiryMinutes))
                    .build();
            passwordResetTokenRepository.save(token);

            String resetLink = buildResetLink(rawToken);
            try {
                emailService.sendPasswordResetLink(user.getEmail(), resetLink, tokenExpiryMinutes);
            } catch (RuntimeException ex) {
                log.error("Password reset email failed for userId={}: {}", user.getId(), ex.getMessage(), ex);
            }

            securityAuditService.logEvent(
                    user,
                    SecurityEventType.PASSWORD_RESET_REQUESTED,
                    "SUCCESS",
                    null,
                    user.getEmail(),
                    "Password reset link issued");
        });

        if (userOptional.isEmpty()) {
            securityAuditService.logEvent(
                    null,
                    SecurityEventType.PASSWORD_RESET_REQUESTED,
                    "IGNORED",
                    null,
                    normalised,
                    "Password reset requested for non-existing account");
        }
    }

    @Transactional(readOnly = true)
    public boolean isResetTokenValid(String rawToken) {
        if (!StringUtils.hasText(rawToken)) {
            return false;
        }

        Optional<PasswordResetToken> token = passwordResetTokenRepository.findByTokenHash(hashToken(rawToken.trim()));
        if (token.isEmpty()) {
            return false;
        }

        PasswordResetToken resetToken = token.get();
        LocalDateTime now = LocalDateTime.now();
        return resetToken.getUsedAt() == null && resetToken.getExpiresAt().isAfter(now);
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword, String confirmNewPassword, String clientIp) {
        if (!newPassword.equals(confirmNewPassword)) {
            throw new BadRequestException("New passwords do not match");
        }

        PasswordResetToken resetToken = findValidTokenForUpdate(rawToken);
        User user = resetToken.getUser();

        passwordGovernanceService.validatePasswordStrength(newPassword);
        passwordGovernanceService.validatePasswordReuse(user, newPassword);

        LocalDateTime now = LocalDateTime.now();
        String previousPasswordHash = user.getPassword();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(now);
        user.setFailedLoginAttempts(0);
        user.setLockoutLevel(0);
        user.setLockedUntil(null);
        user.setAccountNonLocked(true);
        userRepository.save(user);
        passwordGovernanceService.savePasswordHistory(user, previousPasswordHash);
        invalidateUserSessions(user);

        resetToken.setUsedAt(now);
        passwordResetTokenRepository.save(resetToken);
        invalidateActiveTokens(user, now);

        try {
            emailService.sendPasswordResetConfirmation(user.getEmail());
            emailService.sendPasswordChangedAlert(user.getEmail(), now, "email-reset-flow");
        } catch (RuntimeException ex) {
            log.warn("Password reset confirmation email failed for userId={}: {}", user.getId(), ex.getMessage());
        }

        securityAuditService.logEvent(
                user,
                SecurityEventType.PASSWORD_RESET_COMPLETED,
                "SUCCESS",
                clientIp,
                user.getEmail(),
                "Password reset completed via token link");

        log.info("Password reset completed for user: {}", user.getUsername());
    }

    private PasswordResetToken findValidTokenForUpdate(String rawToken) {
        if (!StringUtils.hasText(rawToken)) {
            throw new BadRequestException("Invalid or expired reset link");
        }

        PasswordResetToken token = passwordResetTokenRepository
                .findForUpdateByTokenHash(hashToken(rawToken.trim()))
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset link"));

        LocalDateTime now = LocalDateTime.now();
        if (token.getUsedAt() != null) {
            throw new BadRequestException("This reset link has already been used");
        }
        if (token.getExpiresAt().isBefore(now)) {
            throw new BadRequestException("This reset link has expired");
        }

        return token;
    }

    private void invalidateActiveTokens(User user, LocalDateTime now) {
        List<PasswordResetToken> activeTokens = passwordResetTokenRepository
                .findByUserAndUsedAtIsNullAndExpiresAtAfter(user, now);
        for (PasswordResetToken token : activeTokens) {
            token.setUsedAt(now);
        }
        if (!activeTokens.isEmpty()) {
            passwordResetTokenRepository.saveAll(activeTokens);
        }
    }

    private String generateToken() {
        byte[] tokenBytes = new byte[32];
        secureRandom.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new RuntimeException("Unable to hash reset token", ex);
        }
    }

    private String buildResetLink(String rawToken) {
        validateFrontendBaseUrl(frontendBaseUrl);
        String baseUrl = frontendBaseUrl.endsWith("/")
                ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
                : frontendBaseUrl;
        String encodedToken = URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
        //return baseUrl + "/reset-password.html?token=" + encodedToken;
        return baseUrl + "/reset-password?token=" + encodedToken;
    }

    private void invalidateUserSessions(User user) {
        long expiredCount = 0;
        for (Object principal : sessionRegistry.getAllPrincipals()) {
            if (!(principal instanceof UserPrincipal userPrincipal)) {
                continue;
            }
            if (!user.getId().equals(userPrincipal.getId())) {
                continue;
            }
            for (SessionInformation session : sessionRegistry.getAllSessions(principal, false)) {
                session.expireNow();
                sessionRegistry.removeSessionInformation(session.getSessionId());
                expiredCount++;
            }
        }
        log.info("Expired {} active session(s) after password reset for userId={}", expiredCount, user.getId());
    }

    private void validateFrontendBaseUrl(String baseUrl) {
        try {
            URI uri = new URI(baseUrl);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (!StringUtils.hasText(scheme) || !StringUtils.hasText(host)) {
                throw new IllegalStateException("app.frontend.base-url must be an absolute URL");
            }

            boolean localhost = "localhost".equalsIgnoreCase(host)
                    || "127.0.0.1".equals(host)
                    || "::1".equals(host);

            if (!localhost && !"https".equalsIgnoreCase(scheme)) {
                throw new IllegalStateException(
                        "app.frontend.base-url must use HTTPS outside localhost");
            }
        } catch (Exception ex) {
            throw new IllegalStateException("Invalid app.frontend.base-url configuration", ex);
        }
    }
}
