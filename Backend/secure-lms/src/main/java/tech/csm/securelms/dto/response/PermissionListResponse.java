package tech.csm.securelms.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PermissionListResponse {
    private Long id;
    private String entityType; // "ROLE" or "USER"
    private Long entityId;
    private String entityName;
    private Long functionLinkId;
    private String functionLinkName;
    private String globalLinkName;
    private boolean canView;
    private boolean canAdd;
    private boolean canManage;
}
