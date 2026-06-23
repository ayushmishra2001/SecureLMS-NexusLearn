package tech.csm.securelms.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class GroupUserAssignRequest {
    private List<Long> userIds;
}
