package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AuthResponse {
    private Long userId;
    private String username;
    private String email;
    private String role;
    private Long roleId;
    private String roleName;
    private String preAuthToken;
}
