package tech.csm.securelms.location.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "loc_district", uniqueConstraints = { @UniqueConstraint(columnNames = {"state_id", "district_name"}) })
@Getter
@Setter
public class District extends AbstractLocationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "district_id")
    private Long id;

    @Column(name = "district_code", unique = true, nullable = false, length = 50)
    private String code;

    @Column(name = "district_name", nullable = false, length = 100)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "state_id", nullable = false)
    private State state;

    @Column(name = "country_id")
    private Long countryId; // Denormalized
}

