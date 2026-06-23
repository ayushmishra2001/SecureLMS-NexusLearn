package tech.csm.securelms.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.entity.GroupPermission;

import java.util.Collection;
import java.util.List;

@Repository
public interface GroupPermissionRepository extends JpaRepository<GroupPermission, Long> {

    List<GroupPermission> findByGroupId(Long groupId);

    List<GroupPermission> findByGroupIdAndFunctionLinkIdIn(Long groupId, Collection<Long> functionLinkIds);

    long countByGroupId(Long groupId);

    long countByFunctionLinkId(Long functionLinkId);

    void deleteByGroupId(Long groupId);

    @org.springframework.data.jpa.repository.Query("SELECT gp FROM GroupPermission gp WHERE " +
            "(:search IS NULL OR LOWER(gp.group.groupName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(gp.functionLink.displayName) LIKE LOWER(CONCAT('%', :search, '%')))")
    org.springframework.data.domain.Page<GroupPermission> findAllBySearch(@org.springframework.data.repository.query.Param("search") String search, org.springframework.data.domain.Pageable pageable);
}
