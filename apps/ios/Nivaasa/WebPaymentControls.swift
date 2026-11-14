import SwiftUI

struct PaymentSelection: Identifiable {
    let invoice: [String: Any]
    var offline = false
    var id: String { string(invoice, "id") + (offline ? "offline" : "online") }
}

struct WebPaymentOverview: View {
    @Environment(\.nivaasaNavigate) private var navigate
    let data: [String: Any]
    let unit: String
    let pay: ([String: Any]) -> Void
    var addAdvance: () -> Void = {}
    private var openInvoices: [[String: Any]] { rows(data["invoices"]).filter { ["due", "overdue", "partially_paid"].contains(string($0, "status")) } }
    private var next: [String: Any]? {
        let pending = Set(rows(data["payments"]).filter { string($0, "status") == "pending" }.map { string($0, "invoiceId") })
        return openInvoices.last { !pending.contains(string($0, "id")) }
    }
    private var fiscalYear: Int {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "Asia/Kolkata")!
        return calendar.component(.year, from: Date()) - (calendar.component(.month, from: Date()) < 4 ? 1 : 0)
    }
    private var paidThisYear: Double {
        let start = nivaasaDate("\(fiscalYear)-04-01") ?? .distantPast
        return rows(data["payments"]).filter { string($0, "status") == "success" && (nivaasaDate($0["paidAt"] as? String) ?? .distantPast) >= start }.reduce(0) { $0 + number($1, "amount") }
    }

    var body: some View {
        VStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    NivaasaBadge(text: "FY \(fiscalYear)–\(String(fiscalYear + 1).suffix(2))")
                    let overdue = openInvoices.filter { string($0, "status") == "overdue" }.count
                    if overdue > 0 { NivaasaBadge(text: "\(overdue) overdue", tone: .amber) }
                }
                Text("Total outstanding").font(.nivaasaBodyMedium).foregroundStyle(NK.inkSoft)
                Text(money(number(data, "dues"))).font(.jakarta(28, .semibold)).tracking(-1.1).foregroundStyle(NK.ink).monospacedDigit()
                Text("\(openInvoices.count) open invoices · \(unit)").font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                HStack(spacing: 16) {
                    metric("Advance", money(number(data, "advance")))
                        .frame(maxWidth: .infinity, alignment: .leading)
                    metric("Paid this year", money(paidThisYear))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                if number(data, "advance") == 0 { NivaasaTextButton(title: "Add advance", icon: "plus", action: addAdvance) }
                if let next { OutlineButton(title: openInvoices.contains { string($0, "status") == "overdue" } ? "Pay overdue" : "Pay now", icon: "arrow.right") { pay(next) } }
            }
            .frame(maxWidth: .infinity, alignment: .leading).padding(16)
            .background(NK.brand50.opacity(0.7), in: RoundedRectangle(cornerRadius: 16))
            .overlay { RoundedRectangle(cornerRadius: 16).strokeBorder(NK.brand200) }
            HStack(alignment: .top, spacing: 10) {
                detail("Next due date", next.map { shortDate($0["dueDate"] as? String) } ?? "All clear", next == nil ? "No invoices outstanding" : "Oldest unpaid invoice", "creditcard", NK.brand600)
                detail("Receipts", "Instant", "Every successful payment", "checkmark.shield", NK.mint600)
            }
            NivaasaCard(padding: 16) {
                HStack(alignment: .top) {
                    Text("Need help with a payment?").font(.nivaasaCaptionMedium).foregroundStyle(NK.ink)
                    Spacer(minLength: 8)
                    NivaasaTextButton(title: "Contact accounts →") { navigate(.helpdesk) }
                }
                Text("Raise a request with your transaction reference and we'll trace it.").font(.nivaasaCaption).foregroundStyle(NK.muted)
            }
        }
    }

    private func detail(_ label: String, _ value: String, _ hint: String, _ icon: String, _ color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            NivaasaIcon(name: icon).foregroundStyle(color).padding(.bottom, 8)
            Text(label.uppercased()).font(.nivaasaCaptionMedium).tracking(0.5).foregroundStyle(NK.muted)
            Text(value).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
            Text(hint).font(.nivaasaCaption).foregroundStyle(NK.muted)
        }
        .frame(maxWidth: .infinity, minHeight: 128, alignment: .leading).padding(16)
        .background(NK.surface, in: RoundedRectangle(cornerRadius: 18))
        .overlay { RoundedRectangle(cornerRadius: 18).strokeBorder(NK.line) }
    }

    private func metric(_ name: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(name.uppercased()).font(.nivaasaCaptionMedium).foregroundStyle(NK.muted)
            Text(value).font(.nivaasaSection).foregroundStyle(NK.ink).monospacedDigit()
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct AdvancePaymentForm: View {
    let token: String
    let balance: Double
    @Environment(\.dismiss) private var dismiss
    @State private var amount = ""
    @State private var method = "upi"
    @State private var busy = false
    @State private var receipt: String?
    @State private var failure: String?

    private var paise: Int? {
        guard let value = Decimal(string: amount, locale: Locale(identifier: "en_US_POSIX")), value >= 1, value <= 5_000_000 else { return nil }
        return NSDecimalNumber(decimal: value * 100).intValue
    }

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(title: receipt == nil ? "Add to your advance" : "Advance added", close: { if !busy { dismiss() } })
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let receipt {
                        NivaasaFeedback(text: "Advance is ready to use. Receipt \(receipt).")
                        PrimaryButton(title: "Done") { dismiss() }
                    } else {
                        Text("Current advance balance: " + money(balance)).font(.nivaasaBody).foregroundStyle(NK.muted)
                        NivaasaInput(label: "Amount (₹)", text: $amount, placeholder: "5000", keyboard: .decimalPad)
                        NivaasaChips(label: "Payment method", options: ["upi", "card", "netbanking"], selection: $method)
                        Text("Your advance is held on account and adjusted by the accounts team. Demo gateway — no money moves.").font(.nivaasaCaption).foregroundStyle(NK.muted)
                        if let failure { NivaasaFeedback(text: failure, tone: .danger) }
                        PrimaryButton(title: busy ? "Processing…" : "Add advance", disabled: busy || paise == nil) { Task { await submit() } }
                    }
                }.padding(20)
            }
        }.background(AppWash()).interactiveDismissDisabled(busy)
    }

    private func submit() async {
        guard !busy, let paise else { return }
        busy = true; failure = nil
        defer { busy = false }
        do {
            let raw = try await API.request("payments", token: token, body: ["advance": true, "amount": paise, "method": method])
            let result = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            receipt = string(result, "receiptNo")
            Haptics.shared.play(.success)
        } catch {
            failure = error.localizedDescription
            Haptics.shared.play(.error)
        }
    }
}

