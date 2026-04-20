-- ==========================================================
-- Kindergarten Recitation DDL (MySQL 8.x)
-- DBeaver 에서 `recitation_db` 스키마를 먼저 생성한 뒤 실행.
--   CREATE DATABASE recitation_db DEFAULT CHARSET utf8mb4;
-- ==========================================================

-- 반 정보
CREATE TABLE IF NOT EXISTS class (
    class_id     BIGINT       NOT NULL AUTO_INCREMENT,
    class_name   VARCHAR(50)  NOT NULL UNIQUE,  -- 예: 기쁨반, 소망반
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 학생 정보
CREATE TABLE IF NOT EXISTS student (
    student_id   BIGINT       NOT NULL AUTO_INCREMENT,
    name         VARCHAR(50)  NOT NULL,
    class_id     BIGINT       NOT NULL,
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id),
    CONSTRAINT fk_student_class
        FOREIGN KEY (class_id) REFERENCES class(class_id)
        ON DELETE CASCADE,
    INDEX idx_student_class (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 암송 기록 (학생 + 날짜 유니크)
CREATE TABLE IF NOT EXISTS recitation_record (
    record_id    BIGINT       NOT NULL AUTO_INCREMENT,
    student_id   BIGINT       NOT NULL,
    record_date  DATE         NOT NULL,
    success      BOOLEAN      NOT NULL DEFAULT FALSE,
    submitted    BOOLEAN      NOT NULL DEFAULT FALSE,  -- 최종 제출 여부
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                              ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (record_id),
    CONSTRAINT fk_record_student
        FOREIGN KEY (student_id) REFERENCES student(student_id)
        ON DELETE CASCADE,
    UNIQUE KEY uq_student_date (student_id, record_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 샘플 시드 데이터 (2026년 상반기 유치부 편성)
INSERT INTO class (class_name) VALUES
  ('만 3-1반'), ('만 4-1반'), ('만 4-2반'), ('만 5-1반'), ('만 5-2반');

INSERT INTO student (name, class_id) VALUES
  ('김하은', 1), ('이서준', 1), ('박지안', 1),
  ('최예린', 2), ('정민준', 2), ('한지우', 2),
  ('윤서아', 3), ('강유찬', 3),
  ('조서윤', 4), ('배도윤', 4), ('임나윤', 4),
  ('문서현', 5), ('권하준', 5);
