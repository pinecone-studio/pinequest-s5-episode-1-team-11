// Night palette, dark mode: the same values as the web (src/app/globals.css `.dark[data-palette="night"]`).
// Blue reads as calm in normal times; warning amber and danger red stay fixed.
export const colors = {
  bg: "#0A1226",
  card: "#141E38",
  surface: "#1F2A49",
  border: "#47567C",
  hairline: "rgba(255,255,255,0.12)",
  inputBorder: "#7383A8",
  text: "#F8FAFC",
  muted: "#A3B0CC",
  primary: "#93C5FD",
  primaryButton: "#60A5FA",
  primarySoft: "#1B3366",
  onPrimary: "#061430",
  danger: "#F87171",
  dangerButton: "#EF4444",
  dangerSurface: "#3A1A20",
  warning: "#FBBF24",
  warningButton: "#F59E0B",
  onWarning: "#1C1203",
  glass: "rgba(20,30,56,0.58)",
  glassStrong: "rgba(20,30,56,0.88)",
  glassBorder: "rgba(255,255,255,0.14)",
} as const;

export const aurora = {
  calm: "radial-gradient(60% 38% at 16% 10%, rgba(96,165,250,0.32), transparent 70%), radial-gradient(55% 42% at 94% 46%, rgba(99,102,241,0.2), transparent 70%), radial-gradient(70% 38% at 40% 104%, rgba(34,211,238,0.16), transparent 70%)",
  alert:
    "radial-gradient(70% 42% at 20% 6%, rgba(239,68,68,0.58), transparent 70%), radial-gradient(60% 48% at 96% 44%, rgba(244,63,94,0.36), transparent 70%), radial-gradient(80% 44% at 40% 106%, rgba(153,27,27,0.6), transparent 70%)",
  alertBg: "#14070B",
};

// Onest for text, Geologica for headlines and numerals (both draw Ө and Ү), as on the web.
export const fonts = {
  body: "Onest_500Medium",
  semibold: "Onest_600SemiBold",
  bold: "Onest_700Bold",
  display: "Geologica_600SemiBold",
} as const;
