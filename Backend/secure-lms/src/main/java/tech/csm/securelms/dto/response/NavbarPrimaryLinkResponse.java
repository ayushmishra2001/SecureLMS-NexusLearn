package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NavbarPrimaryLinkResponse {
    private Long id;
    private String displayName;
    private Integer orderIndex;
}

