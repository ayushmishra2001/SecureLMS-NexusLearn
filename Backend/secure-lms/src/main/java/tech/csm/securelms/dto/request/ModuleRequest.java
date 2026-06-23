package tech.csm.securelms.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class ModuleRequest {
    @NotBlank(message = "Module title is required")
    @Size(min = 3, max = 150)
    private String title;

    @NotBlank(message = "Content is required")
    private String content;

    @Size(max = 500)
    private String resourceUrl;

    @Pattern(regexp = "VIDEO|READING|QUIZ|ASSIGNMENT|", message = "Invalid module type")
    private String moduleType;

    @NotNull(message = "Course ID is required")
    private Long courseId;

    @Min(1)
    private Integer orderIndex;

    @Min(1)
    private Integer durationMinutes;
}
