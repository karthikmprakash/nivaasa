import Svg, { Circle, Path, Rect } from "react-native-svg";

/** The same Nivaasa mark as the web app, rendered with native vectors. */
export function BrandMark({ size = 40 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <Rect width={40} height={40} rx={12} fill="#3155d8" />
    <Path d="M11.5 29V16.4L28.5 29V12.8" stroke="white" strokeWidth={3.1} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={28.5} cy={9.4} r={3.1} fill="#f6a8c1" />
  </Svg>;
}
