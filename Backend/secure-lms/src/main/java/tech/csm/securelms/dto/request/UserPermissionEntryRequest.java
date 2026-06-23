package tech.csm.securelms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserPermissionEntryRequest {

    @NotNull(message = "Function link id is required")
    private Long functionLinkId;

    @NotNull(message = "canView is required")
    private Boolean canView;

    @NotNull(message = "canAdd is required")
    private Boolean canAdd;

    @NotNull(message = "canManage is required")
    private Boolean canManage;
}

