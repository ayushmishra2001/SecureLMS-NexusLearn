package tech.csm.securelms.location.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "loc_state", uniqueConstraints = { @UniqueConstraint(columnNames = {"country_id", "state_name"}) })
@Getter
@Setter
public class State extends AbstractLocationEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "state_id")
    private Long id;

    @Column(name = "state_code", unique = true, nullable = false, length = 50)
    private String code;

    @Column(name = "state_name", nullable = false, length = 100)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "country_id", nullable = false)
    private Country country;
}

