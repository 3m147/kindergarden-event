"use client";

export const LESSON_VIDEOS_STORAGE_KEY = "lesson_videos";

export type LessonVideo = {
  id: string;
  lessonNumber?: number;
  title: string;
  url: string;
  videoId: string;
  pastor?: string;
  description?: string;
  createdAt: string;
};

const FIRST_LESSON_START_DATE = new Date("2026-01-04T00:00:00+09:00");
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

export const DEFAULT_LESSON_VIDEOS: LessonVideo[] = [
  { id: "lesson-1", lessonNumber: 1, title: "1과 친구야 안녕", pastor: "우병수 목사", url: "https://youtu.be/ZNTtW3CCioo?si=jaUOiEg4E8smv4lp", videoId: "ZNTtW3CCioo", createdAt: "2026-01-04T00:00:00.000+09:00" },
  { id: "lesson-2", lessonNumber: 2, title: "2과 나는 교회학교가 좋아요", pastor: "조억동 목사", url: "https://youtu.be/fYdrfdFF4NA?si=5-c-35nBFxD5XP33", videoId: "fYdrfdFF4NA", createdAt: "2026-01-11T00:00:00.000+09:00" },
  { id: "lesson-3", lessonNumber: 3, title: "3과 보이지 않는 하나님", pastor: "김영석 목사", url: "https://youtu.be/MfQQnR8vres?si=YMlMxKFJzDbZGQkz", videoId: "MfQQnR8vres", createdAt: "2026-01-18T00:00:00.000+09:00" },
  { id: "lesson-4", lessonNumber: 4, title: "4과 나를 사랑하시는 하나님", pastor: "김현동 목사", url: "https://youtu.be/5FS83gAMBaQ?si=GYMyf2m50Ap46nml", videoId: "5FS83gAMBaQ", createdAt: "2026-01-25T00:00:00.000+09:00" },
  { id: "lesson-5", lessonNumber: 5, title: "5과 성경은 하나님이 보내신 편지", pastor: "이석 전도사", url: "https://youtu.be/DmvOyL9y1Xg?si=qYegyyp6VFa_ytcf", videoId: "DmvOyL9y1Xg", createdAt: "2026-02-01T00:00:00.000+09:00" },
  { id: "lesson-6", lessonNumber: 6, title: "6과 빛을 만드신 하나님", pastor: "김병교 목사", url: "https://youtu.be/auVPMGbZMPw?si=A4G67s-X8r-iBiig", videoId: "auVPMGbZMPw", createdAt: "2026-02-08T00:00:00.000+09:00" },
  { id: "lesson-7", lessonNumber: 7, title: "7과 하늘을 만드신 하나님", pastor: "오용학 목사", url: "https://youtu.be/EfYpsAzAjSQ?si=TgCzpVBVpws0u1qJ", videoId: "EfYpsAzAjSQ", createdAt: "2026-02-15T00:00:00.000+09:00" },
  { id: "lesson-8", lessonNumber: 8, title: "8과 땅에는 나무와 꽃들이 있어요", pastor: "송기호 목사", url: "https://youtu.be/QZT2E5irKYE?si=Lg9WTHmt6tVBy8qw", videoId: "QZT2E5irKYE", createdAt: "2026-02-22T00:00:00.000+09:00" },
  { id: "lesson-9", lessonNumber: 9, title: "9과 해와 달과 별을 만드신 하나님", pastor: "최정민 목사", url: "https://youtu.be/H5ntYHeIUdc?si=qAU3ffMI0wFUvkUt", videoId: "H5ntYHeIUdc", createdAt: "2026-03-01T00:00:00.000+09:00" },
  { id: "lesson-10", lessonNumber: 10, title: "10과 새를 만드신 하나님", pastor: "우병수 목사", url: "https://youtu.be/OhqPEXECArc?si=NHV1DF-wdTvpqYhd", videoId: "OhqPEXECArc", createdAt: "2026-03-08T00:00:00.000+09:00" },
  { id: "lesson-11", lessonNumber: 11, title: "11과 물고기를 만드신 하나님", pastor: "김정호 목사", url: "https://youtu.be/pHbmXeU7LRs?si=Eo144xFvA681aT_R", videoId: "pHbmXeU7LRs", createdAt: "2026-03-15T00:00:00.000+09:00" },
  { id: "lesson-12", lessonNumber: 12, title: "12과 땅에는 동물들이 살아요", pastor: "이재홍 목사", url: "https://youtu.be/SmtOIAUw398?si=B9CTCrRYIn78lyub", videoId: "SmtOIAUw398", createdAt: "2026-03-22T00:00:00.000+09:00" },
  { id: "lesson-13", lessonNumber: 13, title: "13과 하나님은 흙으로 사람을 만드셨어요", pastor: "김현동 목사", url: "https://youtu.be/rL8i-1LIx7w?si=Gh8jYManpXP_bEYe", videoId: "rL8i-1LIx7w", createdAt: "2026-03-29T00:00:00.000+09:00" },
  { id: "lesson-14", lessonNumber: 14, title: "14과 에덴동산", pastor: "송기호 목사", url: "https://youtu.be/UfmseLAF2Ag?si=Y5D4GmeifCGBm2Vn", videoId: "UfmseLAF2Ag", createdAt: "2026-04-05T00:00:00.000+09:00" },
  { id: "lesson-15", lessonNumber: 15, title: "15과 방주에 타세요", pastor: "이태훈 목사", url: "https://youtu.be/etojFkHlvPc?si=InptURYw4xXlZt1b", videoId: "etojFkHlvPc", createdAt: "2026-04-12T00:00:00.000+09:00" },
  { id: "lesson-16", lessonNumber: 16, title: "16과 바벨탑을 쌓았어요", pastor: "우병수 목사", url: "https://youtu.be/J46h3c-hgyE?si=1kP4nLVQJx190zFq", videoId: "J46h3c-hgyE", createdAt: "2026-04-19T00:00:00.000+09:00" },
  { id: "lesson-17", lessonNumber: 17, title: "17과 하나님의 말씀을 따른 아브람", pastor: "구본효 목사", url: "https://youtu.be/nLEjC27Dt3s?si=90k-ejgOidfyQu1y", videoId: "nLEjC27Dt3s", createdAt: "2026-04-26T00:00:00.000+09:00" },
  { id: "lesson-18", lessonNumber: 18, title: "18과 이삭을 바친 아브라함", pastor: "김병교 목사", url: "https://youtu.be/qilhWA78NQs?si=CHQm4cWUeMVEnaIa", videoId: "qilhWA78NQs", createdAt: "2026-05-03T00:00:00.000+09:00" },
  { id: "lesson-19", lessonNumber: 19, title: "19과 쌍둥이 형제 에서와 야곱", pastor: "신용철 목사", url: "https://youtu.be/HE0Kz_Fc5CI?si=iMbq_roHEh4EaeZ6", videoId: "HE0Kz_Fc5CI", createdAt: "2026-05-10T00:00:00.000+09:00" },
  { id: "lesson-20", lessonNumber: 20, title: "20과 총리가 된 요셉", pastor: "김경식 목사", url: "https://youtu.be/lboCIejOLz0?si=zusFqzDr2dF4xYbh", videoId: "lboCIejOLz0", createdAt: "2026-05-17T00:00:00.000+09:00" },
  { id: "lesson-21", lessonNumber: 21, title: "21과 물에서 건진 모세", pastor: "김승제 목사", url: "https://youtu.be/hUQiNTIBSmk?si=SAZH6LreGfJymXnn", videoId: "hUQiNTIBSmk", createdAt: "2026-05-24T00:00:00.000+09:00" },
  { id: "lesson-22", lessonNumber: 22, title: "22과 열가지 재앙", pastor: "박찬근 목사", url: "https://youtu.be/qZ0JXzuOyIw?si=F2ZJy-gNN0cP3cxM", videoId: "qZ0JXzuOyIw", createdAt: "2026-05-31T00:00:00.000+09:00" },
  { id: "lesson-23", lessonNumber: 23, title: "23과 홍해를 건넜어요", pastor: "이주현 목사", url: "https://youtu.be/DNobgocypGg?si=Q7Y1Qkb8T0AcmzhD", videoId: "DNobgocypGg", createdAt: "2026-06-07T00:00:00.000+09:00" },
  { id: "lesson-24", lessonNumber: 24, title: "24과 광야에서 지켜주신 하나님", pastor: "김용우 목사", url: "https://youtu.be/6EFpcXMnBqQ?si=1gopwVzFsdYT5Lt2", videoId: "6EFpcXMnBqQ", createdAt: "2026-06-14T00:00:00.000+09:00" },
  { id: "lesson-25", lessonNumber: 25, title: "25과 하나님을 의지한 여호수아와 갈렙", pastor: "김현동 목사", url: "https://youtu.be/TMQ23YblBTw?si=icDONwvOJFPkGySw", videoId: "TMQ23YblBTw", createdAt: "2026-06-21T00:00:00.000+09:00" },
  { id: "lesson-26", lessonNumber: 26, title: "26과 무너진 여리고성", pastor: "이주현 목사", url: "https://youtu.be/vN_Y_xgnGN8?si=53hXgnE0Ji28_BgV", videoId: "vN_Y_xgnGN8", createdAt: "2026-06-28T00:00:00.000+09:00" },
  { id: "lesson-27", lessonNumber: 27, title: "27과 믿음의 승리자 기드온", pastor: "이태훈 목사", url: "https://youtu.be/_qmoGeNKFtg?si=lXx8f2bm-LxHPcvu", videoId: "_qmoGeNKFtg", createdAt: "2026-07-05T00:00:00.000+09:00" },
  { id: "lesson-28", lessonNumber: 28, title: "28과 힘을 잃은 삼손", pastor: "이경준 목사", url: "https://youtu.be/u-YsVamweh0?si=ylYCK1QpB3IKqGXo", videoId: "u-YsVamweh0", createdAt: "2026-07-12T00:00:00.000+09:00" },
  { id: "lesson-29", lessonNumber: 29, title: "29과 말씀을 따르지 않은 사울 왕", pastor: "이주현 목사", url: "https://youtu.be/CCPJSFKgC3k?si=YvDrtUNK3gUW4u6g", videoId: "CCPJSFKgC3k", createdAt: "2026-07-19T00:00:00.000+09:00" },
  { id: "lesson-30", lessonNumber: 30, title: "30과 용감한 다윗", pastor: "김병교 목사", url: "https://youtu.be/NnHXuqyJiUA?si=SSiAg_jhw4n8jBql", videoId: "NnHXuqyJiUA", createdAt: "2026-07-26T00:00:00.000+09:00" },
  { id: "lesson-31", lessonNumber: 31, title: "31과 다윗과 요나단", pastor: "오용학 목사", url: "https://youtu.be/fPP-3A-3xTA?si=0Au_GHXCtC402jLj", videoId: "fPP-3A-3xTA", createdAt: "2026-08-02T00:00:00.000+09:00" },
  { id: "lesson-32", lessonNumber: 32, title: "32과 지혜의 왕 솔로몬", pastor: "구본효 목사", url: "https://youtu.be/l4Mm0LQN3Nw?si=KjgDcDZjNSRgHwz_", videoId: "l4Mm0LQN3Nw", createdAt: "2026-08-09T00:00:00.000+09:00" },
  { id: "lesson-33", lessonNumber: 33, title: "33과 선지자 엘리야", pastor: "최정민 목사", url: "https://youtu.be/oLqwEaLNCG0?si=jGbb7dw4k6cih1xl", videoId: "oLqwEaLNCG0", createdAt: "2026-08-16T00:00:00.000+09:00" },
  { id: "lesson-34", lessonNumber: 34, title: "34과 기도하는 다니엘", pastor: "신용철 목사", url: "https://youtu.be/s69HbRa8WGA?si=niG3bqeWiYrSxnZ5", videoId: "s69HbRa8WGA", createdAt: "2026-08-23T00:00:00.000+09:00" },
  { id: "lesson-35", lessonNumber: 35, title: "35과 물고기 뱃속에 갇힌 요나", pastor: "김경식 목사", url: "https://youtu.be/IfeSAbyPR3k?si=0RNH7xw02NUReWWF", videoId: "IfeSAbyPR3k", createdAt: "2026-08-30T00:00:00.000+09:00" },
  { id: "lesson-36", lessonNumber: 36, title: "36과 말씀대로 예수님께서 태어나셨어요", pastor: "최용욱 목사", url: "https://youtu.be/ELSVsZeLy0k?si=2NAQqxwQzwEChvhg", videoId: "ELSVsZeLy0k", createdAt: "2026-09-06T00:00:00.000+09:00" },
  { id: "lesson-37", lessonNumber: 37, title: "37과 지혜로우신 예수님", pastor: "오용학 목사", url: "https://youtu.be/2nxxoH992D0?si=oS35gk-nDoft2k-X", videoId: "2nxxoH992D0", createdAt: "2026-09-13T00:00:00.000+09:00" },
  { id: "lesson-38", lessonNumber: 38, title: "38과 시험을 이기신 예수님", pastor: "박동호 목사", url: "https://youtu.be/3ZJkCd33YeU?si=IKrmgE35Ooss3wzH", videoId: "3ZJkCd33YeU", createdAt: "2026-09-20T00:00:00.000+09:00" },
  { id: "lesson-39", lessonNumber: 39, title: "39과 예수님께서는 어린이를 사랑하세요", pastor: "김영석 목사", url: "https://youtu.be/pRm1frMVzKM?si=nqSMidjoWAGb8D5n", videoId: "pRm1frMVzKM", createdAt: "2026-09-27T00:00:00.000+09:00" },
  { id: "lesson-40", lessonNumber: 40, title: "40과 물로 포도주를 만드셨어요", pastor: "오용학 목사", url: "https://youtu.be/08wt-_64FhA?si=1dEDpKvOdFEwoKje", videoId: "08wt-_64FhA", createdAt: "2026-10-04T00:00:00.000+09:00" },
  { id: "lesson-41", lessonNumber: 41, title: "41과 예수님은 아픈 사람을 고쳐 주셨어요", pastor: "양현준 목사", url: "https://youtu.be/Eq3AcUM8d6I?si=9_84UcUovq4os4Go", videoId: "Eq3AcUM8d6I", createdAt: "2026-10-11T00:00:00.000+09:00" },
  { id: "lesson-42", lessonNumber: 42, title: "42과 많은 사람을 먹이셨어요", pastor: "김병교 목사", url: "https://youtu.be/4b_elKqe2Ek?si=tm-bNgxvorsrr0vV", videoId: "4b_elKqe2Ek", createdAt: "2026-10-18T00:00:00.000+09:00" },
  { id: "lesson-43", lessonNumber: 43, title: "43과 거친 바다를 잔잔하게 하셨어요", pastor: "오용학 목사", url: "https://youtu.be/BzeUs26z_bs?si=iy6enEaoMeLP913J", videoId: "BzeUs26z_bs", createdAt: "2026-10-25T00:00:00.000+09:00" },
  { id: "lesson-44", lessonNumber: 44, title: "44과 죽은 나사로를 살리셨어요", pastor: "김경식 목사", url: "https://youtu.be/69_lEATZ_ZE?si=_R1XVFIPyoypnGf1", videoId: "69_lEATZ_ZE", createdAt: "2026-11-01T00:00:00.000+09:00" },
  { id: "lesson-45", lessonNumber: 45, title: "45과 다시 찾은 아들", pastor: "최정민 목사", url: "https://youtu.be/LNNibqH4X6c?si=TVJ2rMleN2eVdONB", videoId: "LNNibqH4X6c", createdAt: "2026-11-08T00:00:00.000+09:00" },
  { id: "lesson-46", lessonNumber: 46, title: "46과 삭개오는 예수님을 만났어요", pastor: "우병수 목사", url: "https://youtu.be/azx-TFn75as?si=eQacbDI3L8pwbMa4", videoId: "azx-TFn75as", createdAt: "2026-11-15T00:00:00.000+09:00" },
  { id: "lesson-47", lessonNumber: 47, title: "47과 예수님께서 제자의 발을 씻기셨어요", pastor: "김경식 목사", url: "https://youtu.be/uKld2pVCfY0?si=hOrtPcXuzeesX1wO", videoId: "uKld2pVCfY0", createdAt: "2026-11-22T00:00:00.000+09:00" },
  { id: "lesson-48", lessonNumber: 48, title: "48과 고난 받으신 예수님", pastor: "김종철 목사", url: "https://youtu.be/4pv1gxg2HKQ?si=ApJjl5KaVsUkZgwi", videoId: "4pv1gxg2HKQ", createdAt: "2026-11-29T00:00:00.000+09:00" },
  { id: "lesson-49", lessonNumber: 49, title: "49과 예수님은 다시 살아나셨어요", pastor: "김현동 목사", url: "https://youtu.be/JEpZ1VwKLOU?si=8udT6-i5a4m6bwtR", videoId: "JEpZ1VwKLOU", createdAt: "2026-12-06T00:00:00.000+09:00" },
  { id: "lesson-50", lessonNumber: 50, title: "50과 다시 오실 예수님", pastor: "구본효 목사", url: "https://youtu.be/XzHJNokflEA?si=mxIbDo6ZeCYjwzKU", videoId: "XzHJNokflEA", createdAt: "2026-12-13T00:00:00.000+09:00" },
  { id: "lesson-51", lessonNumber: 51, title: "51과 천국", pastor: "박찬근 목사", url: "https://youtu.be/rOsDiEm9JhQ?si=poM3B5h_97wUpb_j", videoId: "rOsDiEm9JhQ", createdAt: "2026-12-20T00:00:00.000+09:00" },
  { id: "lesson-52", lessonNumber: 52, title: "52과 하나님 감사해요", pastor: "이주현 목사", url: "https://youtu.be/ENitiFDF8gs?si=4zcy10CsmMf5KTm1", videoId: "ENitiFDF8gs", createdAt: "2026-12-27T00:00:00.000+09:00" },
];

