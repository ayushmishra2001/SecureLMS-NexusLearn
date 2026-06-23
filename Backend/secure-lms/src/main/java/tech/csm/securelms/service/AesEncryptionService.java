package tech.csm.securelms.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * AES-256-GCM encryption + HMAC-SHA256 hashing for email fields.
 *
 * - encrypt/decrypt : AES-GCM with random IV - for storing and displaying email.
 * - hashEmail : HMAC-SHA256 with the same key - deterministic, used for DB lookups.
 */
@Service
@Slf4j
public class AesEncryptionService {

    private static final String AES_ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;

    @Value("${app.aes.secret-key}")
    private String base64SecretKey;

    // -- Key helpers ----------------------------------------------------------

    private byte[] getRawKeyBytes() {
        byte[] decoded = Base64.getMimeDecoder().decode(base64SecretKey.trim());
        byte[] keyBytes = new byte[32];
        System.arraycopy(decoded, 0, keyBytes, 0, Math.min(decoded.length, 32));
        return keyBytes;
    }

    private SecretKey getAesKey() {
        return new SecretKeySpec(getRawKeyBytes(), "AES");
    }

    // -- AES-256-GCM encrypt / decrypt ----------------------------------------

    /**
     * Encrypts plaintext. Each call produces a different result (random IV).
     * Returns: BASE64(IV) + ":" + BASE64(ciphertext+tag)
     */
    public String encrypt(String plaintext) {
        if (plaintext == null) {
            return null;
        }
        log.debug("Encrypting email: {}", plaintext);
        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(AES_ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, getAesKey(),
                    new GCMParameterSpec(GCM_TAG_LENGTH, iv));

            byte[] ciphertext = cipher.doFinal(
                    plaintext.getBytes(StandardCharsets.UTF_8));

            String encrypted = Base64.getEncoder().encodeToString(iv)
                    + ":"
                    + Base64.getEncoder().encodeToString(ciphertext);
            log.debug("Encrypted result: {}", encrypted);
            return encrypted;

        } catch (Exception e) {
            log.error("AES encryption error: {}", e.getMessage());
            throw new RuntimeException("AES encryption failed", e);
        }
    }

    /**
     * Decrypts a value produced by {@link #encrypt(String)}.
     * Falls back to returning plaintext as-is for backward compatibility
     * with existing unencrypted DB values.
     */
    public String decrypt(String encryptedData) {
        if (encryptedData == null) {
            return null;
        }

        log.debug("Decrypting data: {}", encryptedData);

        // Backward compatibility: if value is not in IV:CIPHERTEXT format,
        // it is a plain text value (existing DB record) - return as-is
        if (!encryptedData.contains(":")) {
            log.warn("Decrypt called on a non-encrypted value; returning plaintext for backward compatibility");
            return encryptedData;
        }

        try {
            String[] parts = encryptedData.split(":", 2);
            if (parts.length != 2) {
                log.warn("Invalid encrypted format, returning as-is");
                return encryptedData;
            }

            byte[] iv = Base64.getDecoder().decode(parts[0]);
            byte[] ciphertext = Base64.getDecoder().decode(parts[1]);

            Cipher cipher = Cipher.getInstance(AES_ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, getAesKey(),
                    new GCMParameterSpec(GCM_TAG_LENGTH, iv));

            String decrypted = new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
            log.debug("Decrypted result: {}", decrypted);
            return decrypted;

        } catch (Exception e) {
            log.error("AES decryption error for value - returning as-is: {}", e.getMessage());
            // Last resort fallback: return original value rather than crashing
            return encryptedData;
        }
    }

    // -- HMAC-SHA256 hash (deterministic) -------------------------------------

    /**
     * Produces a deterministic 64-char hex HMAC-SHA256 of the normalised email.
     * Always call this with a lowercased, trimmed email.
     * Used ONLY for database lookups - never stored as the displayable email.
     */
    public String hashEmail(String normalizedEmail) {
        if (normalizedEmail == null) {
            return null;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(getRawKeyBytes(), "HmacSHA256"));
            byte[] hashBytes = mac.doFinal(
                    normalizedEmail.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes); // 64 hex chars
        } catch (Exception e) {
            log.error("HMAC hashing error: {}", e.getMessage());
            throw new RuntimeException("Email hashing failed", e);
        }
    }
}
