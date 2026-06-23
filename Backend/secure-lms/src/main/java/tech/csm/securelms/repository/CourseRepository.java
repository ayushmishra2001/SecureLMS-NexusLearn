package tech.csm.securelms.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.entity.Course;
import tech.csm.securelms.entity.User;
import java.util.List;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    List<Course> findByActiveTrue();
    List<Course> findByGroup_IdAndActiveTrue(Long groupId);
    List<Course> findByActiveTrueAndPublishedTrue();
    List<Course> findByGroup_IdAndActiveTrueAndPublishedTrue(Long groupId);
    List<Course> findByCreatedBy(User user);
    List<Course> findByCreatedByAndActiveTrue(User user);
    
    @Query("SELECT c FROM Course c WHERE c.active = true AND c.published = true ORDER BY c.createdAt DESC")
    List<Course> findAllPublishedActive();

    @Query("SELECT c FROM Course c WHERE c.active = true AND c.published = true AND c.group.id = :groupId ORDER BY c.createdAt DESC")
    List<Course> findAllPublishedActiveByGroupId(Long groupId);
}
