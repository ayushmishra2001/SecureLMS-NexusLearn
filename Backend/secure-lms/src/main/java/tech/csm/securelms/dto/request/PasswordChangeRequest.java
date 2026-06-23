package tech.csm.securelms.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class PasswordChangeRequest {
    @NotBlank
    private String currentPassword;

    @NotBlank
    @Size(min = 8, max = 128)
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,}$",
        message = "Password must contain uppercase, lowercase, digit and special character")
    private String newPassword;

    @NotBlank
    private String confirmNewPassword;
}