struct PaymentForm: View {
    let token: String
    let selection: PaymentSelection
    @Environment(\.dismiss) private var dismiss
    @State private var method = "upi"
    @State private var reference = ""
    @State private var paidOn = ""
    @State private var busy = false
    @State private var result: String?
    @State private var failure: String?

    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(title: selection.offline ? "Record an offline payment" : "Pay maintenance", close: { if !busy { dismiss() } })
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let result {
                        NivaasaFeedback(text: selection.offline ? "Your payment is awaiting verification. This is not a paid receipt." : "Demo payment recorded. Receipt \(result).")
                        PrimaryButton(title: "Back to payments", icon: "arrow.right") { dismiss() }
                    } else {
                        NivaasaCard(tinted: true) {
                            Text("Amount to pay").font(.nivaasaCaption).foregroundStyle(NK.muted)
                            Text(money(number(selection.invoice, "total") - number(selection.invoice, "amountPaid"))).font(.jakarta(32, .semibold)).foregroundStyle(NK.ink)
                            Text(string(selection.invoice, "number") + " · Due " + shortDate(selection.invoice["dueDate"] as? String)).font(.nivaasaCaption).foregroundStyle(NK.inkSoft)
                        }
                        NivaasaChips(label: "Payment method", options: selection.offline ? ["neft", "cheque", "cash", "upi"] : ["upi", "card", "netbanking"], selection: $method)
                        if selection.offline {
                            NivaasaInput(label: "Paid on", text: $paidOn, placeholder: "YYYY-MM-DD", capitalization: .never)
                            NivaasaInput(label: "Reference / transaction number", text: $reference, placeholder: "UTR, cheque number or UPI reference")
                            Text("The accounts team will verify the reference before issuing a receipt.").font(.nivaasaCaption).foregroundStyle(NK.muted)
                        } else { Text("Demo gateway — this simulates a payment. No real money is collected.").font(.nivaasaCaption).foregroundStyle(NK.muted) }
                        if let failure { NivaasaFeedback(text: failure, tone: .danger) }
                        PrimaryButton(title: busy ? "Submitting…" : selection.offline ? "Submit for verification" : "Confirm demo payment", icon: "checkmark", disabled: busy) { Task { await submit() } }
                    }
                }.padding(20)
            }
        }.background(AppWash()).interactiveDismissDisabled(busy)
        .onAppear {
            method = selection.offline ? "neft" : "upi"
            let formatter = DateFormatter(); formatter.dateFormat = "yyyy-MM-dd"
            formatter.timeZone = TimeZone(identifier: "Asia/Kolkata")
            paidOn = formatter.string(from: Date())
        }
    }

    private func submit() async {
        guard !busy else { return }
        busy = true; failure = nil
        defer { busy = false }
        do {
            var body: [String: Any] = ["invoiceId": string(selection.invoice, "id"), "method": method]
            if selection.offline { body["reference"] = reference; body["paidOn"] = paidOn }
            let raw = try await API.request(selection.offline ? "payments/offline" : "payments", token: token, body: body)
            let response = try JSONSerialization.jsonObject(with: raw) as? [String: Any] ?? [:]
            result = string(response, "receiptNo", fallback: "Recorded")
            Haptics.shared.play(.success)
        } catch {
            failure = error.localizedDescription
            Haptics.shared.play(.error)
        }
    }
}

