package com.kindergarden.recitation.repository;
import com.kindergarden.recitation.entity.StoredFile;
import org.springframework.data.jpa.repository.JpaRepository;
public interface StoredFileRepository extends JpaRepository<StoredFile, Long> {}
