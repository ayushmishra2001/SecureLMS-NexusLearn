package tech.csm.securelms.location.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "loc_panchayat", uniqueConstraints = { @UniqueConstraint(columnNames = {"block_id", "panchayat_name"}) })
@Getter
@Setter
public class Panchayat extends AbstractLocationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "panchayat_id")
    private Long id;

    @Column(name = "panchayat_code", unique = true, nullable = false, length = 50)
    private String code;

    @Column(name = "panchayat_name", nullable = false, length = 100)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "block_id", nullable = false)
    private Block block;

    @Column(name = "district_id")
    private Long districtId;

    @Column(name = "state_id")
    private Long stateId;

    @Column(name = "country_id")
    private Long countryId;
}

