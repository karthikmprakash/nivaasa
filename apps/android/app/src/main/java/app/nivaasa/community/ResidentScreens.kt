package app.nivaasa.community

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

private fun JSONObject.rows(key: String): List<JSONObject> =
    optJSONArray(key)?.let { a -> (0 until a.length()).mapNotNull(a::optJSONObject) }.orEmpty()

private fun JSONObject.str(key: String, fallback: String = ""): String =
    optString(key).takeIf { it.isNotBlank() && it != "null" } ?: fallback

private fun JSONObject.num(key: String): Double = optDouble(key, 0.0)
private fun JSONObject.int(key: String): Int = optInt(key, 0)

private fun initials(name: String): String =
    name.split(" ").filter(String::isNotBlank).take(2).map { it.first() }.joinToString("")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun ResidentShell(account: JSONObject, onSignOut: () -> Unit) {
    var tab by remember { mutableStateOf("Home") }
    var showServices by remember { mutableStateOf(false) }
    var showNotifications by remember { mutableStateOf(false) }
    var unread by remember { mutableStateOf(0) }
    val token = account.getString("token")

    AppWash {
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        NivaasaTopBar(
            unread = unread,
            userName = account.getJSONObject("user").getString("name"),
            onMenu = { showServices = true },
            onSearch = { showServices = true },
            onNotifications = { showNotifications = true },
            onAccount = { showServices = true },
        )
        Box(Modifier.weight(1f)) {
            when (tab) {
                "Community" -> CommunityScreen(token)
                "Visitors" -> VisitorsScreen(token)
                "Pay" -> PaymentsScreen(token)
                "More" -> MoreScreen(account, onSignOut)
                else -> ResidentHome(account) { tab = it }
            }
        }
        Box(Modifier.navigationBarsPadding()) {
            NivaasaBottomBar(
                tabs = listOf(
                    Triple("Home", Icons.Outlined.Home, "Home"),
                    Triple("Community", Icons.Outlined.List, "Community"),
                    Triple("Visitors", Icons.Outlined.Person, "Visitors"),
                    Triple("Pay", Icons.Outlined.AccountBox, "Pay"),
                    Triple("More", Icons.Outlined.Menu, "More"),
                ),
                selection = tab,
            ) { tab = it }
        }
    }
    }

    if (showServices) {
        ModalBottomSheet(onDismissRequest = { showServices = false }) {
            Column(Modifier.fillMaxWidth().padding(20.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    NivaasaAvatar(account.getJSONObject("user").getString("name"), size = 44)
                    Column {
                        Text(account.getJSONObject("user").getString("name"), style = MaterialTheme.typography.titleMedium, color = NK.ink)
                        Text("Your community", style = MaterialTheme.typography.bodyMedium, color = NK.muted)
                    }
                }
                listOf("Home" to Icons.Outlined.Home, "Community" to Icons.Outlined.List, "Visitors" to Icons.Outlined.Person,
                    "Payments" to Icons.Outlined.AccountBox, "More" to Icons.Outlined.Menu).forEach { (label, icon) ->
                    TextButton(onClick = { tab = if (label == "Payments") "Pay" else label; showServices = false }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                        Icon(icon, contentDescription = null, tint = NK.muted, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(12.dp))
                        Text(label, color = NK.inkSoft, modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Start)
                        Icon(Icons.Outlined.KeyboardArrowRight, contentDescription = null, tint = NK.muted)
                    }
                }
            }
        }
    }
    if (showNotifications) {
        ModalBottomSheet(onDismissRequest = { showNotifications = false }) {
            NotificationsContent(token)
        }
    }
}

@Composable
private fun PageHeading(eyebrow: String, title: String, description: String? = null) {
    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Eyebrow(eyebrow)
        Text(title, style = MaterialTheme.typography.headlineLarge, color = NK.ink)
        if (description != null) Text(description, style = MaterialTheme.typography.bodyLarge, color = NK.muted)
    }
}

