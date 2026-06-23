package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data @Builder
public class ModuleResponse {
    private Long id;
    private String title;
    private String content;
    private String resourceUrl;
    private String moduleType;
    private Integer orderIndex;
    private Integer durationMinutes;
    private boolean active;
    private Long courseId;
    private String courseTitle;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
