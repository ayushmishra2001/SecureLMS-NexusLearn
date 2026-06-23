package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PermissionFlagsResponse {
    private boolean canView;
    private boolean canAdd;
    private boolean canManage;
}

