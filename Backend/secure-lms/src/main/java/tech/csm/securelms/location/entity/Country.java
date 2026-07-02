package tech.csm.securelms.location.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "loc_country")
@Getter
@Setter
public class Country extends AbstractLocationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "country_id")
    private Long id;

    @Column(name = "country_code", unique = true, nullable = false, length = 50)
    private String code;

    @Column(name = "country_name", nullable = false, length = 100)
    private String name;

    @Column(name = "iso_code", length = 10)
    private String isoCode;
}
