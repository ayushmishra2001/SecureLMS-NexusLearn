package tech.csm.securelms.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;

@Data
public class GroupMasterRequest {

    @NotBlank(message = "Group name is required")
    @Size(max = 100, message = "Group name must be less than 100 characters")
    private String groupName;

    @Size(max = 500, message = "Description must be less than 500 characters")
    private String description;

    private Boolean active;
    
    // Optional: when creating a group, admin can assign specific roles that are exclusive or mapped to this group
    private List<Long> roleIds;

    private List<Long> userIds;
}
