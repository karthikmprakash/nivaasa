import { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { CalendarDays, Check, Heart, MapPin, MessageCircle, Star } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, dateLabel, timeAgo, timeLabel } from "@/lib/api";
import { colors, fonts } from "@/lib/theme";
import { Avatar, Badge, Button, Card, Empty, Loading, Screen, Segmented } from "@/components/ui";

export default function CommunityScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState("notices");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try { setData(await api("/api/mobile/community", { token })); } catch (e) { Alert.alert("Could not load", e instanceof Error ? e.message : "Try again"); }
    finally { setRefreshing(false); }
  }, [token]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function vote(poll: any, optionId: string) {
    if (!token) return;
    Haptics.selectionAsync().catch(() => null);
    try {
      await api("/api/community/poll", { method: "POST", token, body: { pollId: poll.id, optionId } });
      setData((prev: any) => ({ ...prev, polls: prev.polls.map((p: any) => p.id === poll.id ? { ...p, myVote: optionId, counts: { ...p.counts, [optionId]: (p.counts[optionId] ?? 0) + 1 }, total: p.total + 1 } : p) }));
    } catch (e) { Alert.alert("Could not vote", e instanceof Error ? e.message : "Try again"); }
  }
  async function rsvp(eventId: string) {
    if (!token) return;
    try {
      const res = await api<any>("/api/mobile/rsvp", { method: "POST", token, body: { eventId } });
      setData((prev: any) => ({ ...prev, myRsvps: res.going ? [...prev.myRsvps, eventId] : prev.myRsvps.filter((id: string) => id !== eventId) }));
    } catch (e) { Alert.alert("Could not RSVP", e instanceof Error ? e.message : "Try again"); }
  }

  if (!data) return <Screen scroll={false} padded={false}><Loading label="Opening community…" /></Screen>;
  return (
    <Screen scroll={false} padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.brand600} />}>
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.3, textTransform: "uppercase", color: colors.brand600 }}>Your community</Text>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontSize: 28, color: colors.ink, marginTop: 2 }}>Community</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft, marginTop: 3 }}>Notices, conversations, polls and the things coming up.</Text>
        </View>
        <View style={{ marginTop: 14 }}>
          <Segmented value={tab} onChange={setTab} options={[{ value: "notices", label: "Notices", count: data.notices.length }, { value: "discussions", label: "Discussions", count: data.discussions.length }, { value: "polls", label: "Polls", count: data.polls.length }, { value: "events", label: "Events", count: data.events.length }]} />
        </View>

        {tab === "notices" ? data.notices.map((n: any) => (
          <Card key={n.id} style={{ marginTop: 9 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Badge label={n.category} tone={n.category === "event" ? "pink" : n.category === "security" ? "purple" : "blue"} />{n.pinned ? <Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.blush500 }}>PINNED</Text> : null}<Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{timeAgo(n.publishedAt)}</Text></View>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, color: colors.ink, marginTop: 6 }}>{n.title}</Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.inkSoft, marginTop: 4 }}>{n.body}</Text>
            <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 8 }}>By {n.author ?? "Committee"} · {n.views} views</Text>
          </Card>
        )) : null}

        {tab === "discussions" ? data.discussions.map((d: any) => (
          <Card key={d.id} style={{ marginTop: 9 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Avatar name={d.author} color={d.color} size={30} /><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{d.author}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{timeAgo(d.createdAt)} · {d.category.replace("_", " ")}</Text></View></View>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, color: colors.ink, marginTop: 8 }}>{d.title}</Text>
            <Text numberOfLines={3} style={{ fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.inkSoft, marginTop: 3 }}>{d.body}</Text>
            <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><MessageCircle size={11} color={colors.muted} /><Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted }}>{d.replies} replies</Text></View><View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Heart size={11} color={colors.muted} /><Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted }}>{d.likes}</Text></View></View>
          </Card>
        )) : null}

        {tab === "polls" ? data.polls.map((p: any) => (
          <Card key={p.id} style={{ marginTop: 9 }}>
            <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", color: colors.brand600 }}>{p.status === "active" ? "Open poll" : "Closed"} · {p.audience}</Text>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, color: colors.ink, marginTop: 5 }}>{p.question}</Text>
            {p.description ? <Text style={{ fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted, marginTop: 3 }}>{p.description}</Text> : null}
            <View style={{ gap: 6, marginTop: 10 }}>
              {p.options.map((o: any) => {
                const count = p.counts?.[o.id] ?? 0;
                const pct = p.total ? Math.round((count / p.total) * 100) : 0;
                const selected = p.myVote === o.id;
                return (
                  <Pressable accessibilityRole="button" key={o.id} onPress={() => !p.myVote && p.status === "active" && vote(p, o.id)} style={{ overflow: "hidden", borderWidth: 1, borderColor: selected ? colors.brand400 : colors.line, backgroundColor: selected ? colors.brand50 : colors.surface, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 9 }}>
                    {p.myVote ? <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: selected ? colors.brand100 : "#f4f6fb" }} /> : null}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}><View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: selected ? colors.brand600 : colors.lineStrong, backgroundColor: selected ? colors.brand600 : "#fff", alignItems: "center", justifyContent: "center" }}>{selected ? <Check size={8} color="#fff" strokeWidth={3} /> : null}</View><Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 12, color: colors.ink }}>{o.label}</Text>{p.myVote ? <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft }}>{pct}%</Text> : null}</View>
                  </Pressable>
                );
              })}
            </View>
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 7 }}>{p.total} votes{p.myVote ? " · you voted" : ""}{p.endsAt ? ` · closes ${dateLabel(p.endsAt)}` : ""}</Text>
          </Card>
        )) : null}

        {tab === "events" ? data.events.map((e: any) => {
          const going = data.myRsvps.includes(e.id);
          const count = data.rsvps.find((r: any) => r.eventId === e.id)?.c ?? 0;
          return <Card key={e.id} style={{ marginTop: 9 }}><View style={{ flexDirection: "row", gap: 10 }}><View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: colors.blush50, alignItems: "center", justifyContent: "center" }}><Text style={{ fontFamily: fonts.bold, fontSize: 12, textTransform: "uppercase", color: colors.blush500 }}>{dateLabel(e.startAt, { month: "short" })}</Text><Text style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.ink }}>{new Date(e.startAt).getDate()}</Text></View><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{e.title}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 }}>{timeLabel(e.startAt)} · {e.location}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.inkSoft, marginTop: 4 }}>{e.description}</Text><View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{count} going</Text><Button title={going ? "Going ✓" : "RSVP"} onPress={() => rsvp(e.id)} size="sm" variant={going ? "soft" : "primary"} /></View></View></View></Card>;
        }) : null}
      </ScrollView>
    </Screen>
  );
}
