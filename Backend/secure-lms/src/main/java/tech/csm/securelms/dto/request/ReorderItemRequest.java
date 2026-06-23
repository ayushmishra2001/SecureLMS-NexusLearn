package tech.csm.securelms.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReorderItemRequest {
    @NotNull(message = "Id is required")
    private Long id;

    @NotNull(message = "Order index is required")
    private Integer orderIndex;
}

