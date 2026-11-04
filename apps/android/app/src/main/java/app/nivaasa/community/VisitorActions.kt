package app.nivaasa.community

import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.time.LocalDate
import java.time.ZoneId

private fun communityToday(): LocalDate = LocalDate.now(ZoneId.of("Asia/Kolkata"))

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun VisitorActionSheet(isGate: Boolean, token: String, close: () -> Unit) {
    var busy by remember { mutableStateOf(false) }
    val sheet = rememberModalBottomSheetState(
        skipPartiallyExpanded = true,
        confirmValueChange = { it != SheetValue.Hidden || !busy }
    )
    ModalBottomSheet(onDismissRequest = { if (!busy) close() }, sheetState = sheet) {
        Column(
            Modifier.fillMaxWidth().imePadding().verticalScroll(rememberScrollState()).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(if (isGate) "Verify pass" else "Visitor pass", style = MaterialTheme.typography.headlineSmall)
            if (isGate) VerifyPass(token, busy, { busy = it }, close)
            else CreatePass(token, busy, { busy = it }, close)
        }
    }
}

@Composable
private fun ActionField(
    label: String, value: String, change: (String) -> Unit,
    enabled: Boolean = true, keyboardType: KeyboardType = KeyboardType.Text
) {
    OutlinedTextField(value, change, Modifier.fillMaxWidth(), enabled = enabled, singleLine = true,
        label = { Text(label) }, keyboardOptions = KeyboardOptions(keyboardType = keyboardType))
}

@Composable
private fun CreatePass(token: String, busy: Boolean, setBusy: (Boolean) -> Unit, close: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var type by remember { mutableStateOf("guest") }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var company by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var from by remember { mutableStateOf(communityToday()) }
    var to by remember { mutableStateOf(from) }
    var recurring by remember { mutableStateOf(false) }
    var hold by remember { mutableStateOf(false) }
    var code by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val issued = code
    if (issued != null) {
        Text("Ready to share", style = MaterialTheme.typography.titleMedium)
        Text(issued, style = MaterialTheme.typography.displaySmall)
        Button(onClick = {
            val intent = Intent(Intent.ACTION_SEND).setType("text/plain")
                .putExtra(Intent.EXTRA_TEXT, "Your Nivaasa entry code is $issued. Show it at the gate.")
            context.startActivity(Intent.createChooser(intent, "Share entry code"))
        }) { Text("Share entry code") }
        TextButton(onClick = close) { Text("Done") }
        return
    }
    val range = type == "guest" || (type == "cab" && recurring)
    var typeMenu by remember { mutableStateOf(false) }
    Box {
        OutlinedButton(onClick = { typeMenu = true }, enabled = !busy) {
            Text("Visitor type · ${type.replaceFirstChar { it.uppercaseChar() }}")
        }
        DropdownMenu(expanded = typeMenu, onDismissRequest = { typeMenu = false }) {
            listOf("guest", "delivery", "cab", "vendor").forEach { option ->
                DropdownMenuItem(text = { Text(option.replaceFirstChar { it.uppercaseChar() }) }, onClick = {
                    type = option
                    typeMenu = false
                })
            }
        }
    }
    if (type == "guest") {
        ActionField("Guest name", name, { name = it }, !busy)
        ActionField("Phone number (optional)", phone, { phone = it }, !busy, KeyboardType.Phone)
    } else {
        ActionField("Company or platform (optional)", company, { company = it }, !busy)
        Text("Security will collect their details at the gate.", style = MaterialTheme.typography.bodySmall)
    }
    if (type == "cab") ToggleRow("Daily pickup", recurring, !busy) { recurring = it }
    if (type == "delivery") ToggleRow("Allow leave at gate", hold, !busy) { hold = it }

    DateField(if (range) "Valid from" else "Visit date", from, communityToday(), null, !busy) {
        from = it
        to = to.coerceIn(from, from.plusDays(29))
    }
    if (range) {
        DateField("Valid through", to, from, from.plusDays(29), !busy) { to = it }
        var presets by remember { mutableStateOf(false) }
        Box {
            TextButton(onClick = { presets = true }, enabled = !busy) { Text("Date presets") }
            DropdownMenu(expanded = presets, onDismissRequest = { presets = false }) {
                listOf("Today", "Tomorrow", "Next 7 days").forEachIndexed { index, title ->
                    DropdownMenuItem(text = { Text(title) }, onClick = {
                        from = communityToday().plusDays(if (index == 1) 1 else 0)
                        to = from.plusDays(if (index == 2) 6 else 0)
                        presets = false
                    })
                }
            }
        }
    }
    ActionField("Gate notes (optional)", notes, { notes = it }, !busy)
    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
    Button(
        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
        enabled = !busy && (type != "guest" || name.isNotBlank()),
        onClick = {
            scope.launch {
                setBusy(true)
                error = null
                try {
                    val body = JSONObject().put("type", type).put("validFrom", from.toString())
                        .put("validTo", (if (range) to else from).toString()).put("notes", notes)
                    if (type == "guest") body.put("name", name).put("phone", phone) else body.put("company", company)
                    if (type == "cab") body.put("recurringCab", recurring)
                    if (type == "delivery") body.put("leaveAtGate", hold)
                    code = Api.request("mobile/preapprove", token, body).getString("code")
                } catch (cancelled: CancellationException) {
                    throw cancelled
                } catch (failure: Exception) {
                    error = failure.localizedMessage ?: "Could not create the pass."
                } finally { setBusy(false) }
            }
        }
    ) { Text(if (busy) "Creating…" else "Create pass") }
}

