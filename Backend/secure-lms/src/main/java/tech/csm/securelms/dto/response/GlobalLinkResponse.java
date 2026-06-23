package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class GlobalLinkResponse {
    private Long id;
    private String displayName;
    private Integer orderIndex;
    private boolean active;
    private long activePrimaryLinkCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
