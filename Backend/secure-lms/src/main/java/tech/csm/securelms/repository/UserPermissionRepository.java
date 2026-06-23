package tech.csm.securelms.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.entity.UserPermission;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserPermissionRepository extends JpaRepository<UserPermission, Long> {

    List<UserPermission> findByUserId(Long userId);

    List<UserPermission> findByUserIdIn(Collection<Long> userIds);

    Optional<UserPermission> findByUserIdAndFunctionLinkId(Long userId, Long functionLinkId);

    List<UserPermission> findByUserIdAndFunctionLinkIdIn(Long userId, Collection<Long> functionLinkIds);

    long countByFunctionLinkId(Long functionLinkId);

    @org.springframework.data.jpa.repository.Query("SELECT up FROM UserPermission up WHERE " +
            "(:search IS NULL OR LOWER(up.user.username) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(up.functionLink.displayName) LIKE LOWER(CONCAT('%', :search, '%')))")
    org.springframework.data.domain.Page<UserPermission> findAllBySearch(@org.springframework.data.repository.query.Param("search") String search, org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT up FROM UserPermission up WHERE " +
            "(:search IS NULL OR LOWER(up.user.username) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(up.functionLink.displayName) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
            "(up.user.group.id = :groupId)")
    org.springframework.data.domain.Page<UserPermission> findAllBySearchAndGroupId(
            @org.springframework.data.repository.query.Param("search") String search, 
            @org.springframework.data.repository.query.Param("groupId") Long groupId, 
            org.springframework.data.domain.Pageable pageable);
}