@Composable
private fun CommunityScreen(token: String) {
    var data by remember { mutableStateOf<JSONObject?>(null) }
    var tab by remember { mutableStateOf("Notices") }
    var error by remember { mutableStateOf<String?>(null) }
    var notice by remember { mutableStateOf<JSONObject?>(null) }
    LaunchedEffect(token) { runCatching { Api.request("mobile/community", token) }.onSuccess { data = it }.onFailure { error = it.localizedMessage } }
    notice?.let { AlertDialog(onDismissRequest = { notice = null }, confirmButton = { TextButton(onClick = { notice = null }) { Text("Close") } }, title = { Text(it.str("title")) }, text = { Text(it.str("body")) }) }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            PageHeading("Your community", "Community", "Notices, conversations, polls and the moments that bring everyone together.")
            Spacer(Modifier.height(12.dp))
            TabStrip(listOf("Notices", "Discussions", "Polls", "Events"), tab) { tab = it }
        }
        error?.let { item { NivaasaCard { Text(it, color = NK.dangerInk) } } }
        val snapshot = data
        if (snapshot == null) {
            item { LinearProgressIndicator(Modifier.fillMaxWidth(), color = NK.brand600) }
        } else when (tab) {
            "Discussions" -> items(snapshot.rows("discussions")) { item ->
                NivaasaCard {
                    Text(item.str("category").replace('_', ' ').replaceFirstChar { it.uppercaseChar() }, color = NK.brand700, style = MaterialTheme.typography.labelLarge)
                    Text(item.str("title"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                    Text(item.str("body"), color = NK.muted, style = MaterialTheme.typography.bodyMedium, maxLines = 3, overflow = TextOverflow.Ellipsis)
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(item.str("author"), color = NK.inkSoft, style = MaterialTheme.typography.bodyMedium)
                        Text("${item.int("likes")} likes", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                        Text("${item.int("replies")} replies", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            "Polls" -> items(snapshot.rows("polls")) { poll ->
                NivaasaCard {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        NivaasaBadge(if (poll.str("audience") == "owners") "Owners" else "All residents", BadgeTone.Pink)
                        Text(if (poll.str("status") == "active") "Open" else "Closed", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                    }
                    Text(poll.str("question"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                    if (poll.str("description").isNotBlank()) Text(poll.str("description"), color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                    val options = poll.optJSONArray("options")?.let { a -> (0 until a.length()).mapNotNull(a::optJSONObject) }.orEmpty()
                    val counts = poll.optJSONObject("counts") ?: JSONObject()
                    val total = maxOf(1.0, poll.num("total"))
                    options.forEach { option ->
                        val id = option.str("id")
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(option.str("label"), color = NK.inkSoft, style = MaterialTheme.typography.bodyMedium)
                            Text("${counts.optInt(id)}", color = NK.muted, style = MaterialTheme.typography.labelLarge)
                        }
                        LinearProgressIndicator(progress = { (counts.optDouble(id) / total).toFloat() }, modifier = Modifier.fillMaxWidth().height(6.dp), color = NK.brand500, trackColor = NK.canvas)
                    }
                    Text("${poll.int("total")} votes", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                }
            }
            "Events" -> items(snapshot.rows("events")) { event ->
                val date = event.str("startAt")
                NivaasaCard {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.Top) {
                        Box(Modifier.size(46.dp).background(NK.blush50, RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                            Text(shortDay(date), color = NK.blush700, style = MaterialTheme.typography.labelLarge)
                        }
                        Column(Modifier.weight(1f)) {
                            Text(event.str("title"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                            Text("${event.str("location")} · ${shortDay(date)}", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                            Text(event.str("description"), color = NK.muted, style = MaterialTheme.typography.bodyMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
            }
            else -> items(snapshot.rows("notices")) { item ->
                Surface(onClick = { notice = item }, color = Color.Transparent) {
                    NivaasaCard {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                NivaasaBadge(item.str("category").replaceFirstChar { it.uppercaseChar() }, BadgeTone.Amber)
                                if (item.optBoolean("pinned")) NivaasaBadge("Pinned", BadgeTone.Pink)
                            }
                            Text(item.str("publishedAt").take(10), color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                        }
                        Text(item.str("title"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                        Text(item.str("body"), color = NK.muted, style = MaterialTheme.typography.bodyMedium, maxLines = 4, overflow = TextOverflow.Ellipsis)
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(item.str("author", "Community office"), color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                            Text("${item.int("views")} views", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        }
    }
}

private fun shortDay(value: String): String = runCatching {
    val date = if (value.length == 10) java.time.LocalDate.parse(value) else java.time.Instant.parse(value).atZone(java.time.ZoneId.of("Asia/Kolkata")).toLocalDate()
    date.format(java.time.format.DateTimeFormatter.ofPattern("d MMM", java.util.Locale.forLanguageTag("en-IN")))
}.getOrDefault("—")

@Composable
private fun VisitorsScreen(token: String) {
    var data by remember { mutableStateOf<JSONObject?>(null) }
    var tab by remember { mutableStateOf("Waiting") }
    var passType by remember { mutableStateOf<String?>(null) }
    var cancelPass by remember { mutableStateOf<JSONObject?>(null) }
    var feedback by remember { mutableStateOf<String?>(null) }
    val context = androidx.compose.ui.platform.LocalContext.current
    var error by remember { mutableStateOf<String?>(null) }
    var pending by remember { mutableStateOf<Set<String>>(emptySet()) }
    val scope = rememberCoroutineScope()
    suspend fun load() {
        try { data = Api.request("mobile/visitors", token) }
        catch (cancelled: CancellationException) { throw cancelled }
        catch (failure: Exception) { error = failure.localizedMessage ?: "Could not load visits." }
    }
    fun mutate(id: String, path: String, body: JSONObject, message: String) {
        if (id in pending) return
        pending = pending + id
        error = null
        feedback = null
        scope.launch {
            try {
                Api.request(path, token, body)
                feedback = message
                load()
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (failure: Exception) {
                error = failure.localizedMessage ?: "Could not update this visit."
                load()
            } finally { pending = pending - id }
        }
    }
    LaunchedEffect(token) { load() }
    passType?.let { initialType ->
        VisitorActionSheet(false, token, initialType) {
            passType = null
            scope.launch { load() }
        }
    }
    cancelPass?.let { pass ->
        AlertDialog(
            onDismissRequest = { cancelPass = null },
            title = { Text("Cancel this pass?") },
            text = { Text("Security will no longer accept this entry code.") },
            dismissButton = { TextButton(onClick = { cancelPass = null }) { Text("Keep pass") } },
            confirmButton = {
                TextButton(onClick = {
                    cancelPass = null
                    val id = pass.str("id")
                    mutate(id, "mobile/visitors/cancel", JSONObject().put("visitorId", id), "Pass cancelled.")
                }) { Text("Cancel pass", color = NK.dangerInk) }
            }
        )
    }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            PageHeading("Gate & security", "Visitors", "Approve arrivals, share passes and keep the gate moving.")
            Spacer(Modifier.height(10.dp))
            PrimaryButton("Pre-approve a visitor", Icons.Outlined.AddCircle) { passType = "guest" }
            Spacer(Modifier.height(12.dp))
            TabStrip(listOf("Waiting", "Passes", "History", "Daily help"), tab) { tab = it }
        }
        error?.let { item { NivaasaCard { Text(it, color = NK.dangerInk) } } }
        feedback?.let { item { NivaasaCard { Text(it, color = NK.ink) } } }
        val snapshot = data
        if (snapshot == null) item {
            if (error == null) LinearProgressIndicator(Modifier.fillMaxWidth(), color = NK.brand600)
            else TextButton(onClick = { error = null; scope.launch { load() } }) { Text("Try again") }
        }
        else when (tab) {
            "Passes" -> {
                val passes = snapshot.rows("passes")
                if (passes.isEmpty()) item {
                    NivaasaCard {
                        Text("No active passes", color = NK.ink, style = MaterialTheme.typography.titleMedium)
                        Text("Create a pass for a guest, delivery, cab or vendor.", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                        PrimaryButton("Create a pass", Icons.Outlined.AddCircle) { passType = "guest" }
                    }
                }
                items(passes) { pass ->
                    NivaasaCard {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(pass.str("name"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                            NivaasaBadge(pass.str("type").replace('_', ' ').replaceFirstChar { it.uppercaseChar() }, BadgeTone.Pink)
                        }
                        Text(pass.str("code"), color = NK.ink, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                        Text("Valid ${shortDay(pass.str("validFrom"))} – ${shortDay(pass.str("validTo"))}", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                        if (pass.optBoolean("recurringCab")) Text("One pickup per day", color = NK.muted)
                        if (pass.str("status") == "approved") {
                            val enabled = pass.str("id") !in pending
                            val code = pass.str("code")
                            if (code.isNotBlank()) OutlinedButton(enabled = enabled, onClick = {
                                val intent = android.content.Intent(android.content.Intent.ACTION_SEND).setType("text/plain")
                                    .putExtra(android.content.Intent.EXTRA_TEXT, "Your Nivaasa entry code is $code. Show it at the gate.")
                                context.startActivity(android.content.Intent.createChooser(intent, "Share visitor pass"))
                            }) { Text("Share visitor pass") }
                            TextButton(enabled = enabled, onClick = { cancelPass = pass }) { Text("Cancel pass", color = NK.dangerInk) }
                        }
                    }
                }
            }
            "History" -> items(snapshot.rows("history")) { visit ->
                NivaasaCard {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column {
                            Text(visit.str("name"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                            Text(visit.str("type").replace('_', ' ').replaceFirstChar { it.uppercaseChar() }, color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                        }
                        NivaasaBadge(visit.str("status").replaceFirstChar { it.uppercaseChar() }, if (visit.str("status") == "entered") BadgeTone.Pink else BadgeTone.Neutral)
                    }
                }
            }
            "Daily help" -> {
                item {
                    NivaasaCard(tinted = true) {
                        Text("Daily help attendance", style = MaterialTheme.typography.titleMedium, color = NK.ink)
                        Text("See who has checked in today or register someone new.", color = NK.muted)
                        PrimaryButton("Register daily help", Icons.Outlined.AddCircle) { passType = "daily_help" }
                    }
                }
                items(snapshot.rows("help"), key = { it.str("id") }) { person ->
                    NivaasaCard {
                        Text(person.str("name"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                        Text(person.str("role"), color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                        val verified = person.optBoolean("policeVerified")
                        NivaasaBadge(if (verified) "Verified" else "Verification pending", if (verified) BadgeTone.Mint else BadgeTone.Amber)
                        val attendance = person.optJSONObject("attendance")
                        val label = when {
                            attendance?.str("checkOutAt").orEmpty().isNotEmpty() -> "Checked out today"
                            attendance?.str("checkInAt").orEmpty().isNotEmpty() -> "Checked in today"
                            else -> "No check-in today"
                        }
                        Text(label, color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            else -> items(snapshot.rows("pending")) { visitor ->
                NivaasaCard {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Column {
                            Text(visitor.str("name"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                            Text(visitor.str("company", visitor.str("type")), color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                        }
                        NivaasaBadge("At the gate", BadgeTone.Amber, dot = true)
                    }
                    if (visitor.str("notes").isNotBlank()) Text(visitor.str("notes"), color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                    val id = visitor.str("id")
                    val enabled = id !in pending
                    fun respond(action: String, message: String) =
                        mutate(id, "visitors/$id/respond", JSONObject().put("action", action), message)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { respond("deny", "Entry declined.") }, enabled = enabled, modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(containerColor = NK.dangerSoft, contentColor = NK.dangerInk)) { Text("Deny") }
                        Button(onClick = { respond("approve", "Visitor approved.") }, enabled = enabled, modifier = Modifier.weight(1f)) { Text("Approve") }
                    }
                    if (visitor.str("type") == "delivery") TextButton(
                        onClick = { respond("leave_at_gate", "Parcel will stay at the gate.") }, enabled = enabled
                    ) { Text("Leave at gate") }
                }
            }
        }
    }
}

@Composable
private fun PaymentsScreen(token: String) {
    var data by remember { mutableStateOf<JSONObject?>(null) }
    var tab by remember { mutableStateOf("Invoices") }
    var error by remember { mutableStateOf<String?>(null) }
    var paying by remember { mutableStateOf<String?>(null) }
    var message by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    suspend fun load() { runCatching { Api.request("mobile/payments", token) }.onSuccess { data = it }.onFailure { error = it.localizedMessage } }
    LaunchedEffect(token) { load() }
    message?.let { AlertDialog(onDismissRequest = { message = null }, confirmButton = { TextButton(onClick = { message = null }) { Text("Done") } }, title = { Text("Payment recorded") }, text = { Text(it) }) }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item {
            PageHeading("Money, clearly", "Payments", "Dues, receipts and the full history of every rupee.")
            Spacer(Modifier.height(10.dp))
            data?.let { snapshot ->
                NivaasaCard(tinted = true) {
                    Text("Total dues", color = NK.inkSoft, style = MaterialTheme.typography.bodyLarge)
                    Text(formatRupees(snapshot.num("dues")), color = NK.ink, style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
                    Text("Pay securely in the app or record an offline payment with the office.", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                }
            }
            Spacer(Modifier.height(10.dp))
            TabStrip(listOf("Invoices", "History"), tab) { tab = it }
        }
        error?.let { item { NivaasaCard { Text(it, color = NK.dangerInk) } } }
        val snapshot = data
        if (snapshot == null) item { LinearProgressIndicator(Modifier.fillMaxWidth(), color = NK.brand600) }
        else if (tab == "Invoices") items(snapshot.rows("invoices")) { invoice ->
            val status = invoice.str("status")
            NivaasaCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text(invoice.str("title"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                        Text(invoice.str("number"), color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                    }
                    NivaasaBadge(status.replace('_', ' ').replaceFirstChar { it.uppercaseChar() }, if (status == "paid") BadgeTone.Mint else BadgeTone.Amber)
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(formatRupees(invoice.num("total")), color = NK.ink, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    Text("Due ${shortDay(invoice.str("dueDate"))}", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                }
                if (status in listOf("due", "overdue", "partially_paid")) {
                    PrimaryButton(if (paying == invoice.str("id")) "Paying…" else "Pay now", Icons.Outlined.ArrowForward, enabled = paying == null) {
                        paying = invoice.str("id")
                        scope.launch {
                            runCatching { Api.request("payments", token, JSONObject().put("invoiceId", invoice.str("id")).put("method", "upi")) }
                                .onSuccess { message = "Your payment was successful. A receipt is now in History."; load() }
                                .onFailure { error = it.localizedMessage }
                            paying = null
                        }
                    }
                }
            }
        } else items(snapshot.rows("payments")) { payment ->
            NivaasaCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text(formatRupees(payment.num("amount")), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                        Text("${payment.str("receiptNo")} · ${payment.str("method").uppercase()}", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                    }
                    NivaasaBadge(payment.str("status").replaceFirstChar { it.uppercaseChar() }, if (payment.str("status") == "success") BadgeTone.Mint else BadgeTone.Amber)
                }
            }
        }
    }
}

@Composable
private fun MoreScreen(account: JSONObject, onSignOut: () -> Unit) {
    var data by remember { mutableStateOf<JSONObject?>(null) }
    var home by remember { mutableStateOf<JSONObject?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(Unit) {
        runCatching { Api.request("mobile/more", account.getString("token")) }.onSuccess { data = it }.onFailure { error = it.localizedMessage }
        runCatching { Api.request("mobile/home", account.getString("token")) }.onSuccess { home = it }
    }
    LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { PageHeading("Your account", "More") }
        item {
            val profile = data?.optJSONObject("profile")
            NivaasaCard(tinted = true) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    NivaasaAvatar(profile?.optString("name").orEmpty().ifBlank { account.getJSONObject("user").getString("name") }, size = 48)
                    Column {
                        Text(profile?.optString("name").orEmpty().ifBlank { account.getJSONObject("user").getString("name") }, color = NK.ink, style = MaterialTheme.typography.headlineMedium)
                        Text("Home ${profile?.optString("unit").orEmpty().ifBlank { "—" }} · ${data?.optJSONObject("society")?.optString("name").orEmpty()}", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                        Text(profile?.optString("role").orEmpty().replace('_', ' ').replaceFirstChar { it.uppercaseChar() }, color = NK.brand700, style = MaterialTheme.typography.labelLarge)
                    }
                }
            }
        }
        error?.let { item { Text(it, color = NK.dangerInk) } }
        val snapshot = data
        if (snapshot != null) {
            item { section("Directory", snapshot.rows("directory")) { person ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        Text(person.str("name"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                        Text("Home ${person.str("unit")} · ${person.str("phone")}", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            } }
            item { section("Documents", snapshot.rows("documents")) { doc ->
                Column {
                    Text(doc.str("title"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                    Text("${doc.str("category").replaceFirstChar { it.uppercaseChar() }} · ${doc.str("createdAt").take(10)}", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                }
            } }
            item { section("Amenities", snapshot.rows("amenities")) { amenity ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column(Modifier.weight(1f)) {
                        Text(amenity.str("name"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                        Text("${amenity.str("openTime")}–${amenity.str("closeTime")} · ${amenity.int("capacity")} people", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                    }
                    if (amenity.num("price") > 0) NivaasaBadge(formatRupees(amenity.num("price")), BadgeTone.Pink)
                }
            } }
            val deliveries = home?.rows("deliveries").orEmpty()
            if (deliveries.isNotEmpty()) {
                item {
                    NivaasaCard {
                        Text("Deliveries", color = NK.ink, style = MaterialTheme.typography.titleLarge)
                        deliveries.take(3).forEach {
                            Text("${it.str("company")} · Home ${it.str("unit")}", color = NK.inkSoft, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
            val notifications = snapshot.rows("notifications")
            if (notifications.isNotEmpty()) {
                item {
                    NivaasaCard {
                        Text("Notifications", color = NK.ink, style = MaterialTheme.typography.titleLarge)
                        notifications.take(3).forEach {
                            Text(it.str("title"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                            Text(it.str("body"), color = NK.muted, style = MaterialTheme.typography.bodyMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        }
                    }
                }
            }
        }
        item {
            Button(onClick = onSignOut, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = NK.dangerSoft, contentColor = NK.dangerInk)) {
                Icon(Icons.Outlined.ExitToApp, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Sign out")
            }
        }
    }
}

@Composable
private fun <T> section(title: String, rows: List<T>, row: @Composable (T) -> Unit) {
    if (rows.isEmpty()) return
    NivaasaCard {
        Text(title, color = NK.ink, style = MaterialTheme.typography.titleLarge)
        rows.take(4).forEach {
            row(it)
            HorizontalDivider(color = NK.line)
        }
    }
}

@Composable
private fun NotificationsContent(token: String) {
    var rows by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    LaunchedEffect(token) {
        runCatching { Api.request("mobile/more", token) }.onSuccess { rows = it.rows("notifications") }
    }
    Column(Modifier.fillMaxWidth().padding(20.dp).heightIn(max = 560.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text("Notifications", style = MaterialTheme.typography.headlineMedium, color = NK.ink)
        if (rows.isEmpty()) Text("You're all caught up.", color = NK.muted)
        rows.forEach { note ->
            NivaasaCard {
                Text(note.str("title"), color = NK.ink, style = MaterialTheme.typography.titleMedium)
                Text(note.str("body"), color = NK.muted, style = MaterialTheme.typography.bodyMedium)
                Text(note.str("createdAt").take(10), color = NK.muted, style = MaterialTheme.typography.labelSmall)
            }
        }
    }
}

@Composable
internal fun NewTicketSheet(token: String, done: () -> Unit) {
    var subject by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    AlertDialog(
        onDismissRequest = { if (!busy) done() },
        title = { Text("Raise a request") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(subject, { subject = it }, label = { Text("Subject") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(description, { description = it }, label = { Text("Description") }, modifier = Modifier.fillMaxWidth().heightIn(min = 100.dp))
                error?.let { Text(it, color = NK.dangerInk) }
            }
        },
        confirmButton = {
            TextButton(enabled = !busy && subject.length >= 5 && description.length >= 10, onClick = {
                busy = true
                scope.launch {
                    runCatching {
                        Api.request("mobile/helpdesk", token, JSONObject().put("category", "Other").put("scope", "personal").put("subject", subject).put("description", description).put("priority", "medium"))
                    }.onSuccess { done() }.onFailure { error = it.localizedMessage }
                    busy = false
                }
            }) { Text(if (busy) "Sending…" else "Submit") }
        },
        dismissButton = { TextButton(onClick = done, enabled = !busy) { Text("Cancel") } },
    )
}

@Composable
internal fun AndroidLoginScreen(
    email: String,
    setEmail: (String) -> Unit,
    password: String,
    setPassword: (String) -> Unit,
    error: String?,
    busy: Boolean,
    submit: () -> Unit,
) {
    AppWash {
        Column(
            Modifier.fillMaxSize().statusBarsPadding().verticalScroll(rememberScrollState()).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                Image(painterResource(R.drawable.nivaasa_mark), contentDescription = "Nivaasa", modifier = Modifier.size(40.dp))
                Column {
                    Text("nivaasa", style = MaterialTheme.typography.headlineMedium, color = NK.ink)
                    Text("community, in one place", style = MaterialTheme.typography.bodyMedium, color = NK.muted)
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                Eyebrow("Welcome home")
                Text("Your community,\nin one place.", style = MaterialTheme.typography.headlineLarge, color = NK.ink)
                Text("Approvals, dues, notices and the people around you — all in one calm place.", style = MaterialTheme.typography.bodyLarge, color = NK.inkSoft)
            }
            NivaasaCard {
                Text("Email address", color = NK.inkSoft, style = MaterialTheme.typography.labelLarge)
                OutlinedTextField(email, setEmail, modifier = Modifier.fillMaxWidth(), singleLine = true, placeholder = { Text("you@nivaasa.app") }, keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Email))
                Text("Password", color = NK.inkSoft, style = MaterialTheme.typography.labelLarge)
                OutlinedTextField(password, setPassword, modifier = Modifier.fillMaxWidth(), singleLine = true, placeholder = { Text("Your password") }, visualTransformation = androidx.compose.ui.text.input.PasswordVisualTransformation(), keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Password))
                error?.let { Text(it, color = NK.dangerInk, style = MaterialTheme.typography.bodyMedium) }
                PrimaryButton(if (busy) "Signing in…" else "Sign in", Icons.Outlined.ArrowForward, enabled = !busy && email.isNotBlank() && password.isNotEmpty(), run = submit)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(6.dp).background(NK.blush400, CircleShape))
                Spacer(Modifier.width(8.dp))
                Text("Demo accounts use demo1234", color = NK.muted, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}
