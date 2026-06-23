package tech.csm.securelms.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class GroupPermissionSaveRequest {
    @NotNull(message = "Permissions list cannot be null")
    @Valid
    private List<UserPermissionEntryRequest> permissions;
}
