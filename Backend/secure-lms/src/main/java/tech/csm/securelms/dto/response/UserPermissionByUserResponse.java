package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class UserPermissionByUserResponse {
    private Long userId;
    private List<UserPermissionGlobalGroupResponse> globalLinks;
}

