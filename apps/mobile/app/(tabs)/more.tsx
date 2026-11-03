import { useCallback, useState } from "react";
import { Alert, Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Bell, BookUser, CalendarHeart, ChevronRight, FileText, LogOut, Settings, ShieldCheck, Wrench } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { API_URL, api, dateLabel } from "@/lib/api";
import { colors, fonts, shadow } from "@/lib/theme";
import { Avatar, Badge, Button, Card, InfoRow, Loading, Screen } from "@/components/ui";

export default function MoreScreen() {
  const { token, session, signOut } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try { setData(await api("/api/mobile/more", { token })); } catch (e) { Alert.alert("Could not load", e instanceof Error ? e.message : "Try again"); }
    finally { setRefreshing(false); }
  }, [token]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!data) return <Screen scroll={false} padded={false}><Loading /></Screen>;
  const role = session?.membership?.role;
  const isManager = session?.user.globalRole === "super_admin" || ["admin", "manager", "committee", "accountant", "helpdesk_manager", "security_manager", "auditor"].includes(role ?? "");
  const menu = [
    { label: "Helpdesk", hint: `${data.tickets.filter((t: any) => !["resolved", "closed"].includes(t.status)).length} open requests`, icon: Wrench, href: "/helpdesk", tone: colors.brand50, fg: colors.brand600 },
    { label: "Amenities", hint: "Book a facility", icon: CalendarHeart, href: "/amenities", tone: "#f2effc", fg: "#6a54c8" },
    { label: "Directory", hint: "Neighbours & trusted help", icon: BookUser, href: "/directory", tone: colors.mint50, fg: colors.mint600 },
    { label: "Documents", hint: "Bye-laws, minutes & forms", icon: FileText, href: "/documents", tone: colors.blush50, fg: colors.blush500 },
    { label: "Notifications", hint: `${data.notifications.filter((n: any) => !n.readAt).length} unread`, icon: Bell, href: "/notifications", tone: colors.amberSoft, fg: colors.amberInk },
  ];
  return (
    <Screen scroll={false} padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.brand600} />}>
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.3, textTransform: "uppercase", color: colors.brand600 }}>Your account</Text>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontSize: 28, color: colors.ink, marginTop: 2 }}>More</Text>
        </View>

        <Card style={{ marginTop: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
            <Avatar name={session?.user.name ?? ""} color={session?.user.avatarColor} size={50} />
            <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{session?.user.name}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{session?.user.email}</Text><View style={{ flexDirection: "row", gap: 5, marginTop: 4 }}><Badge label={role === "committee" ? "Committee" : role ?? "Resident"} tone="blue" /><Badge label={`Home ${session?.unit?.number ?? "—"}`} tone="neutral" /></View></View>
          </View>
          <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 4 }}>
            <InfoRow label="Society" value={data.society.name} />
            <InfoRow label="Member since" value={dateLabel(data.profile.joinedAt, { month: "short", year: "numeric" })} />
            <InfoRow label="Directory" value="Visible" />
          </View>
        </Card>

        <View style={{ marginTop: 16, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, overflow: "hidden" }}>
          {menu.map((m, i) => (
            <Pressable accessibilityRole="button" key={m.label} onPress={() => router.push(m.href as any)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, padding: 13, borderBottomWidth: i === menu.length - 1 ? 0 : 1, borderBottomColor: colors.line, backgroundColor: pressed ? colors.canvas : colors.surface })}>
              <View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: m.tone, alignItems: "center", justifyContent: "center" }}><m.icon size={15} color={m.fg} /></View>
              <View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{m.label}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{m.hint}</Text></View>
              <ChevronRight size={15} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        {isManager ? <Pressable accessibilityRole="button" onPress={() => router.push("/manage")} style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.brand50, borderRadius: 16, padding: 13, marginTop: 12 }}><ShieldCheck size={16} color={colors.brand600} /><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>Open admin console</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft }}>Manage your community</Text></View><ChevronRight size={14} color={colors.brand600} /></Pressable> : null}

        <View style={{ marginTop: 20 }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.muted, textAlign: "center" }}>Nivaasa · open source community operating system</Text>
          <Button title="Sign out" onPress={() => Alert.alert("Sign out?", "You can sign back in anytime.", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: async () => { await signOut(); router.replace("/login"); } }])} variant="outline" full style={{ marginTop: 10 }} icon={<LogOut size={14} color={colors.danger} />} />
        </View>
      </ScrollView>
    </Screen>
  );
}
