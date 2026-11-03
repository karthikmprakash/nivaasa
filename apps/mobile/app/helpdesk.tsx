import { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { CheckCircle2, Plus, Wrench, X } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, timeAgo } from "@/lib/api";
import { colors, fonts, shadow } from "@/lib/theme";
import { BackButton, Badge, Button, Card, Empty, Input, Loading, Screen } from "@/components/ui";

const categories = ["Plumbing", "Electrical", "Lifts", "Housekeeping", "Security", "Parking", "Common areas", "Intercom", "Internet", "Other"];

export default function HelpdeskScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Plumbing");
  const [scope, setScope] = useState("personal");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try { setData(await api("/api/mobile/helpdesk", { token })); } catch (e) { Alert.alert("Could not load", e instanceof Error ? e.message : "Try again"); }
    finally { setRefreshing(false); }
  }, [token]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function submit() {
    if (!token) return;
    if (subject.trim().length < 5 || description.trim().length < 10) return Alert.alert("Add a few more details", "Give the request a clear subject and description.");
    setBusy(true);
    try {
      await api("/api/mobile/helpdesk", { method: "POST", token, body: { category, scope, subject, description, priority } });
      setOpen(false); setSubject(""); setDescription(""); setPriority("medium");
      await load();
    } catch (e) { Alert.alert("Could not raise request", e instanceof Error ? e.message : "Try again"); }
    finally { setBusy(false); }
  }

  if (!data) return <Screen scroll={false}><Loading /></Screen>;
  return (
    <Screen scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.brand600} />}>
        <BackButton />
        <View style={{ marginTop: 8, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.bold, fontSize: 9.5, letterSpacing: 1.3, textTransform: "uppercase", color: colors.brand600 }}>Here to help</Text><Text style={{ fontFamily: fonts.serif, fontSize: 31, color: colors.ink, marginTop: 2 }}>Helpdesk</Text><Text style={{ fontFamily: fonts.regular, fontSize: 10.5, color: colors.inkSoft, marginTop: 3 }}>Track requests and raise a new one.</Text></View>
          <Button title="New" onPress={() => setOpen(true)} size="sm" icon={<Plus size={13} color="#fff" />} />
        </View>
        {data.tickets.map((t: any) => (
          <Card key={t.id} style={{ marginTop: 9 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 9 }}>
              <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: t.status === "resolved" || t.status === "closed" ? colors.mint50 : colors.brand50, alignItems: "center", justifyContent: "center" }}><Wrench size={15} color={t.status === "resolved" || t.status === "closed" ? colors.mint600 : colors.brand600} /></View>
              <View style={{ flex: 1 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 5, flexWrap: "wrap" }}><Badge label={t.status} tone={t.status === "resolved" || t.status === "closed" ? "green" : t.status === "reopened" ? "danger" : "amber"} />{t.priority === "urgent" ? <Badge label="urgent" tone="danger" /> : null}</View><Text style={{ fontFamily: fonts.semibold, fontSize: 11.5, lineHeight: 16, color: colors.ink, marginTop: 5 }}>{t.subject}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 9.5, lineHeight: 14, color: colors.muted, marginTop: 2 }}>{t.category} · updated {timeAgo(t.updatedAt)}{t.assignee ? ` · ${t.assignee}` : ""}</Text></View>
            </View>
          </Card>
        ))}
        {!data.tickets.length ? <Empty title="No requests yet" body="Something need fixing? Raise a request and the team will take it from there." action={<Button title="Raise a request" onPress={() => setOpen(true)} size="sm" />} /> : null}
      </ScrollView>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "rgba(15,28,51,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: 30, maxHeight: "92%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 18, color: colors.ink }}>Raise a request</Text><Pressable onPress={() => setOpen(false)} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center" }}><X size={15} color={colors.muted} /></Pressable></View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={{ fontFamily: fonts.semibold, fontSize: 10.5, color: colors.inkSoft, marginBottom: 5 }}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 5, marginBottom: 10 }}>{categories.map((c) => <Pressable key={c} onPress={() => setCategory(c)} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: category === c ? colors.brand600 : colors.line, backgroundColor: category === c ? colors.brand50 : colors.surface }}><Text style={{ fontFamily: fonts.semibold, fontSize: 9, color: category === c ? colors.brand700 : colors.inkSoft }}>{c}</Text></Pressable>)}</ScrollView>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 10.5, color: colors.inkSoft, marginBottom: 5 }}>Where is it?</Text>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>{[["personal", "My home"], ["community", "Common area"]].map(([v, l]) => <Pressable key={v} onPress={() => setScope(v)} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: scope === v ? colors.brand600 : colors.line, backgroundColor: scope === v ? colors.brand50 : colors.surface }}><Text style={{ fontFamily: fonts.semibold, fontSize: 9.5, color: scope === v ? colors.brand700 : colors.inkSoft }}>{l}</Text></Pressable>)}</View>
              <Input label="Subject *" value={subject} onChangeText={setSubject} placeholder="Kitchen tap is leaking" />
              <Input label="Description *" value={description} onChangeText={setDescription} placeholder="What happened, and when?" multiline />
              <Text style={{ fontFamily: fonts.semibold, fontSize: 10.5, color: colors.inkSoft, marginBottom: 5 }}>Priority</Text>
              <View style={{ flexDirection: "row", gap: 5, marginBottom: 12 }}>{["low", "medium", "high", "urgent"].map((p) => <Pressable key={p} onPress={() => setPriority(p)} style={{ flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 9, borderWidth: 1, borderColor: priority === p ? colors.brand600 : colors.line, backgroundColor: priority === p ? colors.brand50 : colors.surface }}><Text style={{ fontFamily: fonts.semibold, fontSize: 8.5, textTransform: "capitalize", color: priority === p ? colors.brand700 : colors.inkSoft }}>{p}</Text></Pressable>)}</View>
              <Button title={busy ? "Raising…" : "Raise request"} onPress={submit} loading={busy} size="lg" full />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
