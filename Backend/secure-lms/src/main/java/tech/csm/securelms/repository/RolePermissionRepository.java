package tech.csm.securelms.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.entity.RolePermission;

import java.util.Collection;
import java.util.List;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {

    List<RolePermission> findByRoleId(Long roleId);

    List<RolePermission> findByRoleIdAndFunctionLinkIdIn(Long roleId, Collection<Long> functionLinkIds);

    long countByRoleId(Long roleId);

    long countByFunctionLinkId(Long functionLinkId);

    @org.springframework.data.jpa.repository.Query("SELECT rp FROM RolePermission rp WHERE " +
            "(:search IS NULL OR LOWER(rp.role.displayName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(rp.functionLink.displayName) LIKE LOWER(CONCAT('%', :search, '%')))")
    org.springframework.data.domain.Page<RolePermission> findAllBySearch(@org.springframework.data.repository.query.Param("search") String search, org.springframework.data.domain.Pageable pageable);
}
