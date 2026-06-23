package tech.csm.securelms.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FunctionLinkRequest {

    @NotBlank(message = "Display name is required")
    @Size(max = 150, message = "Display name must be at most 150 characters")
    private String displayName;

    @NotBlank(message = "Route path is required")
    @Size(max = 500, message = "Route path must be at most 500 characters")
    private String routePath;

    @JsonProperty("isActive")
    private Boolean active;
}

