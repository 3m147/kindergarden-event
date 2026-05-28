# 유치부 암송 체크 시스템 백엔드-프론트엔드 연동 계획

프론트엔드의 화면(UI)과 더미 데이터를 실제 백엔드(Spring Boot) API 및 MySQL 데이터베이스와 연결하기 위한 구현 계획입니다.

## User Review Required

> [!IMPORTANT]
> 1. **MySQL 접속 정보**: 현재 백엔드의 `application.properties` 파일에 설정된 MySQL 접속 정보(주소, 포트, DB명, 사용자명, 비밀번호)가 DBeaver에서 사용하신 것과 일치하는지 확인해야 합니다. 만약 설정되어 있지 않다면 제가 기본 설정(localhost:3306, root 등)으로 세팅하겠습니다.
> 2. **비밀번호 해시 (BCrypt)**: 로그인 시 비밀번호 검증을 위해 Spring Security의 BCryptPasswordEncoder를 사용할 예정입니다. 복잡한 인증 설정은 빼고 간단히 암호화/비교 용도로만 쓰겠습니다. 괜찮으신가요?
> 3. **프로필 이미지 업로드**: 이미지 업로드는 백엔드의 파일 시스템이나 클라우드 스토리지(S3 등)에 저장해야 하지만, 로컬 개발 환경이므로 현재는 **백엔드 서버 내 특정 폴더(예: `/uploads`)에 저장**하는 방식으로 구현하겠습니다.

## Proposed Changes

---

### Backend: Database Entities & Repositories

새로 정의한 스키마 구조에 맞춰 JPA Entity와 Repository를 추가/수정합니다.

#### [NEW] `Teacher.java`, `Admin.java`
- `teacher`, `admin` 테이블 매핑. `photo_url` 컬럼 포함.
#### [NEW] `TeacherRepository.java`, `AdminRepository.java`
- 로그인 아이디(`loginId`)로 계정을 조회하는 메서드 추가.
#### [MODIFY] `RecitationRecord.java`
- `lessonNumber` (과 번호), `type` (암송/퀴즈 구분), `result` (성공/실패) 필드 추가.
- `Teacher` 엔티티와의 연관관계 추가.
- 복합 유니크 키(Student, Date, Lesson, Type) 제약 조건 반영.
#### [MODIFY] `Student.java`
- `photo_url` 필드 추가.

---

### Backend: DTOs & Controllers

프론트엔드에서 요구하는 JSON 형식에 맞게 DTO를 수정하고 API를 만듭니다.

#### [NEW] `AuthController.java` & `AuthService.java`
- `POST /api/auth/login`: 교사 로그인 (반복된 세션 유지를 위해 교사 ID 반환)
- `POST /api/auth/admin/login`: 관리자 로그인
#### [MODIFY] `StudentRecitationDto.java`
- 프론트엔드 형식에 맞게 `lessonStates`, `quizStates` (과별 상태 Map)를 포함하도록 구조 변경.
#### [MODIFY] `RecitationController.java` & `RecitationService.java`
- 기존의 단순 `success` 토글 방식에서 `과 번호`와 `타입(암송/퀴즈)`을 받아 처리하는 로직으로 변경.
- **관리자용 대시보드 API (`GET /api/admin/scores`)** 추가: 모든 반의 제출된 점수를 한 번에 조회.
#### [NEW] `ProfileController.java` (선택적 구현)
- `POST /api/profiles/upload`: 프로필 이미지 업로드 처리 (MultipartFile) 및 URL 반환.

---

### Frontend: API Connection

가짜 데이터(`DUMMY_...`)를 지우고 실제 API를 호출하도록 수정합니다.

#### [MODIFY] `lib/api.ts`
- 로그인 API, 토글 API(과/타입 정보 추가), 관리자 대시보드 API 등 호출 함수 추가.
#### [MODIFY] `StartView.tsx` & `AdminLoginView.tsx`
- 로그인 폼 제출 시 실제 `api.login()` 호출 및 에러 처리.
#### [MODIFY] `TeacherCheckView.tsx`
- 페이지 로드 시 API에서 반 학생 및 점수 조회.
- 암송/퀴즈 버튼 클릭 시 API로 토글 요청 전송.
#### [MODIFY] `AdminDashboardView.tsx`
- 관리자 페이지 로드 시 `api.getAdminScores()` 호출하여 전체 현황 렌더링.

## Verification Plan

### Automated Tests
- 백엔드 빌드 검증 (`./mvnw clean package -DskipTests`)

### Manual Verification
1. 프론트엔드와 백엔드를 동시에 실행 (`npm run dev` & Spring Boot Run).
2. 브라우저에서 `localhost:3000` 접속 후 교사 계정(`kim`/`1234`)으로 로그인 성공 여부 확인.
3. 임의의 학생을 골라 1과 암송, 2과 퀴즈 등을 체크한 뒤 DB `recitation_record` 테이블에 올바르게 행이 추가되는지 확인.
4. 제출 버튼을 누른 후, 관리자 대시보드(`localhost:3000/admin`)에서 해당 반의 점수가 정확히 반영되어 뜨는지 확인.
