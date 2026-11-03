export const colors = {
  canvas: "#f5f6f8",
  surface: "#ffffff",
  ink: "#131a2a",
  inkSoft: "#4b566c",
  muted: "#626e82",
  line: "#e3e7ee",
  lineStrong: "#cbd2df",
  brand50: "#f2f5ff",
  brand100: "#e7edff",
  brand200: "#cfdbff",
  brand400: "#7795f7",
  brand500: "#4f70e8",
  brand600: "#3155d8",
  brand700: "#2643b8",
  brand800: "#223b94",
  blush50: "#fff5f8",
  blush100: "#fdeaf0",
  blush200: "#fbd2df",
  blush300: "#f6abc4",
  blush400: "#ef7fa4",
  blush500: "#e55d8b",
  blush600: "#cc3d71",
  mint50: "#eefaf4",
  mint600: "#18764e",
  amberSoft: "#fff6e2",
  amberInk: "#87530e",
  danger: "#d94a5a",
  dangerSoft: "#fdeced",
};

export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extraBold: "PlusJakartaSans_800ExtraBold",
  serif: "InstrumentSerif_400Regular",
  serifItalic: "InstrumentSerif_400Regular_Italic",
};

export const shadow = {
  shadowColor: "#131a2a",
  shadowOpacity: 0.06,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 3,
};

export const typeScale = { caption: 13, body: 15, section: 17, title: 29 } as const;
export const radii = { control: 10, card: 16, overlay: 20 } as const;

export function avatarTextColor(background: string) {
  const hex = background.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return "#ffffff";
  const values = [0, 2, 4].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722 > 0.179 ? colors.ink : "#ffffff";
}
