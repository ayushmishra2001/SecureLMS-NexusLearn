package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class UserPermissionGlobalGroupResponse {
    private Long globalLinkId;
    private String globalLinkName;
    private Integer orderIndex;
    private List<UserPermissionFunctionRowResponse> functionLinks;
}

