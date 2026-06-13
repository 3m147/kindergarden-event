package com.kindergarden.recitation.repository;
import com.kindergarden.recitation.entity.ScheduleImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ScheduleImageRepository extends JpaRepository<ScheduleImage, Long> { List<ScheduleImage> findAllByOrderByCreatedAtDesc(); }
