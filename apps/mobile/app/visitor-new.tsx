import { useState } from "react";
import { Alert, Linking, Pressable, Share, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { CheckCircle2, KeyRound } from "lucide-react-native";
import { useAuth } from "@/lib/auth";
import { api, API_URL, dateLabel } from "@/lib/api";
import { colors, fonts, shadow } from "@/lib/theme";
import { BackButton, Button, Input, Screen } from "@/components/ui";

const types = [
  { value: "guest", label: "Guest" },
  { value: "delivery", label: "Delivery" },
  { value: "cab", label: "Cab" },
  { value: "vendor", label: "Vendor" },
  { value: "daily_help", label: "Daily help" },
] as const;

function communityDate(offset = 0) {
  return new Date(Date.now() + 330 * 60_000 + offset * 86_400_000).toISOString().slice(0, 10);
}

const heading = { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, marginBottom: 8 } as const;
const body = { fontFamily: fonts.regular, fontSize: 14, lineHeight: 21, color: colors.inkSoft } as const;

export default function VisitorNewScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [type, setType] = useState<(typeof types)[number]["value"]>("guest");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [validFrom, setValidFrom] = useState(communityDate);
  const [validTo, setValidTo] = useState(communityDate);
  const [recurringCab, setRecurringCab] = useState(false);
  const [preset, setPreset] = useState("Today");
  const [notes, setNotes] = useState("");
  const [leaveAtGate, setLeaveAtGate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  const range = type === "guest" || (type === "cab" && recurringCab);

  function dates(label: string, start: number, length: number) {
    setPreset(label);
    setValidFrom(communityDate(start));
    setValidTo(communityDate(start + length - 1));
  }

  function option(label: string, selected: boolean, onPress: () => void) {
    return <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
      style={{ justifyContent: "center", minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: selected ? colors.brand600 : colors.line, backgroundColor: selected ? colors.brand50 : colors.surface }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: selected ? colors.brand700 : colors.inkSoft }}>{label}</Text>
    </Pressable>;
  }

  async function submit() {
    if (!token || busy) return;
    if (type === "guest" && !name.trim()) return Alert.alert("Guest name required", "Add the guest you are expecting.");
    setBusy(true);
    try {
      const result = await api<{ code: string }>("/api/mobile/preapprove", { method: "POST", token, body: { name, phone, type, company, validFrom, validTo: range ? validTo : undefined, recurringCab, notes, leaveAtGate } });
      setCode(result.code);
    } catch (e) {
      Alert.alert("Could not create pass", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (code) return (
    <Screen>
      <View style={{ alignItems: "center", backgroundColor: colors.surface, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 22, marginTop: 36, ...shadow }}>
        <CheckCircle2 size={32} color={colors.mint600} />
        <Text style={{ fontFamily: fonts.semibold, fontSize: 26, color: colors.ink, marginTop: 12 }}>Pass ready</Text>
        <Text style={{ ...body, textAlign: "center", marginTop: 4 }}>{recurringCab ? "Valid for one pickup each day." : "Valid for one entry."} {dateLabel(validFrom)}{range && validTo !== validFrom ? ` – ${dateLabel(validTo)}` : ""}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.brand50, borderRadius: 14, padding: 14, marginTop: 16 }}><KeyRound size={18} color={colors.brand600} /><Text selectable style={{ fontFamily: fonts.bold, fontSize: 26, letterSpacing: 6, color: colors.brand700 }}>{code}</Text></View>
        <Button title="Share gate code" onPress={() => { void Share.share({ message: `Your Nivaasa gate pass code is ${code}. Valid ${dateLabel(validFrom)}${range && validTo !== validFrom ? ` through ${dateLabel(validTo)}` : ""}.` }).catch(() => Alert.alert("Could not share", "You can select and copy the code.")); }} full style={{ marginTop: 18 }} />
        <Button title="Done" variant="outline" onPress={() => router.back()} full style={{ marginTop: 8 }} />
      </View>
    </Screen>
  );

  const presets = recurringCab ? [["7 days", 0, 7], ["14 days", 0, 14], ["30 days", 0, 30]] as const
    : range ? [["Today", 0, 1], ["Tomorrow", 1, 1], ["Next 7 days", 0, 7]] as const
    : [["Today", 0, 1], ["Tomorrow", 1, 1]] as const;

  return (
    <Screen>
      <BackButton />
      <Text accessibilityRole="header" style={{ ...heading, fontSize: 28, marginTop: 10 }}>Pre-approve a visitor</Text>
      <Text style={body}>Choose a visitor type to create a gate pass.</Text>
      <View style={{ marginVertical: 18 }}>
        <Text style={heading}>Who are you expecting?</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {types.map(({ value, label }) => option(label, type === value, () => {
            setType(value); setRecurringCab(false); setCompany(""); setNotes(""); setLeaveAtGate(false); dates("Today", 0, 1);
          }))}
        </View>
      </View>
      {type === "daily_help" ? (
        <View>
          <Text style={heading}>Register daily help</Text>
          <Text style={body}>Open My home on the web to register daily help, view verified profiles and attendance, or leave a private review.</Text>
          <Button title="Open My home" onPress={() => { void Linking.openURL(`${API_URL}/app/my-home#help`).catch(() => Alert.alert("Could not open My home", "Use the Nivaasa web app.")); }} full style={{ marginTop: 16 }} />
        </View>
      ) : (
        <View>
          {type === "guest" ? (
            <>
              <Input label="Guest name" value={name} onChangeText={setName} maxLength={80} placeholder="e.g. Rohit Sharma" />
              <Input label="Phone number (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={30} placeholder="+91…" />
            </>
          ) : (
            <>
              <Text style={{ ...body, marginBottom: 10 }}>Security will record the visitor’s name and phone number{type === "cab" ? ", plus the cab registration," : ""} at the gate.</Text>
              <Input label={type === "delivery" ? "Delivery platform (optional)" : type === "cab" ? "Cab service (optional)" : "Company (optional)"} value={company} onChangeText={setCompany} maxLength={100} />
            </>
          )}
          {type === "cab" ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={heading}>Pickup frequency</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {option("One visit", !recurringCab, () => { setRecurringCab(false); dates("Today", 0, 1); })}
                {option("Daily pickup", recurringCab, () => { setRecurringCab(true); dates("7 days", 0, 7); })}
              </View>
            </View>
          ) : null}
          <Text style={heading}>{range ? "Pass validity" : "Visit date"}</Text>
          <Text style={{ ...body, marginBottom: 8 }}>{recurringCab ? "One pickup each day with the same code." : range ? "One entry within the date range." : "One visit on the selected date."}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {presets.map(([label, start, length]) => option(label, label === preset, () => dates(label, start, length)))}
          </View>
          <Input label={range ? "Valid from" : "Date"} value={validFrom} onChangeText={(date) => { setValidFrom(date); setPreset(""); }} placeholder="YYYY-MM-DD" maxLength={10} />
          {range ? <Input label="Valid to" value={validTo} onChangeText={(date) => { setValidTo(date); setPreset(""); }} placeholder="YYYY-MM-DD" maxLength={10} /> : null}
          <Input label="Notes for security (optional)" value={notes} onChangeText={setNotes} maxLength={300} multiline />
          {type === "delivery" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Text style={{ ...body, flex: 1 }}>Leave the parcel at the gate</Text>
              <Switch accessibilityLabel="Leave the parcel at the gate" value={leaveAtGate} onValueChange={setLeaveAtGate} trackColor={{ true: colors.brand500 }} />
            </View>
          ) : null}
          <Button title={busy ? "Creating pass…" : recurringCab ? "Create daily pickup pass" : "Create gate pass"} onPress={submit} loading={busy} size="lg" full style={{ marginTop: 8 }} />
        </View>
      )}
    </Screen>
  );
}
