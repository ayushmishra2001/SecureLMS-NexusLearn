package tech.csm.securelms.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.entity.RoleMaster;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleMasterRepository extends JpaRepository<RoleMaster, Long> {

    Optional<RoleMaster> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    List<RoleMaster> findByActiveTrueOrderBySortOrderAscDisplayNameAsc();

    List<RoleMaster> findByAssignableTrueAndActiveTrueOrderBySortOrderAscDisplayNameAsc();

    List<RoleMaster> findAllByOrderBySortOrderAscDisplayNameAsc();

    @Query("SELECT r FROM RoleMaster r JOIN r.groups g WHERE g.id = :groupId AND r.active = true ORDER BY r.sortOrder ASC, r.displayName ASC")
    List<RoleMaster> findByGroupIdAndActiveTrue(@Param("groupId") Long groupId);

    @Query("SELECT r FROM RoleMaster r JOIN r.groups g WHERE g.id = :groupId AND r.assignable = true AND r.active = true ORDER BY r.sortOrder ASC, r.displayName ASC")
    List<RoleMaster> findByGroupIdAndAssignableTrueAndActiveTrue(@Param("groupId") Long groupId);

    @Query("SELECT DISTINCT r FROM RoleMaster r JOIN r.groups g WHERE g.id IN :groupIds AND r.active = true ORDER BY r.sortOrder ASC, r.displayName ASC")
    List<RoleMaster> findByGroupIdsAndActiveTrue(@Param("groupIds") List<Long> groupIds);

    @Query("SELECT DISTINCT r FROM RoleMaster r JOIN r.groups g WHERE g.id IN :groupIds AND r.assignable = true AND r.active = true ORDER BY r.sortOrder ASC, r.displayName ASC")
    List<RoleMaster> findByGroupIdsAndAssignableTrueAndActiveTrue(@Param("groupIds") List<Long> groupIds);
}
