package tech.csm.securelms.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.entity.FunctionLink;

import java.util.List;
import java.util.Optional;

@Repository
public interface FunctionLinkRepository extends JpaRepository<FunctionLink, Long> {

    Optional<FunctionLink> findTopByOrderByOrderIndexDesc();

    List<FunctionLink> findByOrderByOrderIndexAsc();

    List<FunctionLink> findByActiveTrueOrderByOrderIndexAsc();

    boolean existsByDisplayNameIgnoreCase(String displayName);

    boolean existsByDisplayNameIgnoreCaseAndIdNot(String displayName, Long id);

    boolean existsByRoutePathIgnoreCase(String routePath);

    boolean existsByRoutePathIgnoreCaseAndIdNot(String routePath, Long id);

    @Query("SELECT COUNT(p) FROM PrimaryLink p WHERE p.functionLink.id = :functionLinkId AND p.active = true")
    long countActivePrimaryLinks(Long functionLinkId);
}

