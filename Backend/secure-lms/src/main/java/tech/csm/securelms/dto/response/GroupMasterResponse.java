package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class GroupMasterResponse {
    private Long id;
    private String groupName;
    private String description;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private long userCount;
    private List<RoleMasterResponse> roles;
}
