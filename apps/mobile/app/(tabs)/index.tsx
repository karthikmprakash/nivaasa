import { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ArrowRight, Bell, CalendarHeart, Check, ChevronRight, Package, UserRoundPlus, Wallet, Wrench } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, dateLabel, money, timeAgo, timeLabel } from "@/lib/api";
import { colors, fonts, shadow } from "@/lib/theme";
import { Avatar, Badge, Button, Card, Empty, HeroCard, Loading, Screen, SectionHeader } from "@/components/ui";

export default function HomeScreen() {
  const { session, token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setRefreshing(true);
    try { setData(await api("/api/mobile/home", { token })); setError(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load"); }
    finally { setRefreshing(false); }
  }, [token]);

  useFocusEffect(useCallback(() => { load(true); }, [load]));

  async function respond(id: string, action: "approve" | "deny" | "leave_at_gate") {
    if (!token) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
    try { await api(`/api/visitors/${id}/respond`, { method: "POST", token, body: { action } }); await load(true); }
    catch (e) { Alert.alert("Could not update", e instanceof Error ? e.message : "Try again"); }
  }

  const firstName = session?.user.name.split(" ")[0] ?? "";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (!data) return <Screen scroll={false} padded={false}>{error ? <Empty title="Couldn't load your community" body={error} action={<Button title="Retry" onPress={() => load()} />} /> : <Loading label="Opening your community…" />}</Screen>;

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load()} tintColor={colors.brand600} />}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginTop: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · {data.society}</Text>
            <Text accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontSize: 28, lineHeight: 34, color: colors.ink, marginTop: 2 }}>{greeting}, {firstName}.</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft, marginTop: 3 }}>{data.pendingVisitors.length ? `${data.pendingVisitors.length} ${data.pendingVisitors.length === 1 ? "person is" : "people are"} waiting at the gate.` : "The gate is quiet. Everything is running."}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: "center", justifyContent: "center" }}>
              <Bell size={16} color={colors.inkSoft} />
              {data.unread ? <View style={{ position: "absolute", top: 6, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.blush400, borderWidth: 1.5, borderColor: colors.surface }} /> : null}
            </Pressable>
            <Avatar name={session?.user.name ?? ""} color={session?.user.avatarColor} size={34} />
          </View>
        </View>

        <HeroCard style={{ marginTop: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>Total due</Text>
            <View style={{ borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: "rgba(255,255,255,0.8)" }}>{data.dues.count} {data.dues.count === 1 ? "invoice" : "invoices"}</Text></View>
          </View>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 33, letterSpacing: -1.3, color: "#fff", marginTop: 4 }}>{money(data.dues.total)}</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{data.dues.overdue ? `${data.dues.overdue} overdue · ` : ""}Home {data.unit}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            <Button title="Pay now" onPress={() => router.push("/(tabs)/pay")} size="sm" style={{ backgroundColor: "#fff" }} textColor={colors.brand700} />
            <Button title="View statement" onPress={() => router.push("/(tabs)/pay")} size="sm" variant="ghost" textColor="rgba(255,255,255,0.9)" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          </View>
        </HeroCard>

        <View style={{ flexDirection: "row", gap: 7, marginTop: 12 }}>
          {[
            { icon: UserRoundPlus, label: "Pre-approve", href: "/visitor-new", bg: colors.brand50, fg: colors.brand600 },
            { icon: Wrench, label: "Helpdesk", href: "/helpdesk", bg: colors.blush50, fg: colors.blush500 },
            { icon: CalendarHeart, label: "Amenities", href: "/amenities", bg: "#f2effc", fg: "#6a54c8" },
            { icon: Wallet, label: "Payments", href: "/(tabs)/pay", bg: colors.mint50, fg: colors.mint600 },
          ].map((a) => (
            <Pressable accessibilityRole="button" key={a.label} onPress={() => router.push(a.href as any)} style={{ flex: 1, alignItems: "center", gap: 6, paddingVertical: 12, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
              <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center" }}><a.icon size={18} color={colors.inkSoft} /></View>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft }}>{a.label}</Text>
            </Pressable>
          ))}
        </View>

        {data.pendingVisitors.length ? (
          <>
            <SectionHeader title="At your gate" action="All visitors" onAction={() => router.push("/(tabs)/visitors")} />
            {data.pendingVisitors.map((v: any) => (
              <View key={v.id} style={{ backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 13, marginBottom: 9, ...shadow }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Avatar name={v.name} color={v.photoColor} size={38} />
                  <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{v.name}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{v.company ? `${v.company} · ` : ""}{v.purpose ?? v.type.replace("_", " ")}</Text></View>
                  <Badge label="At gate" tone="pink" dot />
                </View>
                <View style={{ flexDirection: "row", gap: 6, marginTop: 11 }}>
                  <Button title="Deny" onPress={() => respond(v.id, "deny")} size="sm" variant="outline" style={{ flex: 1 }} />
                  {v.type === "delivery" ? <Button title="Leave" onPress={() => respond(v.id, "leave_at_gate")} size="sm" variant="soft" style={{ flex: 1 }} /> : null}
                  <Button title="Approve" onPress={() => respond(v.id, "approve")} size="sm" variant="success" style={{ flex: 1 }} icon={<Check size={13} color="#fff" />} />
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 12, marginTop: 14 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.mint50, alignItems: "center", justifyContent: "center" }}><Check size={14} color={colors.mint600} /></View>
            <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>You&apos;re all caught up</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>Approvals will appear here the moment someone arrives.</Text></View>
          </View>
        )}

        {data.deliveries?.length ? (
          <>
            <SectionHeader title="Deliveries" action="View all" onAction={() => router.push("/(tabs)/visitors")} />
            {data.deliveries.slice(0, 2).map((d: any) => <Card key={d.id} style={{ marginBottom: 7 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}><View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: d.status === "left_at_gate" ? colors.amberSoft : colors.blush50, alignItems: "center", justifyContent: "center" }}><Package size={15} color={d.status === "left_at_gate" ? colors.amberInk : colors.blush500} /></View><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{d.company} · {d.status === "left_at_gate" ? "Kept at gate" : "At the gate"}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{timeAgo(d.createdAt)}{d.otp && d.status === "left_at_gate" ? ` · Code ${d.otp}` : ""}</Text></View><Badge label={d.status === "left_at_gate" ? "Collect" : "Waiting"} tone={d.status === "left_at_gate" ? "amber" : "pink"} /></View></Card>)}
          </>
        ) : null}

        <SectionHeader title="From your community" action="See all" onAction={() => router.push("/(tabs)/community")} />
        {data.notices.map((n: any) => (
          <Pressable accessibilityRole="button" key={n.id} onPress={() => router.push("/(tabs)/community")} style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 13, marginBottom: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Badge label={n.category} tone={n.category === "event" ? "pink" : n.category === "security" ? "purple" : n.category === "finance" ? "green" : "blue"} /><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{timeAgo(n.publishedAt)}</Text>{n.pinned ? <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.blush500 }}>PINNED</Text> : null}</View>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, color: colors.ink, marginTop: 5 }}>{n.title}</Text>
            <Text numberOfLines={2} style={{ fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 2 }}>{n.body.replace(/\n/g, " ")}</Text>
          </Pressable>
        ))}

        {data.events?.length ? (
          <>
            <SectionHeader title="Coming up" action="Calendar" onAction={() => router.push("/(tabs)/community")} />
            {data.events.slice(0, 2).map((e: any) => <View key={e.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 7 }}><View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.blush50, alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: fonts.bold, fontSize: 12, textTransform: "uppercase", color: colors.blush500 }}>{dateLabel(e.startAt, { month: "short" })}</Text><Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>{new Date(e.startAt).getDate()}</Text></View><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{e.title}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{timeLabel(e.startAt)} · {e.location}</Text></View><ChevronRight size={14} color={colors.muted} /></View>)}
          </>
        ) : null}

        <Pressable accessibilityRole="button" onPress={() => router.push("/helpdesk")} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.brand50, borderRadius: 16, padding: 13, marginTop: 14 }}>
          <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}><Wrench size={15} color={colors.brand600} /></View>
          <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>Something need fixing?</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft }}>Raise a helpdesk request and track it.</Text></View>
          <ArrowRight size={14} color={colors.brand600} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
