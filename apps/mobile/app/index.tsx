import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function Index() {
  const { session, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.canvas }}><ActivityIndicator color={colors.brand600} /></View>;
  if (!session) return <Redirect href="/login" />;
  const role = session.membership?.role;
  if (role === "guard") return <Redirect href="/gate" />;
  if (!session.unit && (session.user.globalRole === "super_admin" || ["admin", "manager", "accountant", "helpdesk_manager", "security_manager", "auditor"].includes(role ?? ""))) return <Redirect href="/manage" />;
  return <Redirect href="/(tabs)" />;
}
