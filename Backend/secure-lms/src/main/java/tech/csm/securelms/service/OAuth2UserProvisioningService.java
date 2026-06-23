package tech.csm.securelms.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.constants.RoleCodes;
import tech.csm.securelms.entity.User;
import tech.csm.securelms.repository.UserRepository;
import tech.csm.securelms.security.UserPrincipal;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OAuth2UserProvisioningService {

    private static final OAuth2Error OAUTH2_ERROR = new OAuth2Error("oauth2_login_error");

    private final UserRepository userRepository;
    private final AesEncryptionService aesEncryptionService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final RoleMasterService roleMasterService;

    @Transactional
    public UserPrincipal provisionAndLoadPrincipal(OAuth2User oauth2User) {
        String email = extractEmail(oauth2User);
        String normalizedEmail = email.toLowerCase(Locale.ROOT).trim();
        String emailHash = aesEncryptionService.hashEmail(normalizedEmail);

        Optional<User> existing = userRepository.findByEmailHash(emailHash);
        User user = existing.orElseGet(() -> createFromOauthUser(oauth2User, normalizedEmail, emailHash));

        if (!user.isAccountNonLocked() && user.getLockedUntil() != null &&
                user.getLockedUntil().isBefore(LocalDateTime.now())) {
            user.setAccountNonLocked(true);
            user.setLockedUntil(null);
            user.setFailedLoginAttempts(0);
            user = userRepository.save(user);
        }

        if (!user.isActive()) {
            throw oauth2Error("This account is inactive. Contact support.");
        }
        if (!user.isAccountNonLocked()) {
            throw oauth2Error("This account is locked. Contact support.");
        }

        return UserPrincipal.create(user);
    }

    private User createFromOauthUser(OAuth2User oauth2User, String normalizedEmail, String emailHash) {
        String username = generateUniqueUsername(normalizedEmail);
        String[] names = resolveNames(oauth2User, username);

        User user = User.builder()
                .username(username)
                .email(normalizedEmail)
                .emailHash(emailHash)
                .password(passwordEncoder.encode(UUID.randomUUID() + "_Aa1!"))
                .firstName(names[0])
                .lastName(names[1])
                .role(roleMasterService.findAssignableActiveByCode(RoleCodes.STUDENT))
                .active(true)
                .accountNonLocked(true)
                .build();
        return userRepository.save(user);
    }

    private String extractEmail(OAuth2User oauth2User) {
        Object emailValue = oauth2User.getAttributes().get("email");
        if (emailValue == null || emailValue.toString().isBlank()) {
            throw oauth2Error("Email is not available from OAuth provider.");
        }
        return emailValue.toString();
    }

    private String[] resolveNames(OAuth2User oauth2User, String username) {
        String firstName = asTrimmedString(oauth2User.getAttributes().get("given_name"));
        String lastName = asTrimmedString(oauth2User.getAttributes().get("family_name"));

        if (firstName == null && lastName == null) {
            String fullName = asTrimmedString(oauth2User.getAttributes().get("name"));
            if (fullName != null) {
                String[] parts = fullName.split("\\s+", 2);
                firstName = parts[0];
                lastName = parts.length > 1 ? parts[1] : null;
            }
        }

        if (firstName == null) {
            firstName = username;
        }
        if (lastName == null) {
            lastName = "";
        }
        return new String[] { trimToLength(firstName, 50), trimToLength(lastName, 50) };
    }

    private String asTrimmedString(Object value) {
        if (value == null) {
            return null;
        }
        String text = value.toString().trim();
        return text.isEmpty() ? null : text;
    }

    private String generateUniqueUsername(String email) {
        String base = email.substring(0, email.indexOf('@'))
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9_]", "");
        if (base.isBlank()) {
            base = "user" + new SecureRandom().nextInt(10_000);
        }
        base = trimToLength(base, 40);

        String candidate = base;
        int counter = 1;
        while (userRepository.existsByUsername(candidate)) {
            candidate = trimToLength(base, Math.max(1, 40 - String.valueOf(counter).length())) + counter;
            counter++;
        }
        return candidate;
    }

    private String trimToLength(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    private OAuth2AuthenticationException oauth2Error(String message) {
        return new OAuth2AuthenticationException(OAUTH2_ERROR, message);
    }
}
