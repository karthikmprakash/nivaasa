import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { CalendarHeart, CheckCircle2, Clock3, MapPin, Users, X } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, dateLabel, money, todayLocal } from "@/lib/api";
import { colors, fonts, shadow } from "@/lib/theme";
import { BackButton, Badge, Button, Card, Empty, Loading, Screen } from "@/components/ui";

export default function AmenitiesScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [amenity, setAmenity] = useState<any>(null);
  const [date, setDate] = useState(todayLocal(1));
  const [slots, setSlots] = useState<any[]>([]);
  const [slot, setSlot] = useState<any>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [busy, setBusy] = useState(false);
  const [booked, setBooked] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try { setData(await api("/api/mobile/more", { token })); } catch (e) { Alert.alert("Could not load", e instanceof Error ? e.message : "Try again"); }
    finally { setRefreshing(false); }
  }, [token]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function openAmenity(a: any) {
    setAmenity(a); setDate(todayLocal(1)); setSlot(null); setBooked(false);
    await fetchSlots(a.id, todayLocal(1));
  }
  async function fetchSlots(id: string, d: string) {
    if (!token) return;
    setLoadingSlots(true); setSlots([]); setSlot(null);
    try { const res = await api<any>(`/api/amenities/${id}/availability?date=${d}`, { token }); setSlots(res.slots ?? []); }
    catch (e) { Alert.alert("Could not load slots", e instanceof Error ? e.message : "Try again"); }
    finally { setLoadingSlots(false); }
  }
  async function book() {
    if (!amenity || !slot || !token) return;
    setBusy(true);
    try {
      await api("/api/amenities/book", { method: "POST", token, body: { amenityId: amenity.id, date, startTime: slot.start, guests: 2, notes: "" } });
      setBooked(true); await load();
    } catch (e) { Alert.alert("Could not book", e instanceof Error ? e.message : "Try again"); }
    finally { setBusy(false); }
  }

  if (!data) return <Screen scroll={false}><Loading /></Screen>;
  return (
    <Screen scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.brand600} />}>
        <BackButton />
        <View style={{ marginTop: 8 }}><Text style={{ fontFamily: fonts.bold, fontSize: 9.5, letterSpacing: 1.3, textTransform: "uppercase", color: colors.brand600 }}>Your community club</Text><Text style={{ fontFamily: fonts.serif, fontSize: 31, color: colors.ink, marginTop: 2 }}>Amenities</Text><Text style={{ fontFamily: fonts.regular, fontSize: 10.5, color: colors.inkSoft, marginTop: 3 }}>Live availability, clear rules, a little time for yourself.</Text></View>

        {data.bookings.filter((b: any) => b.booking.status === "confirmed").slice(0, 2).map((b: any) => <View key={b.booking.id} style={{ backgroundColor: colors.brand600, borderRadius: 16, padding: 13, marginTop: 12 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 9, color: "rgba(255,255,255,0.5)" }}>NEXT BOOKING</Text><Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: "#fff", marginTop: 3 }}>{b.amenity}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 9, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{dateLabel(b.booking.date)} · {b.booking.startTime}–{b.booking.endTime}</Text></View>)}

        {data.amenities.map((a: any) => <Card key={a.id} style={{ marginTop: 9 }}><View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}><View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: colors.brand50, alignItems: "center", justifyContent: "center" }}><CalendarHeart size={18} color={colors.brand600} /></View><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 12, color: colors.ink }}>{a.name}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 9, color: colors.muted, marginTop: 2 }}>{a.description}</Text><View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><Users size={9} color={colors.muted} /><Text style={{ fontFamily: fonts.medium, fontSize: 8, color: colors.muted }}>{a.capacity}</Text></View><View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}><MapPin size={9} color={colors.muted} /><Text style={{ fontFamily: fonts.medium, fontSize: 8, color: colors.muted }}>{a.location}</Text></View><Badge label={a.price ? money(a.price) : "Free"} tone={a.price ? "pink" : "green"} /></View></View><Button title="Book" onPress={() => openAmenity(a)} size="sm" variant="outline" /></View></Card>)}
        {!data.amenities.length ? <Empty title="No amenities yet" /> : null}
      </ScrollView>

      <Modal visible={!!amenity} transparent animationType="slide" onRequestClose={() => setAmenity(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,28,51,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, paddingBottom: 32, maxHeight: "90%" }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 18, color: colors.ink }}>{booked ? "You're booked" : `Book ${amenity?.name ?? ""}`}</Text><Pressable onPress={() => setAmenity(null)} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center" }}><X size={15} color={colors.muted} /></Pressable></View>
            {booked ? <View style={{ alignItems: "center", paddingVertical: 14 }}><View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.mint50, alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={28} color={colors.mint600} /></View><Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, marginTop: 12 }}>See you there</Text><Text style={{ fontFamily: fonts.regular, fontSize: 10, color: colors.muted, marginTop: 3 }}>{dateLabel(date)} · {slot?.label}</Text><Button title="Done" onPress={() => setAmenity(null)} full style={{ marginTop: 16 }} /></View> : (
              <ScrollView>
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>{[{ l: "Today", d: todayLocal() }, { l: "Tomorrow", d: todayLocal(1) }, { l: "Day after", d: todayLocal(2) }].map((d) => <Pressable key={d.l} onPress={() => { setDate(d.d); if (amenity) fetchSlots(amenity.id, d.d); }} style={{ flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: date === d.d ? colors.brand600 : colors.line, backgroundColor: date === d.d ? colors.brand50 : colors.surface }}><Text style={{ fontFamily: fonts.semibold, fontSize: 9, color: date === d.d ? colors.brand700 : colors.inkSoft }}>{d.l}</Text></Pressable>)}</View>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 10.5, color: colors.inkSoft, marginBottom: 6 }}>Available slots</Text>
                {loadingSlots ? <Text style={{ fontFamily: fonts.regular, fontSize: 10, color: colors.muted }}>Loading…</Text> : <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{slots.map((s: any) => <Pressable key={s.start} disabled={!s.available} onPress={() => setSlot(s)} style={{ width: "31%", alignItems: "center", paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: slot?.start === s.start ? colors.brand600 : colors.line, backgroundColor: slot?.start === s.start ? colors.brand600 : s.available ? colors.surface : colors.canvas, opacity: s.available ? 1 : 0.5 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 9, color: slot?.start === s.start ? "#fff" : colors.inkSoft }}>{s.label}</Text></Pressable>)}</View>}
                {amenity?.rules ? <View style={{ backgroundColor: colors.canvas, borderRadius: 10, padding: 9, marginTop: 10 }}><Text style={{ fontFamily: fonts.regular, fontSize: 8.5, lineHeight: 13, color: colors.muted }}>{amenity.rules}</Text></View> : null}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }}>{amenity?.price ? money(amenity.price) : "Free"}</Text><Button title={busy ? "Booking…" : slot ? `Confirm · ${slot.label}` : "Choose a slot"} onPress={book} disabled={!slot} loading={busy} /></View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
