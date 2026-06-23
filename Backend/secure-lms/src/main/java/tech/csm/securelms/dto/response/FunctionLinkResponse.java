package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FunctionLinkResponse {
    private Long id;
    private String displayName;
    private String routePath;
    private Integer orderIndex;
    private boolean active;
    private long activePrimaryLinkCount;
    private long mappedUserCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
