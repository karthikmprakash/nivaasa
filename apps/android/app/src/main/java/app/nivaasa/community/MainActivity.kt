package app.nivaasa.community

import android.os.Bundle
import android.content.Intent
import androidx.compose.ui.platform.LocalContext
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.background
import androidx.compose.foundation.Image
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.List
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Person
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.vectorResource
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Brush
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            NivaasaTheme { CommunityApp() }
        }
    }
}

internal object Api {
    suspend fun request(path: String, token: String? = null, body: JSONObject? = null, post: Boolean = false): JSONObject =
        withContext(Dispatchers.IO) {
            val connection = URL("${BuildConfig.API_URL}/api/$path").openConnection() as HttpURLConnection
            try {
                connection.instanceFollowRedirects = false
                connection.connectTimeout = 15_000
                connection.readTimeout = 15_000
                connection.requestMethod = if (post || body != null) "POST" else "GET"
                if (token != null) connection.setRequestProperty("Authorization", "Bearer $token")
                if (body != null) {
                    connection.doOutput = true
                    connection.setRequestProperty("Content-Type", "application/json")
                    connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
                }
                val success = connection.responseCode in 200..299
                val stream = if (success) connection.inputStream else connection.errorStream
                val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
                val data = runCatching { JSONObject(text) }.getOrNull()
                if (!success) error(data?.optString("error")?.takeIf { it.isNotBlank() } ?: "The server could not complete this request.")
                data ?: error("The server returned an unexpected response.")
            } finally {
                connection.disconnect()
            }
        }
}

internal enum class Destination(val title: String, val groups: List<Pair<String, String>>) {
    VISITORS("Visitors", listOf("pending" to "Waiting at the gate", "passes" to "Active passes", "help" to "Daily help", "history" to "Visit history")),
    COMMUNITY("Community updates", listOf("notices" to "Notices", "discussions" to "Discussions", "events" to "Events")),
    PAYMENTS("Payments", listOf("invoices" to "Invoices")),
    HELPDESK("Helpdesk", listOf("tickets" to "Requests")),
    GATE("Gate activity", listOf("queue" to "Waiting at the gate", "deliveries" to "Deliveries")),
    MANAGE("Management overview", emptyList()),
    DELIVERIES("Deliveries", listOf("deliveries" to "Active deliveries"));

