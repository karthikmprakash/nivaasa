import { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Clock3, KeyRound, Plus, ShieldCheck, UserRoundCheck } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/lib/auth";
import { api, dateLabel, timeAgo, timeLabel } from "@/lib/api";
import { colors, fonts } from "@/lib/theme";
import { Avatar, Badge, Button, Card, Empty, Loading, Screen, Segmented } from "@/components/ui";

export default function VisitorsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState("pending");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try { setData(await api("/api/mobile/visitors", { token })); } catch (e) { Alert.alert("Could not load", e instanceof Error ? e.message : "Try again"); }
    finally { setRefreshing(false); }
  }, [token]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function respond(id: string, action: "approve" | "deny" | "leave_at_gate") {
    if (!token) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
    try { await api(`/api/visitors/${id}/respond`, { method: "POST", token, body: { action } }); await load(); }
    catch (e) { Alert.alert("Could not update", e instanceof Error ? e.message : "Try again"); }
  }

  if (!data) return <Screen scroll={false} padded={false}><Loading label="Opening visitors…" /></Screen>;

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.brand600} />}>
        <View style={{ marginTop: 8, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.3, textTransform: "uppercase", color: colors.brand600 }}>Gate & security</Text>
            <Text accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontSize: 28, color: colors.ink, marginTop: 2 }}>Visitors</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft, marginTop: 3 }}>Approve people at the gate and create passes for expected guests.</Text>
          </View>
          <Button title="Pre-approve" onPress={() => router.push("/visitor-new")} size="sm" icon={<Plus size={13} color="#fff" />} />
        </View>

        <View style={{ flexDirection: "row", gap: 7, marginTop: 14 }}>
          {[{ l: "Waiting", v: data.pending.length, c: colors.blush50, f: colors.blush500 }, { l: "Passes", v: data.passes.length, c: colors.brand50, f: colors.brand600 }, { l: "Help today", v: data.help.filter((h: any) => h.attendance?.checkInAt).length, c: colors.mint50, f: colors.mint600 }].map((s) => <View key={s.l} style={{ flex: 1, backgroundColor: s.c, borderRadius: 14, padding: 11 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.ink }}>{s.v}</Text><Text style={{ fontFamily: fonts.medium, fontSize: 12, color: s.f }}>{s.l}</Text></View>)}
        </View>

        <View style={{ marginTop: 14 }}><Segmented value={tab} onChange={setTab} options={[{ value: "pending", label: "Waiting", count: data.pending.length }, { value: "passes", label: "Pre-approved", count: data.passes.length }, { value: "history", label: "History", count: data.history.length }]} /></View>

        {tab === "pending" ? (data.pending.length ? data.pending.map((v: any) => (
          <Card key={v.id} style={{ marginTop: 9 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Avatar name={v.name} color={v.photoColor} size={38} />
              <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{v.name}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{v.company ? `${v.company} · ` : ""}{v.purpose ?? v.type.replace("_", " ")}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 1 }}>{timeAgo(v.createdAt)}</Text></View>
              <Badge label="At gate" tone="pink" dot />
            </View>
            <View style={{ flexDirection: "row", gap: 6, marginTop: 11 }}>
              <Button title="Deny" onPress={() => respond(v.id, "deny")} size="sm" variant="outline" style={{ flex: 1 }} />
              {v.type === "delivery" ? <Button title="Leave" onPress={() => respond(v.id, "leave_at_gate")} size="sm" variant="soft" style={{ flex: 1 }} /> : null}
              <Button title="Approve" onPress={() => respond(v.id, "approve")} size="sm" variant="success" style={{ flex: 1 }} />
            </View>
          </Card>
        )) : <Empty title="The gate is quiet" body="Nobody is waiting for your approval right now." />) : null}

        {tab === "passes" ? (data.passes.length ? data.passes.map((v: any) => (
          <Card key={v.id} style={{ marginTop: 9 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Avatar name={v.name} color={v.photoColor} size={36} /><View><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{v.name}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{v.company ?? v.type.replace("_", " ")}</Text></View></View>
              <Badge label={v.leaveAtGate ? "Leave at gate" : "Pre-approved"} tone={v.leaveAtGate ? "amber" : "green"} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.canvas, borderRadius: 12, padding: 10, marginTop: 10 }}>
              <KeyRound size={14} color={colors.brand600} />
              <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, textTransform: "uppercase", letterSpacing: 0.8, color: colors.muted }}>Entry code</Text><Text style={{ fontFamily: fonts.bold, fontSize: 16, letterSpacing: 3, color: colors.ink, marginTop: 1 }}>{v.code}</Text></View>
              <View style={{ alignItems: "flex-end" }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, textTransform: "uppercase", letterSpacing: 0.8, color: colors.muted }}>Valid</Text><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{dateLabel(v.validFrom)} – {dateLabel(v.validTo)}</Text></View>
            </View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 7 }}>Share the code with your visitor. The guard verifies it at the gate.</Text>
          </Card>
        )) : <Empty title="No active passes" body="Pre-approve a guest and they can walk straight in with their code." action={<Button title="Create a pass" onPress={() => router.push("/visitor-new")} size="sm" />} />) : null}

        {tab === "history" ? (data.history.length ? data.history.slice(0, 30).map((v: any) => (
          <Card key={v.id} style={{ marginTop: 7 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Avatar name={v.name} color={v.photoColor} size={32} /><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{v.name}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{v.company ?? v.type.replace("_", " ")} · {dateLabel(v.createdAt)}{v.enteredAt ? ` · in ${timeLabel(v.enteredAt)}` : ""}</Text></View><Badge label={v.status} tone={v.status === "denied" ? "danger" : v.status === "entered" ? "pink" : "green"} /></View></Card>
        )) : <Empty title="No visitor history yet" />) : null}

        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginTop: 22, marginBottom: 8 }}>Daily help today</Text>
        {data.help.length ? data.help.map((h: any) => <Card key={h.id} style={{ marginBottom: 7 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}><Avatar name={h.name} color={h.photoColor} size={32} /><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{h.name}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{h.role} · {h.shift}</Text></View>{h.attendance?.checkInAt ? <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><ShieldCheck size={11} color={colors.mint600} /><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.mint600 }}>In {timeLabel(h.attendance.checkInAt)}</Text></View> : <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>Not in yet</Text>}</View></Card>) : <Card><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>No daily help added yet. Add them from the web app or ask the community office.</Text></Card>}
      </ScrollView>
    </Screen>
  );
}
