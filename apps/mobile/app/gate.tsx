import { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { AlertTriangle, CheckCircle2, Clock3, DoorOpen, KeyRound, LogOut, MapPin, Package, ShieldCheck, Users } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, timeAgo, timeLabel, todayLocal } from "@/lib/api";
import { colors, fonts } from "@/lib/theme";
import { Avatar, Badge, Button, Card, Loading, Screen } from "@/components/ui";

export default function GateScreen() {
  const { session, token, signOut } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try { setData(await api("/api/mobile/gate", { token })); } catch (e) { Alert.alert("Could not load gate", e instanceof Error ? e.message : "Try again"); }
    finally { setRefreshing(false); }
  }, [token]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function enter(id: string) {
    setBusy(id);
    try { await api(`/api/gate/visitors/${id}/entry`, { method: "POST", token }); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null); await load(); }
    catch (e) { Alert.alert("Could not record entry", e instanceof Error ? e.message : "Try again"); }
    finally { setBusy(null); }
  }
  async function scan(id: string) {
    setBusy(id);
    try { await api("/api/gate/patrol", { method: "POST", token, body: { checkpointId: id } }); await load(); }
    catch (e) { Alert.alert("Could not record patrol", e instanceof Error ? e.message : "Try again"); }
    finally { setBusy(null); }
  }

  if (!data) return <Screen scroll={false} padded={false}><Loading label="Opening gate console…" /></Screen>;
  const pending = data.queue.filter((q: any) => q.status === "pending");
  const approved = data.queue.filter((q: any) => q.status === "approved");
  const scanned = data.checkpoints.filter((c: any) => c.scanned).length;
  return (
    <Screen scroll={false} padded={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.brand600} />}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <View><Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.3, textTransform: "uppercase", color: colors.brand600 }}>Gate 1 · On duty</Text><Text accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontSize: 28, color: colors.ink }}>Namaste, {session?.user.name.split(" ")[0]}.</Text></View>
          <Pressable accessibilityRole="button" onPress={async () => { await signOut(); router.replace("/login"); }} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}><LogOut size={15} color={colors.muted} /></Pressable>
        </View>
        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft, marginTop: 2 }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · Morning shift</Text>

        <View style={{ flexDirection: "row", gap: 7, marginTop: 12 }}>
          {[{ l: "Waiting", v: pending.length, i: Clock3, bg: colors.amberSoft, fg: colors.amberInk }, { l: "Approved", v: approved.length, i: ShieldCheck, bg: colors.mint50, fg: colors.mint600 }, { l: "Deliveries", v: data.deliveries.length, i: Package, bg: colors.blush50, fg: colors.blush500 }, { l: "Patrol", v: `${scanned}/${data.checkpoints.length}`, i: MapPin, bg: "#f2effc", fg: "#6a54c8" }].map((s) => <View key={s.l} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 13, borderWidth: 1, borderColor: colors.line, padding: 9 }}><View style={{ width: 24, height: 24, borderRadius: 8, backgroundColor: s.bg, alignItems: "center", justifyContent: "center" }}><s.i size={12} color={s.fg} /></View><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginTop: 5 }}>{s.v}</Text><Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted }}>{s.l}</Text></View>)}
        </View>

        {data.alerts.length ? <View style={{ backgroundColor: colors.dangerSoft, borderRadius: 12, padding: 10, marginTop: 10 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: "#a82f3e" }}>⚠ {data.alerts.length} panic alert — respond immediately</Text></View> : null}

        <Text style={{ fontFamily: fonts.serif, fontSize: 21, color: colors.ink, marginTop: 18, marginBottom: 4 }}>Waiting for approval</Text>
        {pending.map((v: any) => <Card key={v.id} style={{ marginTop: 7 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}><Avatar name={v.name} color={v.photoColor} size={34} /><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{v.name}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{v.company ?? v.type.replace("_", " ")} · Home {v.unit} · {timeAgo(v.createdAt)}</Text></View><Badge label="Awaiting" tone="amber" /></View>{v.hostPhone ? <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.brand600, marginTop: 5 }}>Resident: {v.hostPhone}</Text> : null}</Card>)}
        {!pending.length ? <Card><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>No one waiting. The gate is clear.</Text></Card> : null}

        {approved.length ? <><Text style={{ fontFamily: fonts.serif, fontSize: 21, color: colors.ink, marginTop: 18, marginBottom: 4 }}>Approved — ready to enter</Text>{approved.map((v: any) => <Card key={v.id} style={{ marginTop: 7, borderColor: colors.mint600 + "55" }}><View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}><Avatar name={v.name} color={v.photoColor} size={34} /><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{v.name}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{v.company ?? v.type.replace("_", " ")} · Home {v.unit}</Text></View><Button title="Record entry" onPress={() => enter(v.id)} loading={busy === v.id} size="sm" variant="success" /></View></Card>)}</> : null}

        <Text style={{ fontFamily: fonts.serif, fontSize: 21, color: colors.ink, marginTop: 18, marginBottom: 4 }}>Pre-approved today</Text>
        {data.passes.slice(0, 6).map((p: any) => <Card key={p.id} style={{ marginTop: 6 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><KeyRound size={14} color={colors.mint600} /><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{p.name} · Home {p.unit}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{p.company ?? p.type.replace("_", " ")} · code ••{p.code?.slice(-2)}</Text></View><Badge label="Expected" tone="green" /></View></Card>)}

        <Text style={{ fontFamily: fonts.serif, fontSize: 21, color: colors.ink, marginTop: 18, marginBottom: 4 }}>Patrol checkpoints</Text>
        {data.checkpoints.map((c: any) => <Card key={c.id} style={{ marginTop: 6 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: c.scanned ? colors.mint50 : colors.canvas, alignItems: "center", justifyContent: "center" }}>{c.scanned ? <CheckCircle2 size={13} color={colors.mint600} /> : <MapPin size={13} color={colors.muted} />}</View><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{c.name}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{c.location}</Text></View>{c.scanned ? <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.mint600 }}>Scanned</Text> : <Button title="Scan" onPress={() => scan(c.id)} loading={busy === c.id} size="sm" variant="soft" />}</View></Card>)}

        <Text style={{ fontFamily: fonts.serif, fontSize: 21, color: colors.ink, marginTop: 18, marginBottom: 4 }}>Daily help & staff</Text>
        {data.staff.slice(0, 8).map((s: any) => <Card key={s.id} style={{ marginTop: 6 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Avatar name={s.name} color={s.photoColor} size={30} /><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{s.name}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{s.role}{s.unit ? ` · Home ${s.unit}` : ""}</Text></View>{s.attendance?.checkInAt ? <Badge label={`In ${timeLabel(s.attendance.checkInAt)}`} tone="green" /> : <Badge label="Not in" tone="neutral" />}</View></Card>)}

        <Text style={{ fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: "center", marginTop: 16 }}>New visitor entry, deliveries and full shift controls are available in the web guard console.</Text>
      </ScrollView>
    </Screen>
  );
}
