package tech.csm.securelms.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserUpdateRequest {

    @Size(min = 3, max = 50, message = "Username must be 3-50 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_]+$", message = "Username may only contain letters, digits, and underscores")
    private String username;

    @Email(message = "Please enter a valid email address")
    @Size(max = 100, message = "Email must be at most 100 characters")
    private String email;

    @Size(min = 8, max = 128, message = "Password must be 8-128 characters")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]{8,}$", message = "Password must contain uppercase, lowercase, digit and special character")
    private String password;

    private String confirmPassword;

    @Size(min = 1, max = 50, message = "First name must be 1-50 characters")
    private String firstName;

    @Size(min = 1, max = 50, message = "Last name must be 1-50 characters")
    private String lastName;

    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Contact number must be a valid 10-digit Indian mobile number starting with 6-9")
    private String contactNumber;

    @Pattern(regexp = "^\\d{12}$", message = "Aadhar number must be exactly 12 digits")
    private String aadharNumber;

    private String role;

    private Boolean active;

    private Long groupId;
}
