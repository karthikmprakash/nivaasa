import { type ReactNode, type ComponentProps } from "react";
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput,
  View, type TextInputProps, type ViewStyle, type TextStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Inbox } from "lucide-react-native";
import { colors, fonts, shadow, avatarTextColor, radii } from "@/lib/theme";

export function Screen({ children, scroll = true, refreshing, onRefresh, padded = true, style }: { children: ReactNode; scroll?: boolean; refreshing?: boolean; onRefresh?: () => void; padded?: boolean; style?: ViewStyle }) {
  const inner = <View style={[!scroll && { flex: 1, minHeight: 0 }, padded && { paddingHorizontal: 18 }, style]}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.canvas }} edges={["top"]}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.brand600} /> : undefined}
        >
          {inner}
        </ScrollView>
      ) : inner}
    </SafeAreaView>
  );
}

export function BackButton({ label = "Back" }: { label?: string }) {
  const router = useRouter();
  return <Pressable accessibilityRole="button" onPress={() => router.back()} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, marginBottom: 12, alignSelf: "flex-start" }}><ArrowLeft size={15} color={colors.muted} /><Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.muted }}>{label}</Text></Pressable>;
}

export function PageHeader({ title, subtitle, eyebrow, right, serif = false, back, onBack }: { title: string; subtitle?: string; eyebrow?: string; right?: ReactNode; serif?: boolean; back?: string; onBack?: () => void }) {
  return (
    <View style={{ marginTop: 8, marginBottom: 18 }}>
      {back ? (
        <Pressable accessibilityRole="button" onPress={onBack} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
          <ArrowLeft size={15} color={colors.muted} />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.muted }}>{back}</Text>
        </Pressable>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1 }}>
          {eyebrow ? <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.3, textTransform: "uppercase", color: colors.brand600, marginBottom: 4 }}>{eyebrow}</Text> : null}
          <Text accessibilityRole="header" style={serif ? { fontFamily: fonts.serif, fontSize: 32, lineHeight: 36, color: colors.ink } : { fontFamily: fonts.semibold, fontSize: 24, letterSpacing: -0.8, color: colors.ink }}>{title}</Text>
          {subtitle ? <Text style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 18, color: colors.inkSoft, marginTop: 4 }}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const content = <View style={[styles.card, style]}>{children}</View>;
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>{content}</Pressable> : content;
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>{children}</View>;
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10, marginTop: 22 }}>
      <Text accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }}>{title}</Text>
      {action ? <Pressable accessibilityRole="button" onPress={onAction} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.brand600 }}>{action}</Text></Pressable> : null}
    </View>
  );
}

type ButtonVariant = "primary" | "outline" | "ghost" | "pink" | "soft" | "success" | "danger" | "dark";
export function Button({ title, onPress, variant = "primary", size = "md", disabled, loading, icon, style, full = false, textColor }: { title: string; onPress?: () => void; variant?: ButtonVariant; size?: "sm" | "md" | "lg"; disabled?: boolean; loading?: boolean; icon?: ReactNode; style?: ViewStyle; full?: boolean; textColor?: string }) {
  const heights = { sm: 44, md: 48, lg: 52 };
  const bg: Record<ButtonVariant, string> = { primary: colors.brand600, outline: colors.surface, ghost: "transparent", pink: colors.blush600, soft: colors.brand50, success: colors.mint600, danger: colors.danger, dark: colors.ink };
  const fg: Record<ButtonVariant, string> = { primary: "#fff", outline: colors.ink, ghost: colors.inkSoft, pink: "#fff", soft: colors.brand700, success: "#fff", danger: "#fff", dark: "#fff" };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      disabled={disabled || loading}
      onPress={() => { if (onPress) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null); onPress(); } }}
      style={({ pressed }) => [
        { height: heights[size], paddingHorizontal: size === "sm" ? 14 : 20, borderRadius: radii.control, backgroundColor: bg[variant], borderWidth: variant === "outline" ? 1 : 0, borderColor: colors.lineStrong, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        full && { width: "100%" }, style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={textColor ?? fg[variant]} /> : icon}
      <Text style={{ fontFamily: fonts.semibold, fontSize: size === "lg" ? 16 : 14, color: textColor ?? fg[variant] }}>{title}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = "neutral", dot }: { label: string; tone?: "neutral" | "blue" | "pink" | "green" | "amber" | "danger" | "purple"; dot?: boolean }) {
  const map = {
    neutral: [colors.canvas, colors.muted], blue: [colors.brand50, colors.brand700], pink: [colors.blush100, colors.blush600],
    green: [colors.mint50, colors.mint600], amber: [colors.amberSoft, colors.amberInk], danger: [colors.dangerSoft, "#b53a48"],
    purple: ["#f2effc", "#6a54c8"],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: bg }}>
      {dot ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: fg }} /> : null}
      <Text style={{ fontFamily: fonts.semibold, fontSize: 12, textTransform: "capitalize", color: fg }}>{label.replace(/_/g, " ")}</Text>
    </View>
  );
}

