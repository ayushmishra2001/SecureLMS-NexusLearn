package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NavbarFunctionLinkInfoResponse {
    private Long id;
    private String displayName;
    private String routePath;
    private Integer orderIndex;
}

