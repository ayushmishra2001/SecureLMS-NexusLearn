package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class NavbarGlobalGroupResponse {
    private NavbarGlobalLinkInfoResponse globalLink;
    private List<NavbarFunctionGroupResponse> functionLinks;
}

