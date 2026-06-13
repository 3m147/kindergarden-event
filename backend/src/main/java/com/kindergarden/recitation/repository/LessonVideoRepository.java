package com.kindergarden.recitation.repository;
import com.kindergarden.recitation.entity.LessonVideo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface LessonVideoRepository extends JpaRepository<LessonVideo, Long> { List<LessonVideo> findAllByOrderByLessonNumberAsc(); boolean existsByLessonNumber(Integer lessonNumber); }
