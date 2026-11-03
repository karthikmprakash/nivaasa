import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Redirect, Tabs } from "expo-router";
import { Home, Menu, Newspaper, UserRoundCheck, Wallet } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { colors, fonts } from "@/lib/theme";

export default function TabsLayout() {
  const { session, loading } = useAuth();
  const insets = useSafeAreaInsets();
  if (loading) return null;
  if (!session) return <Redirect href="/login" />;
  const role = session.membership?.role;
  if (role === "guard") return <Redirect href="/gate" />;
  if (!session.unit && (session.user.globalRole === "super_admin" || ["admin", "manager", "accountant", "helpdesk_manager", "security_manager", "auditor"].includes(role ?? ""))) return <Redirect href="/manage" />;
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.brand600, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, height: 64 + insets.bottom, paddingTop: 6, paddingBottom: Math.max(8, insets.bottom) }, tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 12 } }}>
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, focused }) => <Home size={20} color={color} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="community" options={{ title: "Community", tabBarIcon: ({ color, focused }) => <Newspaper size={20} color={color} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="visitors" options={{ title: "Visitors", tabBarIcon: ({ color, focused }) => <UserRoundCheck size={20} color={color} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="pay" options={{ title: "Pay", tabBarIcon: ({ color, focused }) => <Wallet size={20} color={color} strokeWidth={focused ? 2.4 : 1.8} /> }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: ({ color, focused }) => <Menu size={20} color={color} strokeWidth={focused ? 2.4 : 1.8} /> }} />
    </Tabs>
  );
}
