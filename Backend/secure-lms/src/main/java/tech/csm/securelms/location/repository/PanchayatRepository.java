package tech.csm.securelms.location.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.location.entity.Panchayat;
import java.util.List;
import java.util.Optional;

@Repository
public interface PanchayatRepository extends JpaRepository<Panchayat, Long> {
    List<Panchayat> findByBlockIdAndStatus(Long blockId, String status);
    List<Panchayat> findByStatus(String status);
    Optional<Panchayat> findByCode(String code);
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
    boolean existsByNameIgnoreCaseAndBlock_Id(String name, Long parentId);
    Optional<Panchayat> findByNameIgnoreCaseAndBlock_Id(String name, Long parentId);
    boolean existsByNameIgnoreCaseAndBlock_IdAndIdNot(String name, Long parentId, Long id);
    
    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
}





