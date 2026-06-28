package com.kindergarden.recitation.repository;
import com.kindergarden.recitation.entity.FoundationMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface FoundationMaterialRepository extends JpaRepository<FoundationMaterial, Long> {
    List<FoundationMaterial> findAllByOrderByCreatedAtDesc();
    List<FoundationMaterial> findByAgeGroupOrderByCreatedAtDesc(String ageGroup);
}
