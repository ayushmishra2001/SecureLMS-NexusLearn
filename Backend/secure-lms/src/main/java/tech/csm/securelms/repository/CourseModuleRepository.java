package tech.csm.securelms.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.entity.Course;
import tech.csm.securelms.entity.CourseModule;
import java.util.List;

@Repository
public interface CourseModuleRepository extends JpaRepository<CourseModule, Long> {
    List<CourseModule> findByCourseOrderByOrderIndexAsc(Course course);
    List<CourseModule> findByCourseAndActiveTrueOrderByOrderIndexAsc(Course course);
    @Query("SELECT COALESCE(MAX(m.orderIndex), 0) FROM CourseModule m WHERE m.course = :course")
    int findMaxOrderIndexByCourse(Course course);
}
