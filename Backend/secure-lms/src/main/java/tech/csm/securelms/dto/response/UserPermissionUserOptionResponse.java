package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserPermissionUserOptionResponse {
    private Long id;
    private String username;
    private String fullName;
    private boolean hasPermissions;
}