export function Avatar({ name, color, size = 36 }: { name: string; color?: string | null; size?: number }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join("");
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color ?? colors.brand600, alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: fonts.bold, fontSize: Math.max(12, size * 0.3), color: avatarTextColor(color ?? colors.brand600) }}>{initials}</Text></View>;
}

export function Segmented({ options, value, onChange }: { options: { value: string; label: string; count?: number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <Pressable accessibilityRole="button" accessibilityState={{ selected }} key={o.value} onPress={() => { Haptics.selectionAsync().catch(() => null); onChange(o.value); }} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: selected ? colors.brand600 : colors.line, backgroundColor: selected ? colors.brand600 : colors.surface }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: selected ? "#fff" : colors.inkSoft }}>{o.label}</Text>
            {o.count !== undefined ? <View style={{ minWidth: 15, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 999, backgroundColor: selected ? "rgba(255,255,255,0.2)" : colors.canvas }}><Text style={{ fontFamily: fonts.bold, fontSize: 12, textAlign: "center", color: selected ? "#fff" : colors.muted }}>{o.count}</Text></View> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Input({ label, hint, multiline, style, ...props }: TextInputProps & { label?: string; hint?: string; style?: ViewStyle }) {
  return (
    <View style={{ marginBottom: 12 }}>
      {label ? <Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.inkSoft, marginBottom: 5 }}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        accessibilityLabel={label}
        accessibilityHint={hint}
        multiline={multiline}
        style={[{ minHeight: multiline ? 80 : 44, borderRadius: 12, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface, paddingHorizontal: 13, paddingVertical: multiline ? 10 : 0, fontFamily: fonts.regular, fontSize: 16, color: colors.ink, textAlignVertical: multiline ? "top" : "center" }, style]}
        {...props}
      />
      {hint ? <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 4 }}>{hint}</Text> : null}
    </View>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60 }}><ActivityIndicator color={colors.brand600} /><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 10 }}>{label}</Text></View>;
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return <View style={{ alignItems: "center", paddingVertical: 36, paddingHorizontal: 20 }}><View style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: colors.brand50, alignItems: "center", justifyContent: "center" }}><Inbox size={22} color={colors.muted} /></View><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginTop: 10 }}>{title}</Text>{body ? <Text style={{ fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: "center", marginTop: 4, maxWidth: 260 }}>{body}</Text> : null}{action ? <View style={{ marginTop: 14 }}>{action}</View> : null}</View>;
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: 1, backgroundColor: colors.line }, style]} />;
}

export function InfoRow({ label, value, valueStyle }: { label: string; value: string; valueStyle?: TextStyle }) {
  return <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 }}><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{label}</Text><Text style={[{ fontFamily: fonts.semibold, fontSize: 12, color: colors.ink }, valueStyle]}>{value}</Text></View>;
}

export function HeroCard({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <LinearGradient colors={[colors.brand600, colors.brand800]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: 22, padding: 18, ...shadow }, style]}>{children}</LinearGradient>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, padding: 15, ...shadow },
});
