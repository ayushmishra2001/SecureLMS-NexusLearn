package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RolePermissionResponse {
    private Long roleId;
    private String role;
    private String roleName;
    private List<UserPermissionGlobalGroupResponse> globalLinks;
}
