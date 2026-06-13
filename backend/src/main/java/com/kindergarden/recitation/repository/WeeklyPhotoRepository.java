package com.kindergarden.recitation.repository;
import com.kindergarden.recitation.entity.WeeklyPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface WeeklyPhotoRepository extends JpaRepository<WeeklyPhoto, Long> { List<WeeklyPhoto> findAllByOrderByCreatedAtDesc(); }