export function getLessonStartDate(lessonNumber: number) {
  return new Date(FIRST_LESSON_START_DATE.getTime() + (lessonNumber - 1) * WEEK_IN_MS);
}

export function getActiveLessonNumber(date = new Date()) {
  // 공과는 그 주(월~일)의 '일요일' 기준이다. 오늘이 속한 주의 다가오는 일요일 공과가 "이번 주 공과".
  // 예) 오늘이 월요일이면 이번 주 일요일 공과가 이번 주 공과가 되도록, 날짜(자정) 기준 ceil 로 계산한다.
  const startOfToday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekIndex = Math.ceil((startOfToday.getTime() - FIRST_LESSON_START_DATE.getTime()) / WEEK_IN_MS);
  return Math.max(1, weekIndex + 1);
}

export function getActiveLessonVideo(videos = readLessonVideos(), date = new Date()) {
  const activeLessonNumber = getActiveLessonNumber(date);
  const numberedVideos = videos
    .filter((video) => typeof video.lessonNumber === "number")
    .sort((a, b) => (a.lessonNumber ?? 0) - (b.lessonNumber ?? 0));

  return (
    numberedVideos.find((video) => video.lessonNumber === activeLessonNumber) ??
    [...numberedVideos].reverse().find((video) => (video.lessonNumber ?? 0) <= activeLessonNumber) ??
    numberedVideos[0] ??
    videos[0] ??
    null
  );
}

export function extractYoutubeVideoId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.replace("/", "").slice(0, 11);
    }
    if (url.searchParams.get("v")) {
      return url.searchParams.get("v")!.slice(0, 11);
    }
    const embedMatch = url.pathname.match(/\/(embed|shorts)\/([a-zA-Z0-9_-]{11})/);
    return embedMatch?.[2] ?? "";
  } catch {
    return "";
  }

  return "";
}

export function readLessonVideos() {
  const savedVideos = localStorage.getItem(LESSON_VIDEOS_STORAGE_KEY);
  if (!savedVideos) return DEFAULT_LESSON_VIDEOS;

  return JSON.parse(savedVideos) as LessonVideo[];
}

export function writeLessonVideos(videos: LessonVideo[]) {
  localStorage.setItem(LESSON_VIDEOS_STORAGE_KEY, JSON.stringify(videos));
}
