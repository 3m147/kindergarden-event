import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 유치부 파스텔 팔레트
        pastel: {
          yellow: "#FFF4B8",
          yellowDeep: "#F7C948",
          green:  "#CDEFC4",
          greenDeep: "#5FB96A",
          blue:   "#CDE7FB",
          blueDeep: "#5AA7E6",
          pink:   "#FCD5E0",
          cream:  "#FFFBEF",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 24px rgba(90, 120, 160, 0.12)",
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
