package tech.csm.securelms.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class UserPermissionSaveRequest {

    @NotEmpty(message = "At least one user must be selected")
    private List<Long> userIds;

    @Valid
    @NotEmpty(message = "Permission entries are required")
    private List<UserPermissionEntryRequest> permissions;
}

