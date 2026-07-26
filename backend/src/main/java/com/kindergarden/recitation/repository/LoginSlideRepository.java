package com.kindergarden.recitation.repository;
import com.kindergarden.recitation.entity.LoginSlide;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface LoginSlideRepository extends JpaRepository<LoginSlide, Long> {
    List<LoginSlide> findAllByOrderByCreatedAtDesc();
}
