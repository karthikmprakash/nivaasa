import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { CheckCircle2, KeyRound } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth";
import { api, todayLocal } from "@/lib/api";
import { colors, fonts, shadow } from "@/lib/theme";
import { BackButton, Button, Input, Screen } from "@/components/ui";

const types = [{ v: "guest", l: "Guest" }, { v: "delivery", l: "Delivery" }, { v: "cab", l: "Cab" }, { v: "domestic_help", l: "Daily help" }, { v: "vendor", l: "Vendor" }, { v: "other", l: "Other" }];

export default function VisitorNewScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [type, setType] = useState("guest");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [purpose, setPurpose] = useState("");
  const [date, setDate] = useState(todayLocal());
  const [days, setDays] = useState(1);
  const [notes, setNotes] = useState("");
  const [leaveAtGate, setLeaveAtGate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  async function submit() {
    if (!token) return;
    if (!name.trim()) return Alert.alert("Visitor name required", "Add the person you're expecting.");
    setBusy(true);
    try {
      const res = await api<any>("/api/mobile/preapprove", { method: "POST", token, body: { name, phone, type, company, purpose, date, days, notes, leaveAtGate } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
      setCode(res.code);
    } catch (e) { Alert.alert("Could not create pass", e instanceof Error ? e.message : "Try again"); }
    finally { setBusy(false); }
  }

  if (code) return (
    <Screen>
      <View style={{ alignItems: "center", backgroundColor: colors.surface, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 24, marginTop: 40, ...shadow }}>
        <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: colors.mint50, alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={30} color={colors.mint600} /></View>
        <Text style={{ fontFamily: fonts.serif, fontSize: 28, color: colors.ink, marginTop: 12 }}>Pass is ready.</Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.muted, textAlign: "center", marginTop: 4 }}>Share this code with {name}. The guard will verify it at the gate.</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.brand50, borderRadius: 16, paddingHorizontal: 20, paddingVertical: 14, marginTop: 18 }}><KeyRound size={18} color={colors.brand600} /><Text style={{ fontFamily: fonts.bold, fontSize: 26, letterSpacing: 7, color: colors.brand700 }}>{code}</Text></View>
        <Text style={{ fontFamily: fonts.medium, fontSize: 9, color: colors.muted, marginTop: 10 }}>Valid from {date} for {days} day{days > 1 ? "s" : ""}</Text>
        <Button title="Done" onPress={() => router.back()} full style={{ marginTop: 20 }} />
      </View>
    </Screen>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: colors.canvas }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <BackButton />
        <View style={{ marginTop: 8, marginBottom: 14 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 9.5, letterSpacing: 1.3, textTransform: "uppercase", color: colors.brand600 }}>Visitors</Text>
          <Text style={{ fontFamily: fonts.serif, fontSize: 30, color: colors.ink, marginTop: 2 }}>Pre-approve a visitor</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 10.5, color: colors.inkSoft, marginTop: 3 }}>Skip the gate call with a 6-digit passcode.</Text>
        </View>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 10.5, color: colors.inkSoft, marginBottom: 6 }}>Visitor type</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>{types.map((t) => <Pressable key={t.v} onPress={() => setType(t.v)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: type === t.v ? colors.brand600 : colors.line, backgroundColor: type === t.v ? colors.brand50 : colors.surface }}><Text style={{ fontFamily: fonts.semibold, fontSize: 9.5, color: type === t.v ? colors.brand700 : colors.inkSoft }}>{t.l}</Text></Pressable>)}</View>
        <View style={{ marginTop: 8 }}>
          <Input label="Visitor name *" value={name} onChangeText={setName} placeholder="e.g. Rohit Sharma" />
          <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91…" />
          <Input label={type === "delivery" ? "Company / platform" : "Company / note"} value={company} onChangeText={setCompany} placeholder={type === "delivery" ? "Swiggy, Amazon…" : "Optional"} />
          <Input label="Purpose" value={purpose} onChangeText={setPurpose} placeholder="Dinner, delivery, service…" />
          <Text style={{ fontFamily: fonts.semibold, fontSize: 10.5, color: colors.inkSoft, marginBottom: 6 }}>Valid from</Text>
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>{[{ l: "Today", d: todayLocal() }, { l: "Tomorrow", d: todayLocal(1) }, { l: "In a week", d: todayLocal(7) }].map((d) => <Pressable key={d.l} onPress={() => setDate(d.d)} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: date === d.d ? colors.brand600 : colors.line, backgroundColor: date === d.d ? colors.brand50 : colors.surface }}><Text style={{ fontFamily: fonts.semibold, fontSize: 9, color: date === d.d ? colors.brand700 : colors.inkSoft }}>{d.l}</Text></Pressable>)}</View>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 10.5, color: colors.inkSoft, marginBottom: 6 }}>Valid for</Text>
          <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>{[1, 3, 7, 14].map((n) => <Pressable key={n} onPress={() => setDays(n)} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: days === n ? colors.brand600 : colors.line, backgroundColor: days === n ? colors.brand50 : colors.surface }}><Text style={{ fontFamily: fonts.semibold, fontSize: 9, color: days === n ? colors.brand700 : colors.inkSoft }}>{n === 1 ? "1 day" : `${n} days`}</Text></Pressable>)}</View>
          <Input label="Notes for the guard" value={notes} onChangeText={setNotes} placeholder="Anything security should know?" multiline />
          {type === "delivery" ? <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 11, marginBottom: 6 }}><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 10.5, color: colors.ink }}>Allow leave at gate</Text><Text style={{ fontFamily: fonts.regular, fontSize: 8.5, color: colors.muted }}>Keep the parcel at the gate and send a pickup code.</Text></View><Switch value={leaveAtGate} onValueChange={setLeaveAtGate} trackColor={{ true: colors.brand500 }} /></View> : null}
        </View>
        <Button title={busy ? "Creating pass…" : "Generate visitor pass"} onPress={submit} loading={busy} size="lg" full style={{ marginTop: 8 }} />
        <Text style={{ fontFamily: fonts.regular, fontSize: 8.5, color: colors.muted, textAlign: "center", marginTop: 10 }}>A 6-digit code will be generated. It is valid for the dates you chose.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
