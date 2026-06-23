package tech.csm.securelms.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RoleMasterRequest {

    @NotBlank(message = "Role code is required")
    @Size(max = 50, message = "Role code must be at most 50 characters")
    @Pattern(regexp = "^[A-Za-z][A-Za-z0-9_]*$", message = "Role code must start with a letter and contain only letters, digits, and underscores")
    private String code;

    @NotBlank(message = "Display name is required")
    @Size(max = 100, message = "Display name must be at most 100 characters")
    private String displayName;

    @Size(max = 500, message = "Description must be at most 500 characters")
    private String description;

    private Boolean active = true;

    private Boolean assignable = true;

    private Integer sortOrder = 0;

    private Long clonePermissionsFromRoleId;

    private java.util.List<Long> groupIds;
}

