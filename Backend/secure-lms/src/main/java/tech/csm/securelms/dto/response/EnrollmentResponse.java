package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class EnrollmentResponse {
    private Long id;
    private Long studentId;
    private String studentUsername;
    private Long courseId;
    private String courseTitle;
    private Integer progressPercent;
    private Integer completedModuleCount;
    private Integer totalModuleCount;
    private boolean active;
    private LocalDateTime enrolledAt;
    private LocalDateTime completedAt;
    private java.util.Set<Long> completedModuleIds;
}
