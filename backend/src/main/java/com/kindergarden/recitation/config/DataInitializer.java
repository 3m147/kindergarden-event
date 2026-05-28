package com.kindergarden.recitation.config;

import com.kindergarden.recitation.entity.Admin;
import com.kindergarden.recitation.entity.ClassEntity;
import com.kindergarden.recitation.entity.Teacher;
import com.kindergarden.recitation.repository.AdminRepository;
import com.kindergarden.recitation.repository.ClassRepository;
import com.kindergarden.recitation.repository.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * [테스트용 초기화 데이터 시더]
 * 
 * - 언제든지 이 파일(DataInitializer.java)을 통째로 삭제하거나
 *   클래스 레벨의 @Component 어노테이션을 주석 처리하면 테스트 계정 자동 생성이 비활성화됩니다.
 * - @Profile("!prod") 설정을 통해 운영(production) 환경에서는 절대 실행되지 않도록 설정되어 있습니다.
 */
@Component
@Profile("!prod")
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final ClassRepository classRepository;
    private final TeacherRepository teacherRepository;
    private final AdminRepository adminRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Ensure class data exists (if empty)
        if (classRepository.count() == 0) {
            ClassEntity class1 = ClassEntity.builder().name("만 3-1반").build();
            ClassEntity class2 = ClassEntity.builder().name("만 4-1반").build();
            ClassEntity class3 = ClassEntity.builder().name("만 4-2반").build();
            ClassEntity class4 = ClassEntity.builder().name("만 5-1반").build();
            ClassEntity class5 = ClassEntity.builder().name("만 5-2반").build();
            classRepository.saveAll(List.of(class1, class2, class3, class4, class5));
        }

        // Get class 1 for the test teacher
        ClassEntity defaultClass = classRepository.findAll().stream()
                .filter(c -> c.getName().equals("만 3-1반"))
                .findFirst()
                .orElseGet(() -> {
                    ClassEntity newClass = ClassEntity.builder().name("만 3-1반").build();
                    return classRepository.save(newClass);
                });

        // Seed test teacher: loginId="teacher", password="1234"
        if (teacherRepository.findByLoginId("teacher").isEmpty()) {
            Teacher teacher = Teacher.builder()
                    .loginId("teacher")
                    .password(passwordEncoder.encode("1234"))
                    .name("테스트교사")
                    .role("정교사")
                    .classEntity(defaultClass)
                    .build();
            teacherRepository.save(teacher);
            System.out.println(">>> Seeded test teacher account: teacher / 1234");
        }

        // Seed test admin: loginId="admin1", password="1234"
        if (adminRepository.findByLoginId("admin1").isEmpty()) {
            Admin admin = Admin.builder()
                    .loginId("admin1")
                    .password(passwordEncoder.encode("1234"))
                    .name("테스트관리자")
                    .build();
            adminRepository.save(admin);
            System.out.println(">>> Seeded test admin account: admin1 / 1234");
        }
    }
}
