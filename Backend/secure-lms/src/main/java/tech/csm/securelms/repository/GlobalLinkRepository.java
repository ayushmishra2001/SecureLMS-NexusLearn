package tech.csm.securelms.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.entity.GlobalLink;

import java.util.List;
import java.util.Optional;

@Repository
public interface GlobalLinkRepository extends JpaRepository<GlobalLink, Long> {

    Optional<GlobalLink> findTopByOrderByOrderIndexDesc();

    List<GlobalLink> findByOrderByOrderIndexAsc();

    List<GlobalLink> findByActiveTrueOrderByOrderIndexAsc();

    boolean existsByDisplayNameIgnoreCase(String displayName);

    boolean existsByDisplayNameIgnoreCaseAndIdNot(String displayName, Long id);

    @Query("SELECT COUNT(p) FROM PrimaryLink p WHERE p.globalLink.id = :globalLinkId AND p.active = true")
    long countActivePrimaryLinks(Long globalLinkId);
}

