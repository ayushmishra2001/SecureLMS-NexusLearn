package tech.csm.securelms.dto.response;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class NavbarFunctionGroupResponse {
    private NavbarFunctionLinkInfoResponse functionLink;
    private PermissionFlagsResponse permissions;
    private List<NavbarPrimaryLinkResponse> primaryLinks;
}

