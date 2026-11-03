import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { CheckCircle2, CreditCard, IndianRupee, Receipt, ShieldCheck, Smartphone, X } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, dateLabel, money } from "@/lib/api";
import { colors, fonts, shadow } from "@/lib/theme";
import { Badge, Button, Card, Empty, HeroCard, Loading, Screen, Segmented } from "@/components/ui";

const methods = [{ id: "upi", label: "UPI", hint: "GPay, PhonePe", icon: Smartphone }, { id: "card", label: "Card", hint: "Credit / debit", icon: CreditCard }, { id: "netbanking", label: "Net banking", hint: "All banks", icon: IndianRupee }];

export default function PayScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState("invoices");
  const [refreshing, setRefreshing] = useState(false);
  const [invoice, setInvoice] = useState<any>(null);
  const [method, setMethod] = useState("upi");
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try { setData(await api("/api/mobile/payments", { token })); } catch (e) { Alert.alert("Could not load", e instanceof Error ? e.message : "Try again"); }
    finally { setRefreshing(false); }
  }, [token]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function pay() {
    if (!invoice || !token) return;
    setBusy(true);
    try {
      const res = await api<any>("/api/payments", { method: "POST", token, body: { invoiceId: invoice.id, method } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
      setReceipt(res.receiptNo);
      await load();
    } catch (e) { Alert.alert("Payment failed", e instanceof Error ? e.message : "Try again"); }
    finally { setBusy(false); }
  }

  if (!data) return <Screen scroll={false} padded={false}><Loading label="Loading payments…" /></Screen>;
  const open = data.invoices.filter((i: any) => ["due", "overdue", "partially_paid"].includes(i.status));
  const paid = data.invoices.filter((i: any) => i.status === "paid");

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 30 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor={colors.brand600} />}>
        <View style={{ marginTop: 8 }}>
          <Text style={{ fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1.3, textTransform: "uppercase", color: colors.brand600 }}>Money, clearly</Text>
          <Text accessibilityRole="header" style={{ fontFamily: fonts.semibold, fontSize: 28, color: colors.ink, marginTop: 2 }}>Payments</Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.inkSoft, marginTop: 3 }}>Pay maintenance, see receipts and keep your account clear.</Text>
        </View>

        <HeroCard style={{ marginTop: 14 }}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>Total outstanding</Text>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 32, letterSpacing: -1.2, color: "#fff", marginTop: 3 }}>{money(data.dues)}</Text>
          <View style={{ flexDirection: "row", gap: 18, marginTop: 9 }}><View><Text style={{ fontFamily: fonts.medium, fontSize: 12, textTransform: "uppercase", color: "rgba(255,255,255,0.8)" }}>Open invoices</Text><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: "#fff" }}>{open.length}</Text></View><View><Text style={{ fontFamily: fonts.medium, fontSize: 12, textTransform: "uppercase", color: "rgba(255,255,255,0.8)" }}>Advance</Text><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: "#fff" }}>{money(data.advance)}</Text></View></View>
        </HeroCard>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: colors.mint50, borderRadius: 12, padding: 10, marginTop: 10 }}>
          <ShieldCheck size={14} color={colors.mint600} /><Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.mint600 }}>Demo gateway · no money moves. Connect Razorpay or Stripe for production.</Text>
        </View>

        <View style={{ marginTop: 14 }}><Segmented value={tab} onChange={setTab} options={[{ value: "invoices", label: "Invoices", count: open.length }, { value: "history", label: "History", count: data.payments.length }]} /></View>

        {tab === "invoices" ? open.map((inv: any) => (
          <Card key={inv.id} style={{ marginTop: 9 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 9 }}>
              <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: inv.status === "overdue" ? colors.dangerSoft : colors.brand50, alignItems: "center", justifyContent: "center" }}><Receipt size={15} color={inv.status === "overdue" ? colors.danger : colors.brand600} /></View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{inv.title}</Text><Badge label={inv.status} tone={inv.status === "overdue" ? "danger" : inv.status === "partially_paid" ? "amber" : "blue"} /></View>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 2 }}>{inv.number} · due {dateLabel(inv.dueDate)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: colors.line, marginTop: 9, paddingTop: 9 }}>
              <View><Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }}>{money(inv.total)}</Text>{inv.amountPaid > 0 ? <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{money(inv.amountPaid)} paid</Text> : null}</View>
              <Button title="Pay now" onPress={() => { setInvoice(inv); setReceipt(null); setMethod("upi"); }} size="sm" />
            </View>
          </Card>
        )) : null}
        {tab === "invoices" && !open.length ? <Empty title="You're all paid up" body="No outstanding invoices. Lovely." /> : null}

        {tab === "history" ? data.payments.map((p: any) => (
          <Card key={p.id} style={{ marginTop: 7 }}><View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}><View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: p.status === "success" ? colors.mint50 : colors.dangerSoft, alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={14} color={p.status === "success" ? colors.mint600 : colors.danger} /></View><View style={{ flex: 1 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{p.receiptNo} · {p.method.toUpperCase()}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{dateLabel(p.paidAt)} · {p.kind}</Text></View><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{money(p.amount)}</Text></View></Card>
        )) : null}
        {tab === "history" && !data.payments.length ? <Empty title="No payments yet" /> : null}
      </ScrollView>

      <Modal visible={!!invoice} transparent animationType="slide" onRequestClose={() => { setInvoice(null); setReceipt(null); }}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,28,51,0.5)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 32, maxHeight: "88%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}><Text style={{ fontFamily: fonts.semibold, fontSize: 18, color: colors.ink }}>{receipt ? "Payment successful" : "Pay invoice"}</Text><Pressable accessibilityRole="button" onPress={() => { setInvoice(null); setReceipt(null); }} style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.canvas, alignItems: "center", justifyContent: "center" }}><X size={15} color={colors.muted} /></Pressable></View>
            {receipt ? (
              <View style={{ alignItems: "center", paddingVertical: 10 }}>
                <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: colors.mint50, alignItems: "center", justifyContent: "center" }}><CheckCircle2 size={28} color={colors.mint600} /></View>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.ink, marginTop: 12 }}>{invoice ? money(invoice.total - invoice.amountPaid) : ""} paid</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted, marginTop: 3 }}>Receipt {receipt}</Text>
                <Button title="Done" onPress={() => { setInvoice(null); setReceipt(null); }} full style={{ marginTop: 18 }} />
              </View>
            ) : (
              <>
                <View style={{ backgroundColor: colors.brand600, borderRadius: 16, padding: 14 }}>
                  <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: "rgba(255,255,255,0.8)" }}>Amount to pay</Text>
                  <Text style={{ fontFamily: fonts.semibold, fontSize: 27, letterSpacing: -1, color: "#fff", marginTop: 2 }}>{invoice ? money(invoice.total - invoice.amountPaid) : ""}</Text>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>{invoice?.title} · {invoice?.number}</Text>
                </View>
                <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.inkSoft, marginTop: 14, marginBottom: 6 }}>Payment method</Text>
                <View style={{ flexDirection: "row", gap: 7 }}>{methods.map((m) => <Pressable accessibilityRole="button" key={m.id} onPress={() => setMethod(m.id)} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: method === m.id ? colors.brand600 : colors.line, backgroundColor: method === m.id ? colors.brand50 : colors.surface, padding: 10 }}><m.icon size={15} color={method === m.id ? colors.brand600 : colors.muted} /><Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, marginTop: 5 }}>{m.label}</Text><Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.muted }}>{m.hint}</Text></Pressable>)}</View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.mint50, borderRadius: 10, padding: 9, marginTop: 12 }}><ShieldCheck size={12} color={colors.mint600} /><Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 12, color: colors.mint600 }}>Simulated payment. No money will be charged.</Text></View>
                <Button title={busy ? "Processing…" : `Pay ${invoice ? money(invoice.total - invoice.amountPaid) : ""}`} onPress={pay} loading={busy} size="lg" full style={{ marginTop: 14 }} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
