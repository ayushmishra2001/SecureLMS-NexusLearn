package tech.csm.securelms.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.csm.securelms.entity.User;
import tech.csm.securelms.repository.UserRepository;
import tech.csm.securelms.service.AesEncryptionService;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final AesEncryptionService aesEncryptionService;

    /**
     * Called by Spring Security during login.
     * "username" here is actually the email address submitted on the login form.
     */
    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email)
            throws UsernameNotFoundException {

        // Normalise -> hash -> look up (deterministic, always matches)
        String normalised = email.toLowerCase().trim();
        String emailHash = aesEncryptionService.hashEmail(normalised);

        User user = userRepository.findByEmailHash(emailHash)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "No account found for: " + email));

        autoUnlockIfTemporaryLockExpired(user);

        // Email is stored plain in database
        return UserPrincipal.create(user);
    }

    @Transactional(readOnly = true)
    public UserDetails loadUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "No account found for id: " + id));
        // Email is stored plain in database
        return UserPrincipal.create(user);
    }

    private void autoUnlockIfTemporaryLockExpired(User user) {
        if (user.isAccountNonLocked()) {
            return;
        }
        if (user.getLockedUntil() == null) {
            return;
        }

        if (user.getLockedUntil().isBefore(LocalDateTime.now())) {
            user.setAccountNonLocked(true);
            user.setLockedUntil(null);
            user.setFailedLoginAttempts(0);
            userRepository.save(user);
        }
    }
}

