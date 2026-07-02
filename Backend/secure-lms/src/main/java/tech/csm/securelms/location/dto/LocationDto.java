package tech.csm.securelms.location.dto;

import lombok.Data;

@Data
public class LocationDto {
    private Long id;
    private String code;
    private String name;
    private String status;
    private Long parentId; // e.g. country_id for State, state_id for District, etc.
    
    // Denormalized IDs for response/display
    private Long countryId;
    private Long stateId;
    private Long districtId;
    private Long blockId;
    private Long panchayatId;
    
    // Village specific
    private String pinCode;
}

