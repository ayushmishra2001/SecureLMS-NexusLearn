package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data @Builder
public class CourseResponse {
    private Long id;
    private String title;
    private String description;
    private String category;
    private String difficultyLevel;
    private Integer durationHours;
    private boolean published;
    private boolean active;
    private String createdByUsername;
    private Long createdById;
    private int moduleCount;
    private int enrollmentCount;
    private List<ModuleResponse> modules;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
