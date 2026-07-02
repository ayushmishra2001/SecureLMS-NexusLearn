package tech.csm.securelms.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyOtpRequest {
    @NotBlank(message = "Pre-Auth Token is required")
    private String preAuthToken;

    @NotBlank(message = "OTP is required")
    private String otp;
}
