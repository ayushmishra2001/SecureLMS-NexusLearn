package tech.csm.securelms.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.entity.User;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByUsername(String username);

    /** Lookup by HMAC hash - always deterministic */
    Optional<User> findByEmailHash(String emailHash);

    boolean existsByUsername(String username);

    boolean existsByEmailHash(String emailHash);

    boolean existsByAadharNumber(String aadharNumber);

    List<User> findByRole_CodeIgnoreCase(String roleCode);

    @Query("SELECT u FROM User u WHERE UPPER(u.role.code) = UPPER(:roleCode) AND u.active = true ORDER BY u.createdAt DESC")
    List<User> findActiveByRoleCode(@Param("roleCode") String roleCode);

    long countByRole_Id(Long roleId);

    List<User> findByGroup_Id(Long groupId);
    long countByGroup_Id(Long groupId);

    @Query("""
            SELECT u FROM User u
            WHERE (:q IS NULL OR :q = '' OR
                   LOWER(u.username) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(u.firstName, '')) LIKE LOWER(CONCAT('%', :q, '%')) OR
                   LOWER(COALESCE(u.lastName, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            AND (:filterByGroups = false OR u.group.id IN :groupIds)
            AND (:filterByRoles = false OR u.role.id IN :roleIds)
            ORDER BY u.firstName ASC, u.lastName ASC, u.username ASC
            """)
    List<User> searchUsersForPermissionMapping(
            @Param("q") String q,
            @Param("filterByGroups") boolean filterByGroups,
            @Param("groupIds") List<Long> groupIds,
            @Param("filterByRoles") boolean filterByRoles,
            @Param("roleIds") List<Long> roleIds);
}

