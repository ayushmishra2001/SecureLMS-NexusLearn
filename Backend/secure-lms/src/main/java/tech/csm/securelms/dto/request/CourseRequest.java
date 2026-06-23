package tech.csm.securelms.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class CourseRequest {
    @NotBlank(message = "Course title is required")
    @Size(min = 3, max = 150, message = "Title must be 3-150 characters")
    private String title;

    @Size(max = 1000, message = "Description must be at most 1000 characters")
    private String description;

    @Size(max = 100)
    private String category;

    @Pattern(regexp = "BEGINNER|INTERMEDIATE|ADVANCED|", message = "Invalid difficulty level")
    private String difficultyLevel;

    @Min(1) @Max(1000)
    private Integer durationHours;

    private boolean published;
}

