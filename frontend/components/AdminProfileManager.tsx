"use client";

/**
 * AdminProfileManager
 * -------------------
 * 관리자가 선생님·학생의 프로필 이미지를 업로드/변경하는 페이지.
 * 현재는 localStorage에 base64로 저장 (데모용).
 * 추후 백엔드 파일 업로드 API로 교체.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Shield, LogOut, ArrowLeft, Camera, Upload, X, ChevronDown, ChevronUp, Users, GraduationCap, Trash2 } from "lucide-react";
import { api, resolveMediaUrl } from "@/lib/api";

// --- 더미 데이터 (DB 연동 전) ---
type Person = {
  id: number;
  name: string;
  type: "teacher" | "student";
  className: string;
  classId: number;
  role?: string; // 교사만
  birthDate?: string;
  parentName?: string;
};

function getStorageKey(type: string, id: number) {
  return `profile_photo_${type}_${id}`;
}

function getDefaultAvatar(name: string) {
  const seed = encodeURIComponent(name);
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=ffecb3,fff4b8,cdefc4,cde7fb,fcd5e0`;
}

export default function AdminProfileManager() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = React.useState(false);
  const [tab, setTab] = React.useState<"teacher" | "student">("teacher");
  const [expandedClass, setExpandedClass] = React.useState<number | null>(null);
  
  // 상태: API에서 가져온 실제 사람 목록
  const [teachers, setTeachers] = React.useState<Person[]>([]);
  const [students, setStudents] = React.useState<Person[]>([]);
  
  const [photos, setPhotos] = React.useState<Record<string, string>>({});
  const [uploadingId, setUploadingId] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 인증 체크 및 프로필 데이터 불러오기
  React.useEffect(() => {
    const auth = localStorage.getItem("admin_authenticated");
    if (auth !== "true") {
      router.replace("/admin");
      return;
    }
    setAuthenticated(true);
    
    // 백엔드에서 프로필 목록 가져오기
    api.getAdminProfiles()
      .then((data) => {
        const fetchedTeachers = data.filter(p => p.type === "teacher") as Person[];
        const fetchedStudents = data.filter(p => p.type === "student") as Person[];
        setTeachers(fetchedTeachers);
        setStudents(fetchedStudents);
        
        // localStorage에서 기존에 캐싱된 사진 또는 DB에 저장된 사진(photoUrl) 병합
        const loaded: Record<string, string> = {};
        data.forEach((p) => {
          const key = getStorageKey(p.type, p.id);
          const saved = localStorage.getItem(key);
          if (p.photoUrl) {
            // 서버에 사진이 있으면 서버 URL 사용
            loaded[key] = resolveMediaUrl(p.photoUrl);
          } else if (saved) {
            loaded[key] = resolveMediaUrl(saved);
          }
        });
        setPhotos(loaded);
      })
      .catch((err) => console.error("프로필 로드 실패:", err));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("admin_authenticated");
    router.replace("/admin");
  };

  const handleUploadClick = (person: Person) => {
    setUploadingId(getStorageKey(person.type, person.id));
    fileInputRef.current?.click();
  };

  // 변경사항 임시 저장
  const [pendingFiles, setPendingFiles] = React.useState<Record<string, File>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingId) return;

    // 이미지 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }

    // 미리보기 및 파일 임시 저장
    const localUrl = URL.createObjectURL(file);
    setPhotos((prev) => ({ ...prev, [uploadingId]: localUrl }));
    setPendingFiles((prev) => ({ ...prev, [uploadingId]: file }));
    
    setUploadingId(null);
    e.target.value = "";
  };

  const handleSave = async () => {
    const entries = Object.entries(pendingFiles);
    if (entries.length === 0) return;
    
    setIsSaving(true);
    let successCount = 0;
    
    try {
      for (const [key, file] of entries) {
        const type = key.startsWith("profile_photo_teacher") ? "teacher" : "student";
        const idStr = key.split("_").pop();
        if (!idStr) continue;
        const id = parseInt(idStr, 10);
        
        const res = await api.uploadProfile(file, type, id);
        const resolvedUrl = resolveMediaUrl(res.url);
        localStorage.setItem(key, resolvedUrl);
        setPhotos((prev) => ({ ...prev, [key]: resolvedUrl }));
        successCount++;
      }
      setPendingFiles({});
      alert(`${successCount}개의 프로필 사진이 성공적으로 저장되었습니다.`);
    } catch (err) {
      console.error(err);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (person: Person) => {
    const key = getStorageKey(person.type, person.id);
    localStorage.removeItem(key);
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  if (!authenticated) return null;

  const people = tab === "teacher" ? teachers : students;

  // 반별 그룹화
  const classGroups = people.reduce<Record<number, { className: string; people: Person[] }>>((acc, p) => {
    if (!acc[p.classId]) acc[p.classId] = { className: p.className, people: [] };
    acc[p.classId].people.push(p);
    return acc;
  }, {});
  const classIds = Object.keys(classGroups).map(Number).sort();

  return (
    <main className="mx-auto min-h-[100dvh] w-full max-w-2xl bg-slate-900 pb-8">
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* 헤더 */}
      <header className="sticky top-0 z-20 bg-slate-900/95 px-5 pb-4 pt-[max(env(safe-area-inset-top),1.25rem)] backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/admin/dashboard")}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 ring-1 ring-slate-700 transition hover:text-white active:scale-95"
              aria-label="대시보드로 돌아가기"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-extrabold text-white sm:text-xl">프로필 관리</h1>
              <p className="text-xs text-slate-400">선생님 · 학생 사진 업로드</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-bold text-slate-400 ring-1 ring-slate-700 transition hover:text-white active:scale-95"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      </header>

      {/* 탭 */}
      <div className="flex gap-2 px-5 pt-2">
        <button
          type="button"
          onClick={() => { setTab("teacher"); setExpandedClass(null); }}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-extrabold transition active:scale-[0.98]",
            tab === "teacher"
              ? "bg-gradient-to-br from-amber-400 to-orange-500 text-slate-900 shadow-soft"
              : "bg-slate-800 text-slate-400 ring-1 ring-slate-700"
          )}
        >
          <GraduationCap className="h-5 w-5" />
          선생님 ({teachers.length})
        </button>
        <button
          type="button"
          onClick={() => { setTab("student"); setExpandedClass(null); }}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-extrabold transition active:scale-[0.98]",
            tab === "student"
              ? "bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-soft"
              : "bg-slate-800 text-slate-400 ring-1 ring-slate-700"
          )}
        >
          <Users className="h-5 w-5" />
          학생 ({students.length})
        </button>
      </div>

      {/* 반별 아코디언 */}
      <section className="mt-5 px-5">
        <div className="flex flex-col gap-3">
          {classIds.map((classId) => {
            const group = classGroups[classId];
            const isExpanded = expandedClass === classId;
            const uploadedCount = group.people.filter((p) => photos[getStorageKey(p.type, p.id)]).length;

            return (
              <div key={classId} className="overflow-hidden rounded-2xl bg-slate-800 ring-1 ring-slate-700">
                <button
                  type="button"
                  onClick={() => setExpandedClass(isExpanded ? null : classId)}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:bg-slate-700/50 active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/20 text-sm font-extrabold text-violet-400">
                      📸
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-white">{group.className}</p>
                      <p className="text-xs text-slate-400">
                        {group.people.length}명 · 업로드 {uploadedCount}/{group.people.length}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadedCount === group.people.length && (
                      <span className="rounded-lg bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-400">완료</span>
                    )}
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-700 px-4 pb-4 pt-3">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {group.people.map((person) => {
                        const key = getStorageKey(person.type, person.id);
                        const photoUrl = photos[key];
                        const hasPhoto = !!photoUrl;

                        return (
                          <div
                            key={person.id}
                            className="flex flex-col items-center gap-2 rounded-2xl bg-slate-900/60 p-3 ring-1 ring-slate-700/50"
                          >
                            {/* 프로필 이미지 */}
                            <div className="relative">
                              <div className={cn(
                                "h-20 w-20 overflow-hidden rounded-full border-[3px] bg-white shadow-soft transition",
                                hasPhoto ? "border-emerald-400" : "border-slate-600"
                              )}>
                                <img
                                  src={photoUrl || getDefaultAvatar(person.name)}
                                  alt={person.name}
                                  className="h-full w-full object-cover"
                                  draggable={false}
                                />
                              </div>
                              {/* 업로드 버튼 */}
                              <button
                                type="button"
                                onClick={() => handleUploadClick(person)}
                                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-soft transition active:scale-90"
                                aria-label={`${person.name} 사진 업로드`}
                              >
                                <Camera className="h-4 w-4" />
                              </button>
                            </div>

                            {/* 이름 */}
                            <div className="text-center">
                              <p className="text-sm font-bold text-white">{person.name}</p>
                              {person.role && (
                                <p className="text-[10px] font-bold text-amber-400">{person.role}</p>
                              )}
                              {person.type === "student" && (
                                <div className="mt-1 grid gap-0.5 text-[10px] font-bold text-slate-400">
                                  <p>{person.birthDate ? `생년월일 ${person.birthDate}` : "생년월일 미등록"}</p>
                                  <p>{person.parentName ? `부모님 ${person.parentName}` : "부모님 성함 미등록"}</p>
                                </div>
                              )}
                            </div>

                            {/* 삭제 버튼 (사진 있을 때만) */}
                            {hasPhoto && (
                              <button
                                type="button"
                                onClick={() => handleDelete(person)}
                                className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-400 transition hover:bg-red-500/20 active:scale-95"
                              >
                                <Trash2 className="h-3 w-3" />
                                삭제
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 변경사항 저장 플로팅 바 */}
      {Object.keys(pendingFiles).length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4 pb-[max(env(safe-area-inset-bottom),1rem)] bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent pointer-events-none">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="pointer-events-auto flex w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 py-3.5 font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
          >
            {isSaving ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
            {isSaving ? "저장 중..." : `${Object.keys(pendingFiles).length}개 변경사항 저장하기`}
          </button>
        </div>
      )}
    </main>
  );
}
