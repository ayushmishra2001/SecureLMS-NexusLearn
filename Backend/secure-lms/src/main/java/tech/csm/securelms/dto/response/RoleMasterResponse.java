package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class RoleMasterResponse {
    private Long id;
    private String code;
    private String displayName;
    private String description;
    private boolean active;
    private boolean systemRole;
    private boolean assignable;
    private int sortOrder;
    private long userCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private java.util.List<Long> groupIds;
}

