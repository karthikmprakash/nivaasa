package app.nivaasa.community

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.util.Locale

internal fun formatRupees(paise: Double): String =
    NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-IN")).apply { maximumFractionDigits = 0 }.format(paise / 100)

private fun JSONObject.rows(key: String): List<JSONObject> =
    optJSONArray(key)?.let { array -> (0 until array.length()).mapNotNull(array::optJSONObject) }.orEmpty()

private fun JSONObject.str(key: String, fallback: String = ""): String =
    optString(key).takeIf { it.isNotBlank() && it != "null" } ?: fallback

private fun JSONObject.num(key: String): Double = optDouble(key, 0.0)

private fun initials(name: String): String =
    name.split(" ").filter(String::isNotBlank).take(2).map { it.first() }.joinToString("")

private fun shortDate(value: String?): String {
    if (value.isNullOrBlank()) return "—"
    return runCatching {
        val date = if (value.length == 10) LocalDate.parse(value)
        else Instant.parse(value).atZone(ZoneId.of("Asia/Kolkata")).toLocalDate()
        date.format(DateTimeFormatter.ofPattern("d MMM", Locale.forLanguageTag("en-IN")))
    }.getOrDefault("—")
}

private fun relativeDate(value: String?): String {
    if (value.isNullOrBlank()) return ""
    return runCatching {
        val instant = Instant.parse(value)
        val minutes = (System.currentTimeMillis() - instant.toEpochMilli()) / 60_000
        when {
            minutes < 2 -> "just now"
            minutes < 60 -> "${minutes}m ago"
            minutes < 1440 -> "${minutes / 60}h ago"
            minutes < 10080 -> "${minutes / 1440}d ago"
            else -> shortDate(value)
        }
    }.getOrDefault("")
}

