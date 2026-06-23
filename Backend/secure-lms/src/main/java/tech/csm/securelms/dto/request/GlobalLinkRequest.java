package tech.csm.securelms.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class GlobalLinkRequest {

    @NotBlank(message = "Display name is required")
    @Size(max = 150, message = "Display name must be at most 150 characters")
    private String displayName;

    @JsonProperty("isActive")
    private Boolean active;
}

