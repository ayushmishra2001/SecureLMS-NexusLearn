package tech.csm.securelms.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "Email, username, or contact number is required")
    private String identifier;

    @NotBlank(message = "Password is required")
    private String password;
}
