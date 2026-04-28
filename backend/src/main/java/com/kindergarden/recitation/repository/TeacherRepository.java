package com.kindergarden.recitation.repository;

import com.kindergarden.recitation.entity.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface TeacherRepository extends JpaRepository<Teacher, Long> {
    Optional<Teacher> findByLoginId(String loginId);
    List<Teacher> findByClassEntityIdOrderByNameAsc(Long classId);
}
