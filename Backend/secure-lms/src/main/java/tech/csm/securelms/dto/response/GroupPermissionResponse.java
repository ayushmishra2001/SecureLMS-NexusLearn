package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class GroupPermissionResponse {
    private Long groupId;
    private String groupName;
    private List<UserPermissionGlobalGroupResponse> globalLinks;
}