@Composable
internal fun ResidentHome(account: JSONObject, openTab: (String) -> Unit) {
    val token = account.getString("token")
    val scope = rememberCoroutineScope()
    var data by remember(token) { mutableStateOf<JSONObject?>(null) }
    var loading by remember(token) { mutableStateOf(false) }
    var error by remember(token) { mutableStateOf<String?>(null) }
    var response by remember(token) { mutableStateOf<String?>(null) }
    var pending by remember(token) { mutableStateOf<Set<String>>(emptySet()) }
    var showPass by remember { mutableStateOf(false) }
    var notice by remember { mutableStateOf<JSONObject?>(null) }
    var showNewTicket by remember { mutableStateOf(false) }

    suspend fun load() {
        if (loading) return
        loading = true
        error = null
        try { data = Api.request("mobile/home", token) }
        catch (cancelled: CancellationException) { throw cancelled }
        catch (failure: Exception) { error = failure.localizedMessage ?: "Could not load your community." }
        finally { loading = false }
    }

    fun respond(visitor: JSONObject, action: String) {
        val id = visitor.getString("id")
        if (id in pending) return
        pending = pending + id
        scope.launch {
            try {
                Api.request("visitors/$id/respond", token, JSONObject().put("action", action))
                response = when (action) {
                    "approve" -> "Visitor approved"
                    "deny" -> "Entry declined"
                    else -> "Parcel will stay at the gate"
                }
                load()
            } catch (cancelled: CancellationException) { throw cancelled }
            catch (failure: Exception) { error = failure.localizedMessage ?: "Could not update the visitor." }
            finally { pending = pending - id }
        }
    }

    LaunchedEffect(token) { load() }
    if (showPass) VisitorActionSheet(false, token) { showPass = false; scope.launch { load() } }
    notice?.let { selected ->
        NoticeSheet(selected) { notice = null }
    }
    if (showNewTicket) NewTicketSheet(token) { showNewTicket = false; scope.launch { load() } }

    val now = ZonedDateTime.now(ZoneId.of("Asia/Kolkata"))
    val salutation = when { now.hour < 12 -> "Good morning"; now.hour < 17 -> "Good afternoon"; else -> "Good evening" }
    val firstName = account.getJSONObject("user").getString("name").trim().substringBefore(" ")
    val formatter = DateTimeFormatter.ofPattern("EEEE, d MMMM", Locale.forLanguageTag("en-IN"))
    val snapshot = data

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 20.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                Eyebrow("Your community")
                Text("$salutation, $firstName.", style = MaterialTheme.typography.headlineLarge, color = NK.ink)
                Text("${now.format(formatter)}  /  Home ${snapshot?.optString("unit").orEmpty().ifBlank { "—" }}",
                    style = MaterialTheme.typography.bodyLarge, color = NK.muted)
                Box(Modifier.padding(top = 5.dp)) {
                    PrimaryButton("Pre-approve a visitor", Icons.Outlined.AddCircle) { showPass = true }
                }
            }
        }
        error?.let { message ->
            item { NivaasaCard { Text(message, color = NK.dangerInk, style = MaterialTheme.typography.bodyMedium); TextButton(onClick = { scope.launch { load() } }) { Text("Refresh home", color = NK.brand700) } } }
        }
        response?.let { message ->
            item { Text(message, color = NK.mint600, style = MaterialTheme.typography.bodyMedium) }
        }
        if (snapshot == null) {
            if (loading) item { LinearProgressIndicator(Modifier.fillMaxWidth(), color = NK.brand600) }
            return@LazyColumn
        }

        val visitors = snapshot.rows("pendingVisitors")
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("At your gate", color = NK.ink, style = MaterialTheme.typography.titleLarge)
                if (visitors.isNotEmpty()) NivaasaBadge("${visitors.size} waiting", BadgeTone.Amber, dot = true)
                Spacer(Modifier.weight(1f))
                TextButton(onClick = { openTab("Visitors") }) { Text("All visitors", color = NK.brand700, style = MaterialTheme.typography.labelLarge) }
            }
        }
        if (visitors.isEmpty()) {
            item { EmptyCard("No visitors waiting", "Approval requests will appear here when someone arrives.") }
        } else {
            items(visitors, key = { it.optString("id") }) { visitor ->
                VisitorCard(visitor, pending.contains(visitor.optString("id"))) { action -> respond(visitor, action) }
            }
        }

        item {
            val dues = snapshot.optJSONObject("dues") ?: JSONObject()
            val total = dues.optDouble("total", 0.0)
            val count = dues.optInt("count")
            val overdue = dues.optInt("overdue")
            NivaasaCard(tinted = true) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("Maintenance & dues", color = NK.inkSoft, style = MaterialTheme.typography.bodyLarge)
                    Icon(Icons.Outlined.AccountBox, contentDescription = null, tint = NK.brand600, modifier = Modifier.size(19.dp))
                }
                Text(formatRupees(total), color = NK.ink, style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
                Text(if (count == 0) "All paid. You're up to date." else "$count open invoices", color = NK.muted, style = MaterialTheme.typography.bodyLarge)
                if (overdue > 0) Text("$overdue invoice over due", color = NK.amberInk, style = MaterialTheme.typography.labelLarge)
                PrimaryButton(if (total > 0) "Review & pay" else "Payment history", Icons.Outlined.ArrowForward) { openTab("Pay") }
            }
        }

        item {
            NivaasaCard {
                Text("Everyday services", color = NK.ink, style = MaterialTheme.typography.titleMedium)
                val services = listOf(
                    Triple("Raise a request", Icons.Outlined.Build) { showNewTicket = true },
                    Triple("Book an amenity", Icons.Outlined.DateRange) { openTab("More") },
                    Triple("Payments", Icons.Outlined.AccountBox) { openTab("Pay") },
                    Triple("Directory", Icons.Outlined.Person) { openTab("More") },
                    Triple("Documents", Icons.Outlined.List) { openTab("More") },
                    Triple("My household", Icons.Outlined.Home) { openTab("More") },
                )
                services.chunked(2).forEach { row ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        row.forEach { (label, icon, action) ->
                            Surface(
                                onClick = action,
                                modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                                shape = RoundedCornerShape(10.dp),
                                color = NK.canvas,
                            ) {
                                Row(Modifier.padding(horizontal = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                                    Icon(icon, contentDescription = null, tint = NK.muted, modifier = Modifier.size(16.dp))
                                    Text(label, color = NK.inkSoft, style = MaterialTheme.typography.bodyMedium, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                }
                            }
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
        }

        val polls = snapshot.rows("polls")
        if (polls.isNotEmpty()) {
            item { PollCard(polls.first()) { pollId, option -> scope.launch { runCatching { Api.request("community/poll", token, JSONObject().put("pollId", pollId).put("optionId", option)) }; load() } } }
        }

        val notices = snapshot.rows("notices")
        item {
            NivaasaCard {
                SectionHeadingRow("Community updates", "View all") { openTab("Community") }
                Text("Notices from your committee", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                if (notices.isEmpty()) Text("No notices yet", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                notices.take(3).forEach { noticeItem ->
                    HorizontalDivider(color = NK.line)
                    Surface(onClick = { notice = noticeItem }, color = Color.Transparent) {
                        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                NivaasaBadge(noticeItem.str("category").replaceFirstChar { it.uppercaseChar() }, BadgeTone.Amber)
                                if (noticeItem.optBoolean("pinned")) NivaasaBadge("Pinned", BadgeTone.Pink)
                                Spacer(Modifier.weight(1f))
                                Text(relativeDate(noticeItem.optString("publishedAt")), color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                            }
                            Text(noticeItem.str("title"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                            Text(noticeItem.str("body"), color = NK.muted, style = MaterialTheme.typography.bodyMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
            }
        }

        val deliveries = snapshot.rows("deliveries")
        if (deliveries.isNotEmpty()) {
            item {
                NivaasaCard {
                    SectionHeadingRow("Deliveries", "View all") { openTab("More") }
                    deliveries.take(2).forEach { delivery ->
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Outlined.ShoppingCart, contentDescription = null, tint = NK.muted, modifier = Modifier.size(20.dp))
                            Column(Modifier.weight(1f)) {
                                Text(delivery.str("company"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                                Text(if (delivery.str("status") == "left_at_gate") "Ready to collect at the gate" else "Waiting at the gate", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                                if (delivery.str("status") == "left_at_gate" && delivery.str("otp").isNotBlank()) Text("Pickup code ${delivery.str("otp")}", color = NK.inkSoft, style = MaterialTheme.typography.labelLarge)
                            }
                        }
                    }
                }
            }
        }

        val tickets = snapshot.rows("tickets")
        if (tickets.isNotEmpty()) {
            item {
                NivaasaCard {
                    SectionHeadingRow("Your requests", "All requests") { showNewTicket = true }
                    tickets.take(2).forEach { ticket ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(ticket.str("subject"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                                Text(ticket.str("category"), color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                            }
                            NivaasaBadge(ticket.str("status").replace('_', ' ').replaceFirstChar { it.uppercaseChar() }, BadgeTone.Blue)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionHeadingRow(title: String, action: String?, run: () -> Unit) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(title, color = NK.ink, style = MaterialTheme.typography.titleLarge)
        if (action != null) TextButton(onClick = run) { Text(action, color = NK.brand700, style = MaterialTheme.typography.labelLarge) }
    }
}

@Composable
private fun EmptyCard(title: String, detail: String) {
    NivaasaCard {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Outlined.CheckCircle, contentDescription = null, tint = NK.mint600)
            Column {
                Text(title, color = NK.ink, style = MaterialTheme.typography.titleMedium)
                Text(detail, color = NK.muted, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
private fun VisitorCard(visitor: JSONObject, sending: Boolean, respond: (String) -> Unit) {
    val name = visitor.str("name", "Visitor")
    NivaasaCard {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
                Box(Modifier.size(42.dp).background(NK.blush100, CircleShape), contentAlignment = Alignment.Center) {
                    Text(initials(name), color = NK.blush700, style = MaterialTheme.typography.labelLarge)
                }
                Column {
                    Text(name, color = NK.ink, style = MaterialTheme.typography.titleMedium)
                    Text(listOf(visitor.str("company"), visitor.str("purpose", visitor.str("type").replace('_', ' ').replaceFirstChar { it.uppercaseChar() })).filter { it.isNotBlank() }.joinToString(" · "), color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                }
            }
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                NivaasaBadge("At the gate", BadgeTone.Amber, dot = true)
                Text(relativeDate(visitor.optString("createdAt")), color = NK.muted, style = MaterialTheme.typography.bodyMedium)
            }
        }
        if (visitor.str("purpose").isNotBlank()) Text(visitor.str("purpose"), color = NK.inkSoft, style = MaterialTheme.typography.bodyLarge)
        if (visitor.str("notes").isNotBlank()) Text(visitor.str("notes"), color = NK.muted, style = MaterialTheme.typography.bodyMedium)
        SoftButton("Deny", Icons.Outlined.Close) { respond("deny") }
        PrimaryButton(if (sending) "Sending…" else "Approve", Icons.Outlined.Check, enabled = !sending) { respond("approve") }
        if (visitor.str("type") == "delivery") OutlineButton("Leave at gate", Icons.Outlined.ShoppingCart) { respond("leave_at_gate") }
    }
}

@Composable
private fun PollCard(poll: JSONObject, onVote: (String, String) -> Unit) {
    val options = poll.optJSONArray("options")?.let { array -> (0 until array.length()).mapNotNull(array::optJSONObject) }.orEmpty()
    val counts = poll.optJSONObject("counts") ?: JSONObject()
    val total = maxOf(1.0, poll.optDouble("total", 0.0))
    val myVote = poll.optString("myVote")
    NivaasaCard {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            NivaasaBadge("Open poll", BadgeTone.Pink)
            Text(poll.optString("endsAt").takeIf { it.isNotBlank() }?.let { "Closes ${shortDate(it)}" } ?: "Voting is open", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
        }
        Text(poll.str("question"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
        if (poll.str("description").isNotBlank()) Text(poll.str("description"), color = NK.muted, style = MaterialTheme.typography.bodyMedium)
        options.forEach { option ->
            val id = option.str("id")
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(option.str("label"), color = NK.inkSoft, style = MaterialTheme.typography.bodyLarge)
                Text("${counts.optInt(id)}", color = NK.muted, style = MaterialTheme.typography.labelLarge)
            }
            LinearProgressIndicator(progress = { (counts.optDouble(id) / total).toFloat() }, modifier = Modifier.fillMaxWidth().height(6.dp), color = NK.brand500, trackColor = NK.canvas)
            if (myVote.isBlank()) TextButton(onClick = { onVote(poll.str("id"), id) }) { Text("Vote", color = NK.brand700) }
        }
    }
}

@Composable
private fun NoticeSheet(notice: JSONObject, close: () -> Unit) {
    AlertDialog(
        onDismissRequest = close,
        confirmButton = { TextButton(onClick = close) { Text("Close") } },
        title = { Text(notice.str("title"), style = MaterialTheme.typography.titleLarge) },
        text = { Text(notice.str("body"), style = MaterialTheme.typography.bodyLarge) },
    )
}
