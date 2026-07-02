package tech.csm.securelms.location.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "loc_block", uniqueConstraints = { @UniqueConstraint(columnNames = {"district_id", "block_name"}) })
@Getter
@Setter
public class Block extends AbstractLocationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "block_id")
    private Long id;

    @Column(name = "block_code", unique = true, nullable = false, length = 50)
    private String code;

    @Column(name = "block_name", nullable = false, length = 100)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "district_id", nullable = false)
    private District district;

    @Column(name = "state_id")
    private Long stateId;

    @Column(name = "country_id")
    private Long countryId;
}

