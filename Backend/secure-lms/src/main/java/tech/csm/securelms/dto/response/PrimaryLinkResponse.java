package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PrimaryLinkResponse {
    private Long id;
    private Long globalLinkId;
    private String globalLinkName;
    private Long functionLinkId;
    private String functionLinkName;
    private String displayName;
    private Integer orderIndex;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
