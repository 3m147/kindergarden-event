package com.kindergarden.recitation.repository;

import com.kindergarden.recitation.entity.ClassEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClassRepository extends JpaRepository<ClassEntity, Long> {
}