struct ReceiptPreview: View {
    let payment: [String: Any]
    @Environment(\.dismiss) private var dismiss
    private var paid: Bool { string(payment, "status") == "success" }
    var body: some View {
        VStack(spacing: 0) {
            NivaasaSheetHeader(title: paid ? "Payment receipt" : "Payment intimation", close: { dismiss() })
            ScrollView {
                NivaasaCard {
                    HStack { Image("NivaasaMark").resizable().frame(width: 42, height: 42); Text("nivaasa.").font(.jakarta(24, .bold)).foregroundStyle(NK.ink); Spacer() }
                    Divider()
                    Text(string(payment, "receiptNo")).font(.nivaasaBodySemibold).foregroundStyle(NK.ink)
                    Text(shortDate(payment["paidAt"] as? String)).font(.nivaasaCaption).foregroundStyle(NK.muted)
                    NivaasaBadge(text: paid ? "Paid" : string(payment, "status") == "pending" ? "Awaiting verification" : string(payment, "status").capitalized, tone: paid ? .mint : .amber)
                    Text(paid ? "Amount received" : "Amount recorded").font(.nivaasaCaption).foregroundStyle(NK.muted)
                    Text(money(number(payment, "amount"))).font(.jakarta(32, .semibold)).foregroundStyle(NK.ink)
                    Divider()
                    Text("Method · " + string(payment, "method").uppercased()).font(.nivaasaBody).foregroundStyle(NK.inkSoft)
                    Text("Reference · " + string(payment, "reference", fallback: "—")).font(.nivaasaCaption).foregroundStyle(NK.muted)
                    Text(paid ? "This is a computer-generated receipt from Nivaasa." : "This is a payment intimation, not a receipt. The accounts team must verify it.").font(.nivaasaCaption).foregroundStyle(NK.muted)
                }.padding(20)
            }
        }.background(AppWash())
    }
}
