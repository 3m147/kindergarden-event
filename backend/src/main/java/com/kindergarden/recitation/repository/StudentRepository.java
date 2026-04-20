package com.kindergarden.recitation.repository;

import com.kindergarden.recitation.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StudentRepository extends JpaRepository<Student, Long> {

    List<Student> findByClassEntityIdOrderByNameAsc(Long classId);
}
