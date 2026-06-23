package tech.csm.securelms.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class RolePermissionSaveRequest {

    @NotEmpty(message = "Permission entries are required")
    @Valid
    private List<UserPermissionEntryRequest> permissions;
}
