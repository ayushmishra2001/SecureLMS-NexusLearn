package tech.csm.securelms.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.entity.PasswordHistory;
import tech.csm.securelms.entity.User;
import tech.csm.securelms.exception.BadRequestException;
import tech.csm.securelms.repository.PasswordHistoryRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PasswordGovernanceService {

    private final PasswordEncoder passwordEncoder;
    private final PasswordHistoryRepository passwordHistoryRepository;

    @Value("${app.security.password.history.count:3}")
    private int historyCount;

    @Value("${app.security.password.history.days:15}")
    private int historyDays;

    @Value("${app.security.password.block-common:true}")
    private boolean blockCommonPasswords;

    private static final Set<String> COMMON_PASSWORDS = Set.of(
            "password",
            "password123",
            "admin123",
            "qwerty123",
            "welcome123",
            "letmein123",
            "12345678",
            "123456789",
            "securelms123");

    @Transactional(readOnly = true)
    public void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new BadRequestException("Password must be at least 8 characters");
        }
        if (!password.matches(".*[A-Z].*")
                || !password.matches(".*[a-z].*")
                || !password.matches(".*\\d.*")
                || !password.matches(".*[@$!%*?&#].*")) {
            throw new BadRequestException(
                    "Password must contain uppercase, lowercase, digit and special character");
        }

        if (blockCommonPasswords && COMMON_PASSWORDS.contains(password.toLowerCase(Locale.ROOT))) {
            throw new BadRequestException("Choose a stronger password that is not commonly used");
        }
    }

    @Transactional(readOnly = true)
    public void validatePasswordReuse(User user, String newPassword) {
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new BadRequestException("New password must be different from current password");
        }

        List<PasswordHistory> recentHistory = passwordHistoryRepository
                .findByUserAndExpiresAtAfterOrderByCreatedAtDesc(
                        user,
                        LocalDateTime.now(),
                        PageRequest.of(0, Math.max(historyCount, 1)));

        for (PasswordHistory history : recentHistory) {
            if (passwordEncoder.matches(newPassword, history.getPasswordHash())) {
                throw new BadRequestException(
                        "You cannot reuse any of your last " + historyCount + " passwords within " + historyDays
                                + " days");
            }
        }
    }

    @Transactional
    public void savePasswordHistory(User user, String previousPasswordHash) {
        LocalDateTime now = LocalDateTime.now();
        PasswordHistory history = PasswordHistory.builder()
                .user(user)
                .passwordHash(previousPasswordHash)
                .createdAt(now)
                .expiresAt(now.plusDays(historyDays))
                .build();
        passwordHistoryRepository.save(history);

        passwordHistoryRepository.deleteAllByExpiresAtBefore(now);

        List<PasswordHistory> allHistory = passwordHistoryRepository.findByUserOrderByCreatedAtDesc(user);
        if (allHistory.size() > historyCount) {
            List<PasswordHistory> removable = allHistory.subList(historyCount, allHistory.size());
            passwordHistoryRepository.deleteAll(removable);
        }
    }
}
