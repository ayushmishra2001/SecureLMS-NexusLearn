package tech.csm.securelms.location.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.location.entity.District;
import java.util.List;
import java.util.Optional;

@Repository
public interface DistrictRepository extends JpaRepository<District, Long> {
    List<District> findByStateIdAndStatus(Long stateId, String status);
    List<District> findByStatus(String status);
    Optional<District> findByCode(String code);
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
    boolean existsByNameIgnoreCaseAndState_Id(String name, Long parentId);
    Optional<District> findByNameIgnoreCaseAndState_Id(String name, Long parentId);
    boolean existsByNameIgnoreCaseAndState_IdAndIdNot(String name, Long parentId, Long id);
    
    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
}





