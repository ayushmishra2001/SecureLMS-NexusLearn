package tech.csm.securelms.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tech.csm.securelms.entity.Course;
import tech.csm.securelms.entity.Enrollment;
import tech.csm.securelms.entity.User;
import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    Optional<Enrollment> findByStudentAndCourse(User student, Course course);

    List<Enrollment> findByStudent(User student);

    List<Enrollment> findByStudentAndActiveTrue(User student);

    List<Enrollment> findByCourse(Course course);

    boolean existsByStudentAndCourse(User student, Course course);

    long countByCourse(Course course);

    boolean existsByStudentAndCourseAndActiveTrue(User student, Course course);

    @Query("SELECT DISTINCT e FROM Enrollment e " +
            "JOIN FETCH e.student " +
            "JOIN FETCH e.course c " +
            "LEFT JOIN FETCH c.modules " +
            "WHERE e.course.id = :courseId AND e.active = true")
    List<Enrollment> findByCourse_IdAndActiveTrue(@Param("courseId") Long courseId);

    @Query("SELECT DISTINCT e FROM Enrollment e " +
            "JOIN FETCH e.student " +
            "JOIN FETCH e.course c " +
            "LEFT JOIN FETCH c.modules " +
            "WHERE e.student.id = :studentId AND e.active = true")
    List<Enrollment> findByStudent_IdAndActiveTrue(@Param("studentId") Long studentId);
}