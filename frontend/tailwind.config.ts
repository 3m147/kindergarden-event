import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 교사용 운영 화면 팔레트: 차분한 업무용 톤을 기본으로 사용
        pastel: {
          yellow: "#FEF3C7",
          yellowDeep: "#B45309",
          green:  "#D1FAE5",
          greenDeep: "#047857",
          blue:   "#DBEAFE",
          blueDeep: "#2563EB",
          pink:   "#FEE2E2",
          cream:  "#F8FAFC",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.10)",
      },
      // "완료" 로 초록 체크가 프로필에 박힐 때 짧게 튀어나오는 팝 효과
      keyframes: {
        pop: {
          "0%":   { transform: "scale(0.6)", opacity: "0" },
          "60%":  { transform: "scale(1.15)", opacity: "1" },
          "100%": { transform: "scale(1)",    opacity: "1" },
        },
        // 바텀시트가 아래에서 스윽 올라오는 느낌
        "slide-up": {
          "0%":   { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        pop: "pop 0.35s ease-out",
        "slide-up": "slide-up 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)",
        "fade-in": "fade-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
