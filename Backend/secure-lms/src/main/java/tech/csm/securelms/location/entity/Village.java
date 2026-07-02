package tech.csm.securelms.location.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "loc_village", uniqueConstraints = { @UniqueConstraint(columnNames = {"panchayat_id", "village_name"}) })
@Getter
@Setter
public class Village extends AbstractLocationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "village_id")
    private Long id;

    @Column(name = "village_name", nullable = false, length = 100)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "panchayat_id", nullable = false)
    private Panchayat panchayat;

    @Column(name = "block_id")
    private Long blockId;

    @Column(name = "district_id")
    private Long districtId;

    @Column(name = "state_id")
    private Long stateId;

    @Column(name = "country_id")
    private Long countryId;

    @Column(name = "pin_code", length = 10)
    private String pinCode;
}


