package tech.csm.securelms.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.entity.PrimaryLink;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface PrimaryLinkRepository extends JpaRepository<PrimaryLink, Long> {

    @Query("SELECT COALESCE(MAX(p.orderIndex), 0) FROM PrimaryLink p WHERE p.globalLink.id = :globalLinkId AND p.functionLink.id = :functionLinkId")
    int findMaxOrderIndexInScope(Long globalLinkId, Long functionLinkId);

    boolean existsByGlobalLinkIdAndFunctionLinkIdAndActiveTrue(Long globalLinkId, Long functionLinkId);

    boolean existsByGlobalLinkIdAndFunctionLinkIdAndActiveTrueAndIdNot(
            Long globalLinkId,
            Long functionLinkId,
            Long id);

    @Query("""
            SELECT p FROM PrimaryLink p
            WHERE (:globalLinkId IS NULL OR p.globalLink.id = :globalLinkId)
              AND (:functionLinkId IS NULL OR p.functionLink.id = :functionLinkId)
            ORDER BY p.globalLink.orderIndex ASC, p.functionLink.orderIndex ASC, p.orderIndex ASC
            """)
    List<PrimaryLink> findForAdmin(Long globalLinkId, Long functionLinkId);

    @Query("""
            SELECT p FROM PrimaryLink p
            WHERE p.active = true
              AND p.globalLink.active = true
              AND p.functionLink.active = true
            ORDER BY p.globalLink.orderIndex ASC, p.functionLink.orderIndex ASC, p.orderIndex ASC
            """)
    List<PrimaryLink> findAllActiveForNavbar();

    long countByGlobalLinkIdAndActiveTrue(Long globalLinkId);

    long countByFunctionLinkIdAndActiveTrue(Long functionLinkId);

    List<PrimaryLink> findByGlobalLinkId(Long globalLinkId);

    List<PrimaryLink> findByFunctionLinkId(Long functionLinkId);

    @Query("""
            SELECT p FROM PrimaryLink p
            WHERE p.globalLink.id = :globalLinkId
              AND p.functionLink.id = :functionLinkId
            ORDER BY p.orderIndex ASC
            """)
    List<PrimaryLink> findByScope(Long globalLinkId, Long functionLinkId);

    @Query("""
            SELECT p FROM PrimaryLink p
            WHERE p.globalLink.id IN :globalLinkIds
              AND p.functionLink.id IN :functionLinkIds
              AND p.active = true
              AND p.globalLink.active = true
              AND p.functionLink.active = true
            ORDER BY p.globalLink.orderIndex ASC, p.functionLink.orderIndex ASC, p.orderIndex ASC
            """)
    List<PrimaryLink> findActiveByGlobalIdsAndFunctionIds(Collection<Long> globalLinkIds, Collection<Long> functionLinkIds);

    Optional<PrimaryLink> findByIdAndActiveTrue(Long id);
}
