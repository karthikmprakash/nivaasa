import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Bell, CheckCheck } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, timeAgo } from "@/lib/api";
import { colors, fonts } from "@/lib/theme";
import { BackButton, Button, Card, Empty, Loading, Screen } from "@/components/ui";

export default function NotificationsScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<any[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try { const res = await api<any>("/api/mobile/more", { token }); setData(res.notifications); } finally { setRefreshing(false); }
  }, [token]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  async function markAll() {
    if (!token) return;
    await api("/api/notifications/read", { method: "POST", token, body: { all: true } }).catch(() => null);
    await load();
  }
  if (!data) return <Screen scroll={false}><Loading /></Screen>;
  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.brand600} />}>
        <BackButton />
        <View style={{ marginTop: 8, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}><View><Text style={{ fontFamily: fonts.bold, fontSize: 9.5, letterSpacing: 1.3, textTransform: "uppercase", color: colors.brand600 }}>Your updates</Text><Text style={{ fontFamily: fonts.serif, fontSize: 31, color: colors.ink, marginTop: 2 }}>Notifications</Text></View>{data.some((n) => !n.readAt) ? <Button title="Mark read" onPress={markAll} size="sm" variant="outline" /> : null}</View>
        {data.map((n) => <Card key={n.id} style={{ marginTop: 8, backgroundColor: n.readAt ? colors.surface : colors.brand50, borderColor: n.readAt ? colors.line : colors.brand100 }}><View style={{ flexDirection: "row", alignItems: "flex-start", gap: 9 }}><View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}><Bell size={14} color={colors.brand600} /></View><View style={{ flex: 1 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 10.5, color: colors.ink }}>{n.title}</Text>{!n.readAt ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.brand500 }} /> : null}</View><Text style={{ fontFamily: fonts.regular, fontSize: 9.5, lineHeight: 14, color: colors.inkSoft, marginTop: 2 }}>{n.body}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 8, color: colors.muted, marginTop: 4 }}>{timeAgo(n.createdAt)}</Text></View></View></Card>)}
        {!data.length ? <Empty title="All caught up" /> : null}
      </ScrollView>
    </Screen>
  );
}
