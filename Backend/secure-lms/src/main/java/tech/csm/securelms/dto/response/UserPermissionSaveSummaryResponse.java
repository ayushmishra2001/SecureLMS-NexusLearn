package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserPermissionSaveSummaryResponse {
    private int usersAffected;
    private int grantedCount;
    private int revokedCount;
}