    fun allowed(account: JSONObject): Boolean {
        val membership = account.optJSONObject("membership") ?: return false
        val role = membership.optString("role")
        val elevated = account.optJSONObject("user")?.optString("globalRole") == "super_admin"
        return when (this) {
            COMMUNITY -> true
            GATE -> elevated || role in setOf("guard", "security_manager", "admin", "manager")
            MANAGE -> elevated || role in setOf("admin", "manager")
            else -> !membership.isNull("unitId")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CommunityApp() {
    var account by remember { mutableStateOf<JSONObject?>(null) }
    var destination by remember { mutableStateOf<Destination?>(null) }
    var email by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val signedIn = account
    val selected = destination
    val resident = signedIn != null && Destination.VISITORS.allowed(signedIn) &&
        !Destination.GATE.allowed(signedIn) && !Destination.MANAGE.allowed(signedIn)
    var showMore by remember { mutableStateOf(false) }

    fun signOut() {
        val token = account?.optString("token")
        showMore = false
        destination = null
        account = null
        if (token != null) scope.launch { runCatching { Api.request("auth/logout", token, post = true) } }
    }

    fun signIn() {
        if (busy || email.isBlank() || password.isEmpty()) return
        busy = true
        error = null
        scope.launch {
            try {
                account = Api.request("auth/login", body = JSONObject().put("email", email.trim()).put("password", password))
                password = ""
            } catch (cancelled: kotlinx.coroutines.CancellationException) {
                throw cancelled
            } catch (failure: Exception) {
                error = failure.localizedMessage ?: "Sign-in failed."
            } finally {
                busy = false
            }
        }
    }

    if (signedIn == null) {
        AndroidLoginScreen(email, { email = it }, password, { password = it }, error, busy, ::signIn)
        return
    }

    if (signedIn.optString("home") == "/app") {
        ResidentShell(signedIn) { signOut() }
        return
    }

    if (showMore && signedIn != null) {
        ModalBottomSheet(onDismissRequest = { showMore = false }) {
            LazyColumn(contentPadding = PaddingValues(16.dp)) {
                item { Text("More services", style = MaterialTheme.typography.headlineSmall) }
                items(Destination.entries.filter { it.allowed(signedIn) }) { page ->
                    TextButton(onClick = { showMore = false; destination = page }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                        Text(page.title)
                    }
                }
                item { TextButton(onClick = ::signOut) { Text("Sign out", color = MaterialTheme.colorScheme.error) } }
            }
        }
    }

    BackHandler(selected != null) { destination = null }
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            if (resident) QuickNavigation(selected, { destination = it }, { showMore = true })
        },
        topBar = {
            TopAppBar(
                title = {
                    if (resident && selected == null) {
                        Image(painterResource(R.drawable.nivaasa_mark), contentDescription = "Nivaasa", modifier = Modifier.size(32.dp))
                    } else Text(selected?.title ?: if (signedIn == null) "Nivaasa" else "Community")
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
                navigationIcon = {
                    if (selected != null) TextButton(onClick = { destination = null }) { Text("Back") }
                    else if (resident) IconButton(onClick = { showMore = true }) {
                        Icon(Icons.Outlined.Menu, contentDescription = "Navigation")
                    }
                },
                actions = {
                    if (resident && signedIn != null) {
                        val initials = signedIn.getJSONObject("user").getString("name").split(" ").filter(String::isNotEmpty)
                            .take(2).map { it.first() }.joinToString("")
                        IconButton(onClick = { showMore = true }) {
                            Box(Modifier.size(34.dp).background(BrandBlue, RoundedCornerShape(50)), contentAlignment = Alignment.Center) {
                                Text(initials, color = Color.White, style = MaterialTheme.typography.labelMedium)
                            }
                        }
                    }
                }
            )
        }
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding).imePadding(), contentAlignment = Alignment.TopCenter) {
            if (signedIn != null && selected != null) {
                Feed(selected, signedIn.getString("token"))
            } else {
                LazyColumn(
                    modifier = Modifier.widthIn(max = 600.dp).fillMaxWidth(),
                    contentPadding = PaddingValues(20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    if (signedIn == null) {
                        item { Text("Sign in to your community", style = MaterialTheme.typography.headlineSmall) }
                        item {
                            OutlinedTextField(email, { email = it }, Modifier.fillMaxWidth(),
                                label = { Text("Email address") }, singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email))
                        }
                        item {
                            OutlinedTextField(password, { password = it }, Modifier.fillMaxWidth(),
                                label = { Text("Password") }, singleLine = true,
                                visualTransformation = PasswordVisualTransformation(),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password))
                        }
                        error?.let { message -> item { Text(message, color = MaterialTheme.colorScheme.error) } }
                        item {
                            Button(
                                enabled = !busy && email.isNotBlank() && password.isNotEmpty(),
                                onClick = {
                                    busy = true
                                    error = null
                                    scope.launch {
                                        try {
                                            account = Api.request("auth/login", body = JSONObject().put("email", email.trim()).put("password", password))
                                            password = ""
                                        } catch (cancelled: kotlinx.coroutines.CancellationException) {
                                            throw cancelled
                                        } catch (failure: Exception) {
                                            error = failure.localizedMessage ?: "Sign-in failed."
                                        } finally {
                                            busy = false
                                        }
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)
                            ) { Text(if (busy) "Signing in…" else "Sign in") }
                        }
                    } else {
                        val primary = when {
                            signedIn.optJSONObject("membership")?.optString("role") == "guard" -> Destination.GATE
                            Destination.MANAGE.allowed(signedIn) -> Destination.MANAGE
                            else -> Destination.VISITORS
                        }
                        item {
                            Column(
                                Modifier.fillMaxWidth().background(
                                    Brush.linearGradient(listOf(Color(0xFF263C9D), Color(0xFF5344B4))),
                                    RoundedCornerShape(24.dp)
                                ).padding(22.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                Text("NIVAASA", color = Color.White, style = MaterialTheme.typography.labelLarge)
                                Text(when (primary) {
                                    Destination.GATE -> "Gate desk"
                                    Destination.MANAGE -> "Community operations"
                                    else -> "Your community"
                                }, color = Color.White, style = MaterialTheme.typography.headlineMedium)
                                Text(signedIn.optJSONObject("user")?.optString("name").orEmpty(), color = Color.White)
                                if (primary.allowed(signedIn)) {
                                    Button(
                                        onClick = { destination = primary },
                                        colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = Color(0xFF263C9D)),
                                        modifier = Modifier.heightIn(min = 48.dp)
                                    ) { Text(primary.title) }
                                }
                            }
                        }
                        val sections = listOf(
                            "My community" to listOf(Destination.VISITORS, Destination.COMMUNITY),
                            "Account" to listOf(Destination.PAYMENTS, Destination.HELPDESK),
                            "Operations" to listOf(Destination.GATE, Destination.MANAGE)
                        )
                        sections.forEach { (label, destinations) ->
                            val visible = destinations.filter { it.allowed(signedIn) }
                            if (visible.isNotEmpty()) {
                                item { Text(label, style = MaterialTheme.typography.titleSmall) }
                                items(visible) { page ->
                                    Card(onClick = { destination = page }) {
                                        ListItem(headlineContent = { Text(page.title) })
                                    }
                                }
                            }
                        }
                        item {
                            TextButton(onClick = ::signOut) { Text("Sign out") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Feed(destination: Destination, token: String) {
    val context = LocalContext.current
    var showAction by remember(destination) { mutableStateOf(false) }
    var payload by remember(destination) { mutableStateOf<JSONObject?>(null) }
    var error by remember(destination) { mutableStateOf<String?>(null) }
    var reload by remember(destination) { mutableIntStateOf(0) }
    var loading by remember(destination) { mutableStateOf(true) }
    LaunchedEffect(destination, token, reload) {
        loading = true
        error = null
        try {
            val endpoint = if (destination == Destination.DELIVERIES) "home" else destination.name.lowercase(Locale.ROOT)
            payload = Api.request("mobile/$endpoint", token)
        } catch (cancelled: kotlinx.coroutines.CancellationException) {
            throw cancelled
        } catch (failure: Exception) {
            error = failure.localizedMessage ?: "Unable to load this screen."
        } finally {
            loading = false
        }
    }

    val data = payload
    if (showAction) {
        VisitorActionSheet(destination == Destination.GATE, token) {
            showAction = false
            reload++
        }
    }
    LazyColumn(
        modifier = Modifier.widthIn(max = 600.dp).fillMaxWidth(),
        contentPadding = PaddingValues(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (destination == Destination.GATE || destination == Destination.VISITORS) {
            item {
                Button(onClick = { showAction = true }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                    Text(if (destination == Destination.GATE) "Verify entry code" else "Create a visitor pass")
                }
            }
        }
        if (loading) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
        error?.let { message -> item { Text(message, color = MaterialTheme.colorScheme.error) } }
        if (!loading) item { TextButton(onClick = { reload++ }) { Text(if (error == null) "Refresh" else "Try again") } }
        if (data != null) {
            if (destination == Destination.MANAGE) {
                items(listOf("Homes" to "units", "Open requests" to "openTickets", "Visitors" to "visitors")) { (label, key) ->
                    ListItem(headlineContent = { Text(label) }, supportingContent = { Text(data.optString(key, "—")) })
                }
            }
            if (destination == Destination.PAYMENTS && data.has("dues")) {
                item { ListItem(headlineContent = { Text("Outstanding") }, supportingContent = { Text(formatRupees(data.getDouble("dues"))) }) }
            }
            destination.groups.forEach { (key, label) ->
                item { Text(label, style = MaterialTheme.typography.titleMedium) }
                val array = data.optJSONArray(key)
                val rows = if (array == null) emptyList() else (0 until array.length()).mapNotNull { array.optJSONObject(it) }
                if (rows.isEmpty()) item { Text("No entries", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                items(rows) { row ->
                    val title = listOf("title", "subject", "name", "company", "number")
                        .firstNotNullOfOrNull { field -> row.optString(field).takeIf { !row.isNull(field) && it.isNotBlank() } } ?: "Entry"
                    val details = listOfNotNull(
                        row.optString("status").takeIf { !row.isNull("status") }?.replace('_', ' ')?.replaceFirstChar { it.uppercaseChar() },
                        row.optString("otp").takeIf { destination == Destination.DELIVERIES && row.optString("status") == "left_at_gate" && !row.isNull("otp") }?.let { "Pickup code $it" },
                        row.optString("body").takeIf { destination == Destination.COMMUNITY && !row.isNull("body") }
                    )
                    Card {
                        ListItem(
                            headlineContent = { Text(title) },
                            supportingContent = if (details.isEmpty()) null else { { Text(details.joinToString("\n")) } }
                        )
                        if (destination == Destination.VISITORS && key == "passes" && !row.isNull("code")) {
                            val code = row.getString("code")
                            TextButton(onClick = {
                                val intent = Intent(Intent.ACTION_SEND).setType("text/plain")
                                    .putExtra(Intent.EXTRA_TEXT, "Your Nivaasa entry code is $code. Show it at the gate.")
                                context.startActivity(Intent.createChooser(intent, "Share entry code"))
                            }) { Text("Share code $code") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun QuickNavigation(selected: Destination?, open: (Destination?) -> Unit, more: () -> Unit) {
    Column(Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surface).navigationBarsPadding()) {
        HorizontalDivider()
        Row(Modifier.fillMaxWidth().selectableGroup()) {
            QuickTab("Home", Icons.Outlined.Home, selected == null, Modifier.weight(1f)) { open(null) }
            QuickTab("Community", Icons.Outlined.List, selected == Destination.COMMUNITY, Modifier.weight(1f)) { open(Destination.COMMUNITY) }
            QuickTab("Visitors", Icons.Outlined.Person, selected == Destination.VISITORS, Modifier.weight(1f)) { open(Destination.VISITORS) }
            QuickTab("Pay", ImageVector.vectorResource(R.drawable.ic_wallet), selected == Destination.PAYMENTS, Modifier.weight(1f)) { open(Destination.PAYMENTS) }
            QuickTab("More", Icons.Outlined.Menu, selected in listOf(Destination.HELPDESK, Destination.DELIVERIES), Modifier.weight(1f), more)
        }
    }
}

@Composable
private fun QuickTab(label: String, icon: ImageVector, active: Boolean, modifier: Modifier, run: () -> Unit) {
    val color = if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
    Column(modifier.heightIn(min = 60.dp).selectable(selected = active, role = Role.Tab, onClick = run).padding(vertical = 7.dp),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
        Spacer(Modifier.height(4.dp))
        Text(label, color = color, style = MaterialTheme.typography.labelSmall,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}
