package app.nivaasa.community

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material.icons.outlined.Build
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.vectorResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties

internal data class VisitorPlatform(val name: String, val logo: Int, val category: String)
internal val visitorPlatforms = listOf(
    VisitorPlatform("Swiggy", R.drawable.platform_swiggy, "Food"),
    VisitorPlatform("Zomato", R.drawable.platform_zomato, "Food"),
    VisitorPlatform("Instamart", R.drawable.platform_instamart, "Groceries"),
    VisitorPlatform("Blinkit", R.drawable.platform_blinkit, "Groceries"),
    VisitorPlatform("Zepto", R.drawable.platform_zepto, "Groceries"),
    VisitorPlatform("bigbasket", R.drawable.platform_bigbasket, "Groceries"),
    VisitorPlatform("Amazon", R.drawable.platform_amazon, "Shopping"),
    VisitorPlatform("Flipkart", R.drawable.platform_flipkart, "Shopping"),
    VisitorPlatform("Meesho", R.drawable.platform_meesho, "Shopping"),
    VisitorPlatform("Myntra", R.drawable.platform_myntra, "Shopping"),
    VisitorPlatform("Delhivery", R.drawable.platform_delhivery, "Courier"),
    VisitorPlatform("Blue Dart", R.drawable.platform_bluedart, "Courier"),
    VisitorPlatform("DTDC", R.drawable.platform_dtdc, "Courier"),
    VisitorPlatform("Uber", R.drawable.platform_uber, "Cab & auto"),
    VisitorPlatform("Ola", R.drawable.platform_ola, "Cab & auto"),
    VisitorPlatform("Rapido", R.drawable.platform_rapido, "Cab & auto"),
    VisitorPlatform("Namma Yatri", R.drawable.platform_nammayatri, "Cab & auto"),
)

@Composable
internal fun ProviderLogo(name: String) {
    val provider = visitorPlatforms.firstOrNull { it.name == name }
    Surface(color = androidx.compose.ui.graphics.Color.White, shape = androidx.compose.foundation.shape.RoundedCornerShape(10.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant), modifier = Modifier.size(42.dp)) {
        Box(Modifier.padding(6.dp), contentAlignment = Alignment.Center) {
            if (provider != null) Image(painterResource(provider.logo), contentDescription = null, modifier = Modifier.fillMaxSize())
            else Icon(Icons.Outlined.Build, contentDescription = null, tint = androidx.compose.ui.graphics.Color(0xFF626E82))
        }
    }
}

@Composable
internal fun ProviderPicker(type: String, selection: String, choose: (String) -> Unit, close: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var custom by remember { mutableStateOf("") }
    var adding by remember { mutableStateOf(false) }
    val filtered = visitorPlatforms.filter {
        (it.category == "Cab & auto") == (type == "cab") &&
            (it.name + " " + it.category).contains(query.trim(), ignoreCase = true)
    }
    Dialog(onDismissRequest = close, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(Modifier.padding(16.dp).widthIn(max = 600.dp).fillMaxWidth().fillMaxHeight(0.90f),
            shape = androidx.compose.foundation.shape.RoundedCornerShape(20.dp)) {
            Column(Modifier.padding(16.dp).imePadding()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(if (type == "cab") "Choose cab service" else "Choose delivery platform",
                        modifier = Modifier.weight(1f), style = MaterialTheme.typography.titleLarge)
                    TextButton(onClick = close) { Text("Close") }
                }
                Text("Choose a provider or add another by name.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(query, { query = it }, label = { Text("Search platforms") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                if (adding) {
                    OutlinedTextField(custom, { custom = it.take(100) }, label = { Text("Platform or company name") },
                        singleLine = true, modifier = Modifier.fillMaxWidth())
                    Button(onClick = { choose(custom.trim()) }, enabled = custom.isNotBlank(), modifier = Modifier.fillMaxWidth()) {
                        Text("Use this platform")
                    }
                } else {
                    TextButton(onClick = {
                        custom = query.ifBlank { selection.takeUnless { value -> visitorPlatforms.any { it.name == value } }.orEmpty() }
                        adding = true
                    }) { Text("Add another platform") }
                }
                if (selection.isNotBlank()) TextButton(onClick = { choose("") }) { Text("Clear selection") }
                if (filtered.isEmpty()) Text("No matching platforms. Add another platform above.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                LazyVerticalGrid(columns = GridCells.Adaptive(132.dp), modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(filtered, key = { it.name }) { platform ->
                        val active = selection == platform.name
                        OutlinedCard(onClick = { choose(platform.name) },
                            modifier = Modifier.semantics { role = Role.RadioButton; selected = active },
                            border = BorderStroke(1.dp, if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant),
                            colors = CardDefaults.outlinedCardColors(containerColor = if (active) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface)) {
                            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                    ProviderLogo(platform.name)
                                    Spacer(Modifier.weight(1f))
                                    if (active) Icon(Icons.Outlined.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                                }
                                Text(platform.name, style = MaterialTheme.typography.titleMedium)
                                Text(platform.category, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun VisitorTypeCards(type: String, enabled: Boolean, change: (String) -> Unit) {
    Text("Who’s coming?", style = MaterialTheme.typography.titleMedium)
    BoxWithConstraints {
        val availableWidth = maxWidth
        val cardWidth = if (availableWidth < 300.dp) availableWidth else (availableWidth - 10.dp) / 2
        FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            listOf("guest" to "Friends & family", "delivery" to "Food & parcels", "cab" to "Pickup & drop-off", "vendor" to "Repairs & services", "daily_help" to "Household staff").forEach { (value, detail) ->
                val active = type == value
                val icon: ImageVector = when (value) {
                    "guest" -> Icons.Outlined.Person
                    "delivery" -> ImageVector.vectorResource(R.drawable.ic_delivery)
                    "cab" -> ImageVector.vectorResource(R.drawable.ic_cab)
                    "daily_help" -> Icons.Outlined.Star
                    else -> Icons.Outlined.Build
                }
                OutlinedCard(onClick = { if (enabled) change(value) }, enabled = enabled,
                    modifier = Modifier.width(if (value == "daily_help") availableWidth else cardWidth).semantics { role = Role.RadioButton; selected = active },
                    border = BorderStroke(1.dp, if (active) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant),
                    colors = CardDefaults.outlinedCardColors(containerColor = if (active) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surface)) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(Modifier.fillMaxWidth()) {
                            Icon(icon, contentDescription = null, modifier = Modifier.size(24.dp), tint = MaterialTheme.colorScheme.primary)
                            Spacer(Modifier.weight(1f))
                            if (active) Icon(Icons.Outlined.Check, contentDescription = null, modifier = Modifier.size(18.dp))
                        }
                        Text(if (value == "daily_help") "Daily help" else value.replaceFirstChar { it.uppercaseChar() }, style = MaterialTheme.typography.titleMedium)
                        Text(detail, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}
