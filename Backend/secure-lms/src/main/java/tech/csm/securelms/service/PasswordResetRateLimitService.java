package tech.csm.securelms.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import tech.csm.securelms.exception.TooManyRequestsException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Service
@Slf4j
public class PasswordResetRateLimitService {

    @Value("${app.password-reset.rate-limit.window-minutes:15}")
    private long windowMinutes;

    @Value("${app.password-reset.rate-limit.forgot-per-ip:20}")
    private int forgotPerIp;

    @Value("${app.password-reset.rate-limit.forgot-per-email:5}")
    private int forgotPerEmail;

    @Value("${app.password-reset.rate-limit.validate-per-ip:60}")
    private int validatePerIp;

    @Value("${app.password-reset.rate-limit.reset-per-ip:20}")
    private int resetPerIp;

    @Value("${app.password-reset.rate-limit.reset-per-token:8}")
    private int resetPerToken;

    private final Map<String, CounterWindow> counters = new ConcurrentHashMap<>();
    private final AtomicLong hitCounter = new AtomicLong(0);

    public void enforceForgotPasswordLimit(String clientIp, String email) {
        Duration window = Duration.ofMinutes(windowMinutes);
        String ipKey = "fp:ip:" + safeKey(clientIp);
        if (!consume(ipKey, forgotPerIp, window)) {
            log.warn("Forgot-password rate limit exceeded for IP key={}", ipKey);
            throw new TooManyRequestsException("Too many password reset requests. Please try again later.");
        }

        String emailKey = "fp:email:" + hashForKey(normalize(email));
        if (!consume(emailKey, forgotPerEmail, window)) {
            log.warn("Forgot-password rate limit exceeded for email key={}", emailKey);
            throw new TooManyRequestsException("Too many password reset requests. Please try again later.");
        }
    }

    public void enforceValidateTokenLimit(String clientIp, String token) {
        Duration window = Duration.ofMinutes(windowMinutes);
        String ipKey = "vt:ip:" + safeKey(clientIp);
        if (!consume(ipKey, validatePerIp, window)) {
            log.warn("Token-validate rate limit exceeded for IP key={}", ipKey);
            throw new TooManyRequestsException("Too many attempts. Please try again later.");
        }

        if (StringUtils.hasText(token)) {
            String tokenKey = "vt:token:" + hashForKey(token.trim());
            if (!consume(tokenKey, resetPerToken, window)) {
                log.warn("Token-validate rate limit exceeded for token key={}", tokenKey);
                throw new TooManyRequestsException("Too many attempts. Please try again later.");
            }
        }
    }

    public void enforceResetPasswordLimit(String clientIp, String token) {
        Duration window = Duration.ofMinutes(windowMinutes);
        String ipKey = "rp:ip:" + safeKey(clientIp);
        if (!consume(ipKey, resetPerIp, window)) {
            log.warn("Reset-password rate limit exceeded for IP key={}", ipKey);
            throw new TooManyRequestsException("Too many attempts. Please try again later.");
        }

        String tokenKey = "rp:token:" + hashForKey(normalize(token));
        if (!consume(tokenKey, resetPerToken, window)) {
            log.warn("Reset-password rate limit exceeded for token key={}", tokenKey);
            throw new TooManyRequestsException("Too many attempts. Please try again later.");
        }
    }

    private boolean consume(String key, int maxRequests, Duration window) {
        long now = System.currentTimeMillis();
        long windowMs = window.toMillis();
        CounterWindow counter = counters.computeIfAbsent(key, k -> new CounterWindow(now));

        boolean allowed;
        synchronized (counter) {
            if (now - counter.windowStartMs >= windowMs) {
                counter.windowStartMs = now;
                counter.count = 0;
            }
            counter.lastSeenMs = now;
            allowed = counter.count < maxRequests;
            if (allowed) {
                counter.count++;
            }
        }

        cleanupOccasionally(now, windowMs);
        return allowed;
    }

    private void cleanupOccasionally(long now, long windowMs) {
        long count = hitCounter.incrementAndGet();
        if (count % 1024 != 0) {
            return;
        }
        long maxIdle = windowMs * 4;
        counters.entrySet().removeIf(entry -> now - entry.getValue().lastSeenMs > maxIdle);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private String safeKey(String value) {
        return StringUtils.hasText(value) ? value.trim() : "unknown";
    }

    private String hashForKey(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception ex) {
            throw new RuntimeException("Unable to hash rate-limit key", ex);
        }
    }

    private static final class CounterWindow {
        private long windowStartMs;
        private long lastSeenMs;
        private int count;

        private CounterWindow(long now) {
            this.windowStartMs = now;
            this.lastSeenMs = now;
        }
    }
}
