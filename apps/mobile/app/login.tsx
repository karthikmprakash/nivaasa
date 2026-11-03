import { BrandMark } from "@/components/brand";
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth";
import { colors, fonts, shadow } from "@/lib/theme";
import { Avatar, Button } from "@/components/ui";

const demos = [
  { email: "resident@nivaasa.app", label: "Resident", name: "Aarav", color: colors.brand100 },
  { email: "admin@nivaasa.app", label: "Admin", name: "Priya", color: colors.blush100 },
  { email: "guard@nivaasa.app", label: "Guard", name: "Ramesh", color: colors.mint50 },
];

export default function LoginScreen() {
  const { session, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("resident@nivaasa.app");
  const [password, setPassword] = useState("demo1234");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Redirect href="/" />;

  async function submit() {
    setBusy(true); setError(null);
    try {
      const s = await signIn(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
      const role = s.membership?.role;
      if (role === "guard") router.replace("/gate");
      else if (!s.unit && (s.user.globalRole === "super_admin" || ["admin", "manager", "accountant", "helpdesk_manager", "security_manager", "auditor"].includes(role ?? ""))) router.replace("/manage");
      else router.replace("/(tabs)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in");
    } finally { setBusy(false); }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View style={{ backgroundColor: "#0f1c33", paddingTop: 64, paddingBottom: 34, paddingHorizontal: 24, borderBottomLeftRadius: 34, borderBottomRightRadius: 34 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <BrandMark />
            <View><Text style={{ fontFamily: fonts.extraBold, fontSize: 22, letterSpacing: -1, color: "#fff" }}>nivaasa<Text style={{ color: colors.blush400 }}>.</Text></Text><Text style={{ fontFamily: fonts.medium, fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase", color: "rgba(255,255,255,0.8)" }}>community, in one place</Text></View>
          </View>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 34, lineHeight: 40, letterSpacing: -1.2, color: "#fff", marginTop: 34 }}>Welcome home.</Text>
          <Text style={{ fontFamily: fonts.serifItalic, fontSize: 31, lineHeight: 36, color: colors.blush300 }}>Everything&apos;s running.</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: "rgba(255,255,255,0.8)", marginTop: 12, maxWidth: 290 }}>Approvals, payments, community and the parts of home life that should just work.</Text>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: -20 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 24, padding: 20, ...shadow }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.ink, marginBottom: 3 }}>Sign in</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginBottom: 16 }}>Use your community account or a demo persona.</Text>

            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft, marginBottom: 5 }}>Email</Text>
            <View style={fieldWrap}><Mail size={15} color={colors.muted} /><TextInput accessibilityLabel="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@nivaasa.app" placeholderTextColor={colors.muted} style={fieldInput} /></View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft }}>Password</Text>
              <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted }}>Demo: demo1234</Text>
            </View>
            <View style={[fieldWrap, { marginTop: 5 }]}><LockKeyhole size={15} color={colors.muted} /><TextInput accessibilityLabel="Password" value={password} onChangeText={setPassword} secureTextEntry={!show} placeholder="Your password" placeholderTextColor={colors.muted} style={fieldInput} /><Pressable accessibilityRole="button" accessibilityLabel={show ? "Hide password" : "Show password"} onPress={() => setShow((s) => !s)} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>{show ? <EyeOff size={16} color={colors.muted} /> : <Eye size={16} color={colors.muted} />}</Pressable></View>

            {error ? <View style={{ backgroundColor: colors.dangerSoft, borderRadius: 10, padding: 10, marginTop: 12 }}><Text style={{ fontFamily: fonts.medium, fontSize: 12, color: "#b53a48" }}>{error}</Text></View> : null}

            <Button title={busy ? "Signing in…" : "Sign in"} onPress={submit} loading={busy} size="lg" full style={{ marginTop: 16 }} />

            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 16 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} /><Text style={{ fontFamily: fonts.semibold, fontSize: 14, letterSpacing: 1.2, textTransform: "uppercase", color: colors.muted }}>Demo accounts</Text><View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
            </View>

            <View style={{ flexDirection: "row", gap: 7, marginTop: 12 }}>
              {demos.map((d) => <Pressable accessibilityRole="button" accessibilityState={{ selected: email === d.email }} key={d.email} onPress={() => { setEmail(d.email); setPassword("demo1234"); Haptics.selectionAsync().catch(() => null); }} style={{ flex: 1, borderRadius: 14, borderWidth: 1, borderColor: email === d.email ? colors.brand400 : colors.line, backgroundColor: email === d.email ? colors.brand50 : colors.surface, padding: 9, alignItems: "center", gap: 5 }}><Avatar name={d.name} size={26} color={d.color === colors.blush100 ? colors.blush400 : d.color === colors.mint50 ? colors.mint600 : colors.brand600} /><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{d.label}</Text></Pressable>)}
            </View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 10, textAlign: "center" }}>Tap a persona to fill the credentials, then sign in.</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 }}>
            <ShieldCheck size={12} color={colors.mint600} /><Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted }}>Secure access · your data stays in your community</Text>
          </View>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted, textAlign: "center", marginTop: 18, marginBottom: 24 }}>Nivaasa · open source community operating system</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const fieldWrap = { height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface, flexDirection: "row" as const, alignItems: "center" as const, gap: 9, paddingHorizontal: 13, marginTop: 5 };
const fieldInput = { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.ink, height: "100%" as const };
