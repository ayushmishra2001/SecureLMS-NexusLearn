package tech.csm.securelms.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    public void sendPasswordResetLink(String toEmail, String resetLink, long expiryMinutes) {
        String subject = "SecureLMS Password Reset Link";
        String text = "We received a request to reset your SecureLMS password.\n\n" +
                "Use the link below to set a new password:\n" +
                resetLink + "\n\n" +
                "This link expires in " + expiryMinutes + " minutes and can only be used once.\n" +
                "If you did not request this, please ignore this email.";

        sendEmail(toEmail, subject, text, "password reset link");
    }

    public void sendPasswordResetConfirmation(String toEmail) {
        String subject = "SecureLMS Password Changed";
        String text = "Your SecureLMS password has been changed successfully.\n\n" +
                "If you did not make this change, contact support immediately.";

        sendEmail(toEmail, subject, text, "password reset confirmation");
    }

    public void sendFailedLoginAlert(String toEmail, int failedAttempts, LocalDateTime when) {
        String subject = "SecureLMS Security Alert: Failed Login Attempts";
        String text = "We detected multiple failed login attempts on your account.\n\n" +
                "Attempts: " + failedAttempts + "\n" +
                "Time: " + when + "\n\n" +
                "If this was not you, please reset your password immediately.";
        sendEmail(toEmail, subject, text, "failed-login alert");
    }

    public void sendAccountLockAlert(String toEmail, LocalDateTime when, String lockContext) {
        String subject = "SecureLMS Security Alert: Account Locked";
        String text = "Your SecureLMS account has been locked as a security measure.\n\n" +
                "Time: " + when + "\n" +
                "Lock reason: " + lockContext + "\n\n" +
                "If this was not you, contact support.";
        sendEmail(toEmail, subject, text, "account-locked alert");
    }

    public void sendPasswordChangedAlert(String toEmail, LocalDateTime when, String source) {
        String subject = "SecureLMS Security Alert: Password Changed";
        String text = "Your SecureLMS password was changed.\n\n" +
                "Time: " + when + "\n" +
                "Source: " + source + "\n\n" +
                "If you did not perform this action, contact support immediately.";
        sendEmail(toEmail, subject, text, "password-changed alert");
    }

    public void sendRegistrationWelcome(String toEmail, String firstName, String username, String role) {
        String subject = "Welcome to SecureLMS - Registration Successful";

        String roleLabel;
        switch (role) {
            case "TRAINER" -> roleLabel = "Trainer";
            case "ADMIN" -> roleLabel = "Administrator";
            default -> roleLabel = "Student";
        }

        String text = "Hi " + firstName + ",\n\n" +
                "Your SecureLMS account has been created successfully.\n\n" +
                "Here are your account details:\n" +
                "  Username : " + username + "\n" +
                "  Role     : " + roleLabel + "\n\n" +
                "You can now log in at any time using your registered email and password.\n\n" +
                "If you did not create this account, please contact support immediately.\n\n" +
                "Welcome aboard,\n" +
                "The SecureLMS Team";

        sendEmail(toEmail, subject, text, "registration welcome");
    }

    public void sendOtpEmail(String toEmail, String otp) {
        String subject = "SecureLMS - Your One-Time Password (OTP)";
        String text = "Hello,\n\n" +
                "Your OTP for SecureLMS authentication is: " + otp + "\n\n" +
                "This OTP will expire in 5 minutes.\n\n" +
                "If you did not attempt to log in, please secure your account immediately.\n\n" +
                "The SecureLMS Team";

        sendEmail(toEmail, subject, text, "login OTP");
    }

    private void sendEmail(String toEmail, String subject, String text, String emailType) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(text);

        try {
            mailSender.send(message);
            log.info("Sent {} email to {}", emailType, toEmail);
        } catch (Exception ex) {
            log.error("Failed to send {} email to {}: {}", emailType, toEmail, ex.getMessage(), ex);
            throw new RuntimeException("Unable to send email. Please check mail server settings.", ex);
        }
    }
}

