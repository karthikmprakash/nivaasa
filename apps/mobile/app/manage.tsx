import { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowRight, Building2, CheckCircle2, DoorOpen, LogOut, ShieldCheck, Users, Wallet, Wrench } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, money, timeAgo } from "@/lib/api";
import { colors, fonts, shadow } from "@/lib/theme";
import { Badge, Button, Card, Loading, Screen } from "@/components/ui";

export default function ManageScreen() {
  const { session, token, signOut } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try { setData(await api("/api/mobile/manage", { token })); } catch (e) { Alert.alert("Could not load", e instanceof Error ? e.message : "Try again"); }
    finally { setRefreshing(false); }
  }, [token]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!data) return <Screen scroll={false}><Loading label="Opening admin console…" /></Screen>;
  const pending = data.pendingPayments.length + data.pendingDiscussions.length + data.moves.length;
  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 32 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.brand600} />}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <View><Text style={{ fontFamily: fonts.bold, fontSize: 9, letterSpacing: 1.3, textTransform: "uppercase", color: colors.brand600 }}>Admin console</Text><Text style={{ fontFamily: fonts.serif, fontSize: 30, color: colors.ink }}>{data.society}</Text></View>
          <View style={{ flexDirection: "row", gap: 7 }}><Pressable onPress={() => router.push("/gate")} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}><ShieldCheck size={16} color={colors.inkSoft} /></Pressable><Pressable onPress={async () => { await signOut(); router.replace("/login"); }} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}><LogOut size={15} color={colors.muted} /></Pressable></View>
        </View>
        <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.inkSoft, marginTop: 2 }}>Here&apos;s the pulse of your community, {session?.user.name.split(" ")[0]}.</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          {[{ l: "Collected", v: money(data.collections), i: Wallet, bg: colors.brand50, fg: colors.brand600 }, { l: "Outstanding", v: money(data.outstanding), i: Wallet, bg: colors.blush50, fg: colors.blush500 }, { l: "Open tickets", v: data.openTickets, i: Wrench, bg: "#f2effc", fg: "#6a54c8" }, { l: "Gate entries", v: data.visitors, i: DoorOpen, bg: colors.mint50, fg: colors.mint600 }].map((s) => <View key={s.l} style={{ width: "48.5%", backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 12, ...shadow }}><View style={{ flexDirection: "row", justifyContent: "space-between" }}><Text style={{ fontFamily: fonts.semibold, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.6, color: colors.muted }}>{s.l}</Text><View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: s.bg, alignItems: "center", justifyContent: "center" }}><s.i size={13} color={s.fg} /></View></View><Text style={{ fontFamily: fonts.semibold, fontSize: 19, color: colors.ink, marginTop: 4 }}>{s.v}</Text></View>)}
        </View>

        {pending ? <Card style={{ marginTop: 12 }}><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.ink }}>Needs attention</Text><Badge label={`${pending} open`} tone="amber" /></View>
          {data.pendingPayments.map((p: any) => <View key={p.payment.id} style={{ marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.line }}><Text style={{ fontFamily: fonts.semibold, fontSize: 10, color: colors.ink }}>Verify {p.payment.method.toUpperCase()} · {money(p.payment.amount)}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 8.5, color: colors.muted }}>{p.user} · Home {p.unit} · {timeAgo(p.payment.createdAt)}</Text></View>)}
          {data.pendingDiscussions.map((d: any) => <View key={d.d.id} style={{ marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.line }}><Text style={{ fontFamily: fonts.semibold, fontSize: 10, color: colors.ink }}>Review discussion</Text><Text style={{ fontFamily: fonts.regular, fontSize: 8.5, color: colors.muted }}>{d.user} · {d.d.title}</Text></View>)}
          {data.moves.map((m: any) => <View key={m.r.id} style={{ marginTop: 9, paddingTop: 9, borderTopWidth: 1, borderTopColor: colors.line }}><Text style={{ fontFamily: fonts.semibold, fontSize: 10, color: colors.ink, textTransform: "capitalize" }}>{m.r.type.replace("_", " ")} · Home {m.unit}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 8.5, color: colors.muted }}>{m.user}</Text></View>)}
        </Card> : <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.mint50, borderRadius: 14, padding: 12, marginTop: 12 }}><CheckCircle2 size={15} color={colors.mint600} /><Text style={{ fontFamily: fonts.medium, fontSize: 10, color: colors.mint600 }}>All clear. Nothing needs you right now.</Text></View>}

        <Card style={{ marginTop: 12 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.ink }}>Community</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}><View><Text style={{ fontFamily: fonts.medium, fontSize: 8.5, color: colors.muted }}>Homes</Text><Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.ink }}>{data.units}</Text></View><View><Text style={{ fontFamily: fonts.medium, fontSize: 8.5, color: colors.muted }}>Open invoices</Text><Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.ink }}>{data.outstandingCount}</Text></View><View><Text style={{ fontFamily: fonts.medium, fontSize: 8.5, color: colors.muted }}>Gate entries</Text><Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.ink }}>{data.visitors}</Text></View></View>
        </Card>

        <View style={{ flexDirection: "row", gap: 7, marginTop: 12 }}><Pressable onPress={() => router.push("/gate")} style={{ flex: 1, alignItems: "center", gap: 6, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 12 }}><ShieldCheck size={18} color={colors.brand600} /><Text style={{ fontFamily: fonts.semibold, fontSize: 9.5, color: colors.inkSoft }}>Gate console</Text></Pressable>{session?.unit ? <Pressable onPress={() => router.replace("/(tabs)")} style={{ flex: 1, alignItems: "center", gap: 6, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 12 }}><Building2 size={18} color={colors.brand600} /><Text style={{ fontFamily: fonts.semibold, fontSize: 9.5, color: colors.inkSoft }}>Resident app</Text></Pressable> : null}</View>
        <Text style={{ fontFamily: fonts.regular, fontSize: 8.5, lineHeight: 13, color: colors.muted, marginTop: 14, textAlign: "center" }}>For the full admin console — billing, residents, communications and reports — sign in on the web.</Text>
      </ScrollView>
    </Screen>
  );
}
