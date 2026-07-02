package tech.csm.securelms.service;

import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OtpService {

    private static class OtpRecord {
        String otp;
        String email;
        LocalDateTime expiry;

        OtpRecord(String otp, String email, LocalDateTime expiry) {
            this.otp = otp;
            this.email = email;
            this.expiry = expiry;
        }
    }

    private final Map<String, OtpRecord> otpCache = new ConcurrentHashMap<>();

    // Generates OTP, stores it in cache, and returns the preAuthToken
    public String generateAndStoreOtp(String email) {
        String otp = String.format("%06d", (int)(Math.random() * 1000000));
        String preAuthToken = UUID.randomUUID().toString();
        
        OtpRecord record = new OtpRecord(otp, email, LocalDateTime.now().plusMinutes(5));
        otpCache.put(preAuthToken, record);
        
        return preAuthToken;
    }
    
    // Returns the OTP so EmailService can send it
    public String getOtpByPreAuthToken(String preAuthToken) {
        OtpRecord record = otpCache.get(preAuthToken);
        return record != null ? record.otp : null;
    }

    // Returns the email for a given token (even if expired, as long as it's in cache)
    public String getEmailByPreAuthToken(String preAuthToken) {
        OtpRecord record = otpCache.get(preAuthToken);
        return record != null ? record.email : null;
    }

    // Validates OTP. If valid, returns the email and clears the cache entry.
    public String validateOtp(String preAuthToken, String otp) {
        OtpRecord record = otpCache.get(preAuthToken);
        if (record == null) {
            return null; // Invalid or expired token
        }
        
        if (LocalDateTime.now().isAfter(record.expiry)) {
            otpCache.remove(preAuthToken);
            return null; // Expired
        }
        
        if (record.otp.equals(otp)) {
            otpCache.remove(preAuthToken); // Consume it
            return record.email;
        }
        
        return null; // Incorrect OTP
    }
}