@Composable
private fun ToggleRow(label: String, checked: Boolean, enabled: Boolean, change: (Boolean) -> Unit) {
    ListItem(headlineContent = { Text(label) }, trailingContent = {
        Switch(checked, change, enabled = enabled,
            modifier = Modifier.padding(start = 8.dp))
    })
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun DateField(label: String, value: LocalDate, min: LocalDate, max: LocalDate?, enabled: Boolean, change: (LocalDate) -> Unit) {
    var open by remember { mutableStateOf(false) }
    OutlinedButton(onClick = { open = true }, enabled = enabled, modifier = Modifier.fillMaxWidth()) {
        Text("$label · ${value.format(java.time.format.DateTimeFormatter.ofLocalizedDate(java.time.format.FormatStyle.MEDIUM))}")
    }
    if (open) {
        val state = rememberDatePickerState(
            initialSelectedDateMillis = value.toEpochDay() * 86_400_000,
            selectableDates = object : SelectableDates {
                override fun isSelectableDate(utcTimeMillis: Long): Boolean {
                    val day = LocalDate.ofEpochDay(utcTimeMillis / 86_400_000)
                    return day >= min && (max == null || day <= max)
                }
            }
        )
        DatePickerDialog(
            onDismissRequest = { open = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { change(LocalDate.ofEpochDay(it / 86_400_000)) }
                    open = false
                }) { Text("Apply") }
            },
            dismissButton = { TextButton(onClick = { open = false }) { Text("Cancel") } }
        ) { DatePicker(state = state) }
    }
}

@Composable
private fun VerifyPass(token: String, busy: Boolean, setBusy: (Boolean) -> Unit, close: () -> Unit) {
    val scope = rememberCoroutineScope()
    var code by remember { mutableStateOf("") }
    var matches by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var selected by remember { mutableStateOf<JSONObject?>(null) }
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var plate by remember { mutableStateOf("") }
    var result by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    val success = result
    if (success != null) {
        Text(success, style = MaterialTheme.typography.titleMedium)
        Button(onClick = close) { Text("Done") }
        return
    }

    fun submit(failureMessage: String, action: suspend () -> Unit) {
        scope.launch {
            setBusy(true)
            error = null
            try { action() }
            catch (cancelled: CancellationException) { throw cancelled }
            catch (failure: Exception) { error = failure.localizedMessage ?: failureMessage }
            finally { setBusy(false) }
        }
    }

    ActionField("6-digit entry code", code, {
        code = it.filter { digit -> digit in '0'..'9' }.take(6)
        selected = null
        matches = emptyList()
        error = null
    }, !busy, KeyboardType.Number)
    OutlinedButton(enabled = !busy && code.length == 6, onClick = {
        selected = null
        matches = emptyList()
        submit("Could not find the pass.") {
            val list = Api.request("gate/search?q=$code", token).getJSONArray("passes")
            matches = (0 until list.length()).map { list.getJSONObject(it) }
            selected = matches.singleOrNull()
            if (matches.isEmpty()) error = "No active pass matches this code."
        }
    }) { Text("Find pass") }
    if (matches.size > 1) {
        Text("Choose the visitor’s home", style = MaterialTheme.typography.titleMedium)
        matches.forEach { match ->
            OutlinedButton(enabled = !busy, onClick = { selected = match }) { Text("Home ${match.getString("unit")}") }
        }
    }
    selected?.let { match ->
        val type = match.getString("type")
        Text("${match.getString("name")} · Home ${match.getString("unit")}", style = MaterialTheme.typography.titleMedium)
        if (!match.isNull("notes")) Text(match.getString("notes"))
        if (type != "guest") {
            ActionField("Visitor name", name, { name = it }, !busy)
            ActionField("Phone number", phone, { phone = it }, !busy, KeyboardType.Phone)
        }
        if (type == "cab") ActionField("Cab registration", plate, { plate = it }, !busy)
        Button(
            enabled = !busy && (type == "guest" || (name.isNotBlank() && phone.isNotBlank())) && (type != "cab" || plate.isNotBlank()),
            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            onClick = {
                submit("Could not record the arrival.") {
                    val body = JSONObject().put("type", type).put("unitId", match.getString("unitId")).put("code", code)
                        .put("name", name).put("phone", phone).put("vehicleNo", plate)
                    val entry = Api.request("gate/entry", token, body)
                    result = if (entry.getString("status") == "left_at_gate") "Parcel recorded at the gate."
                        else "${entry.getString("name")} checked in."
                }
            }
        ) { Text(if (match.optBoolean("leaveAtGate")) "Record parcel at gate" else "Record arrival") }
    }
    if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
    error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
}
