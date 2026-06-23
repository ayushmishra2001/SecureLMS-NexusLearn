package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserPermissionFunctionRowResponse {
    private Long functionLinkId;
    private String functionLinkName;
    private PermissionFlagsResponse permissions;
}

