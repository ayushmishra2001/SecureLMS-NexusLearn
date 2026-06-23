package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class UserResponse {
    private Long id;
    private String username;
    // private String encryptedEmail;
    private String email;
    private String firstName;
    private String lastName;
    private String contactNumber;
    private String aadharNumber;
    private String role;
    private Long roleId;
    private String roleName;
    private Long groupId;
    private String groupName;
    private boolean active;
    private boolean accountNonLocked;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
