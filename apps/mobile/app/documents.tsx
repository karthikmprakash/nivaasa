import { useCallback, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { ArrowDownToLine, FileText, FolderOpen } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { API_URL, api, dateLabel } from "@/lib/api";
import { colors, fonts } from "@/lib/theme";
import { BackButton, Badge, Card, Empty, Loading, Screen } from "@/components/ui";

export default function DocumentsScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<any[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try { const res = await api<any>("/api/mobile/more", { token }); setData(res.documents); } finally { setRefreshing(false); }
  }, [token]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (!data) return <Screen scroll={false}><Loading /></Screen>;
  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.brand600} />}>
        <BackButton />
        <View style={{ marginTop: 8 }}><Text style={{ fontFamily: fonts.bold, fontSize: 9.5, letterSpacing: 1.3, textTransform: "uppercase", color: colors.brand600 }}>The society archive</Text><Text style={{ fontFamily: fonts.serif, fontSize: 31, color: colors.ink, marginTop: 2 }}>Documents</Text></View>
        {data.map((d) => <Pressable key={d.id} onPress={() => Linking.openURL(`${API_URL}${d.fileUrl}`)}><Card style={{ marginTop: 8 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.brand50, alignItems: "center", justifyContent: "center" }}><FileText size={16} color={colors.brand600} /></View><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 11.5, color: colors.ink }}>{d.title}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 9, color: colors.muted }}>{d.category} · {dateLabel(d.createdAt)}</Text></View><ArrowDownToLine size={15} color={colors.muted} /></View></Card></Pressable>)}
        {!data.length ? <Empty title="No documents yet" /> : null}
      </ScrollView>
    </Screen>
  );
}
