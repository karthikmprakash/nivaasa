import { useCallback, useState } from "react";
import { Linking, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { Phone, Search, ShieldCheck, Users } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { colors, fonts } from "@/lib/theme";
import { BackButton, Avatar, Badge, Card, Empty, Loading, Screen } from "@/components/ui";

export default function DirectoryScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<any[] | null>(null);
  const [q, setQ] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try { const res = await api<any>("/api/mobile/more", { token }); setData(res.directory); } finally { setRefreshing(false); }
  }, [token]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (!data) return <Screen scroll={false}><Loading /></Screen>;
  const filtered = data.filter((r) => !q || r.name.toLowerCase().includes(q.toLowerCase()) || (r.unit ?? "").toLowerCase().includes(q.toLowerCase()));
  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.brand600} />}>
        <BackButton />
        <View style={{ marginTop: 8 }}><Text style={{ fontFamily: fonts.bold, fontSize: 9.5, letterSpacing: 1.3, textTransform: "uppercase", color: colors.brand600 }}>Your neighbours</Text><Text style={{ fontFamily: fonts.serif, fontSize: 31, color: colors.ink, marginTop: 2 }}>Directory</Text><Text style={{ fontFamily: fonts.regular, fontSize: 10.5, color: colors.inkSoft, marginTop: 3 }}>Contact numbers are masked for privacy.</Text></View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, height: 42, marginTop: 12 }}><Search size={15} color={colors.muted} /><TextInput value={q} onChangeText={setQ} placeholder="Search name or home…" placeholderTextColor="#a1a9ba" style={{ flex: 1, fontFamily: fonts.regular, fontSize: 11.5, color: colors.ink }} /></View>
        {filtered.map((r) => <Card key={`${r.name}-${r.unit}`} style={{ marginTop: 8 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Avatar name={r.name} color={r.color} size={38} /><View style={{ flex: 1 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 11.5, color: colors.ink }}>{r.name}</Text>{r.role === "committee" ? <Badge label="Committee" tone="pink" /> : null}</View><Text style={{ fontFamily: fonts.regular, fontSize: 9, color: colors.muted }}>Home {r.unit} · {r.role} · {r.phone}</Text></View><Phone size={14} color={colors.brand600} /></View></Card>)}
        {!filtered.length ? <Empty title="No residents found" /> : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 }}><ShieldCheck size={12} color={colors.mint600} /><Text style={{ fontFamily: fonts.regular, fontSize: 8.5, color: colors.muted }}>Only residents can see this directory.</Text></View>
      </ScrollView>
    </Screen>
  );
}
