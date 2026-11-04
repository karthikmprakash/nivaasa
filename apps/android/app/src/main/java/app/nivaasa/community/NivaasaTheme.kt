package app.nivaasa.community

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

internal val BrandBlue = Color(0xFF3155D8)

object NK {
    val canvas = Color(0xFFF5F6F8)
    val surface = Color.White
    val ink = Color(0xFF131A2A)
    val inkSoft = Color(0xFF4B566C)
    val muted = Color(0xFF626E82)
    val line = Color(0xFFE3E7EE)
    val lineStrong = Color(0xFFCBD2DF)
    val brand50 = Color(0xFFF2F5FF)
    val brand100 = Color(0xFFE7EDFF)
    val brand200 = Color(0xFFCFDBFF)
    val brand500 = Color(0xFF4F70E8)
    val brand600 = Color(0xFF3155D8)
    val brand700 = Color(0xFF2643B8)
    val blush50 = Color(0xFFFFF5F8)
    val blush100 = Color(0xFFFDEAF0)
    val blush200 = Color(0xFFFBD2DF)
    val blush400 = Color(0xFFEF7FA4)
    val blush500 = Color(0xFFE55D8B)
    val blush700 = Color(0xFFA82E5B)
    val mint50 = Color(0xFFEEFAF4)
    val mint600 = Color(0xFF18764E)
    val amberSoft = Color(0xFFFFF6E2)
    val amberInk = Color(0xFF87530E)
    val danger = Color(0xFFD94A5A)
    val dangerSoft = Color(0xFFFDECED)
    val dangerInk = Color(0xFFC43D4D)
}

val Jakarta = FontFamily(
    Font(R.font.jakarta_regular, FontWeight.Normal),
    Font(R.font.jakarta_medium, FontWeight.Medium),
    Font(R.font.jakarta_semibold, FontWeight.SemiBold),
    Font(R.font.jakarta_bold, FontWeight.Bold),
    Font(R.font.jakarta_extra_bold, FontWeight.ExtraBold),
)

val NivaasaTypography = Typography(
    headlineLarge = TextStyle(fontFamily = Jakarta, fontWeight = FontWeight.SemiBold, fontSize = 29.sp, lineHeight = 34.sp, letterSpacing = (-0.8).sp),
    headlineMedium = TextStyle(fontFamily = Jakarta, fontWeight = FontWeight.SemiBold, fontSize = 26.sp, lineHeight = 31.sp, letterSpacing = (-0.6).sp),
    titleLarge = TextStyle(fontFamily = Jakarta, fontWeight = FontWeight.SemiBold, fontSize = 17.sp, lineHeight = 24.sp),
    titleMedium = TextStyle(fontFamily = Jakarta, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, lineHeight = 21.sp),
    bodyLarge = TextStyle(fontFamily = Jakarta, fontWeight = FontWeight.Normal, fontSize = 15.sp, lineHeight = 23.sp),
    bodyMedium = TextStyle(fontFamily = Jakarta, fontWeight = FontWeight.Normal, fontSize = 13.sp, lineHeight = 19.sp),
    labelLarge = TextStyle(fontFamily = Jakarta, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, lineHeight = 18.sp),
    labelMedium = TextStyle(fontFamily = Jakarta, fontWeight = FontWeight.Bold, fontSize = 11.sp, lineHeight = 15.sp, letterSpacing = 1.4.sp),
    labelSmall = TextStyle(fontFamily = Jakarta, fontWeight = FontWeight.Medium, fontSize = 11.sp, lineHeight = 15.sp),
)

@Composable
fun NivaasaTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = NK.brand600,
            onPrimary = Color.White,
            primaryContainer = NK.brand50,
            onPrimaryContainer = NK.brand700,
            background = NK.canvas,
            onBackground = NK.ink,
            surface = NK.surface,
            onSurface = NK.ink,
            surfaceVariant = NK.canvas,
            onSurfaceVariant = NK.muted,
            outline = NK.line,
            outlineVariant = NK.line,
            tertiary = NK.blush700,
            tertiaryContainer = NK.blush50,
            onTertiaryContainer = NK.blush700,
            error = NK.danger,
            errorContainer = NK.dangerSoft,
            onErrorContainer = NK.dangerInk,
        ),
        typography = NivaasaTypography,
        content = content,
    )
}

@Composable
fun AppWash(content: @Composable BoxScope.() -> Unit) {
    Box(
        Modifier.fillMaxSize().background(
            Brush.radialGradient(
                colors = listOf(NK.blush400.copy(alpha = 0.12f), Color.Transparent),
                radius = 1100f,
            )
        ).background(NK.brand500.copy(alpha = 0.05f)),
        content = content,
    )
}

@Composable
fun Eyebrow(text: String, modifier: Modifier = Modifier) {
    Text(text.uppercase(), color = NK.blush700, style = MaterialTheme.typography.labelMedium, modifier = modifier)
}

@Composable
fun NivaasaCard(
    modifier: Modifier = Modifier,
    tinted: Boolean = false,
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = NK.surface,
        border = BorderStroke(1.dp, if (tinted) NK.blush200.copy(alpha = 0.8f) else NK.line),
    ) {
        Column(
            Modifier.background(
                if (tinted) Brush.linearGradient(listOf(NK.brand50, NK.surface, NK.blush50)) else Brush.linearGradient(listOf(NK.surface, NK.surface))
            ).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(9.dp),
            content = content,
        )
    }
}

@Composable
fun PrimaryButton(title: String, icon: ImageVector? = null, enabled: Boolean = true, run: () -> Unit) {
    Button(
        onClick = run,
        enabled = enabled,
        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(containerColor = NK.brand600, contentColor = Color.White),
    ) {
        if (icon != null) {
            Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
        }
        Text(title, style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
fun SoftButton(title: String, icon: ImageVector? = null, run: () -> Unit) {
    Button(
        onClick = run,
        modifier = Modifier.fillMaxWidth().heightIn(min = 46.dp),
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(containerColor = NK.dangerSoft, contentColor = NK.dangerInk),
    ) {
        if (icon != null) { Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)) }
        Text(title, style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
fun OutlineButton(title: String, icon: ImageVector? = null, run: () -> Unit) {
    OutlinedButton(
        onClick = run,
        modifier = Modifier.fillMaxWidth().heightIn(min = 46.dp),
        shape = RoundedCornerShape(10.dp),
        border = BorderStroke(1.dp, NK.lineStrong),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = NK.inkSoft),
    ) {
        if (icon != null) { Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)) }
        Text(title, style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
fun NivaasaBadge(text: String, tone: BadgeTone = BadgeTone.Neutral, dot: Boolean = false) {
    val (bg, fg) = when (tone) {
        BadgeTone.Blue -> NK.brand50 to NK.brand700
        BadgeTone.Pink -> NK.blush100 to NK.blush700
        BadgeTone.Amber -> NK.amberSoft to NK.amberInk
        BadgeTone.Mint -> NK.mint50 to NK.mint600
        BadgeTone.Danger -> NK.dangerSoft to NK.dangerInk
        BadgeTone.Neutral -> NK.canvas to NK.muted
    }
    Row(
        Modifier.background(bg, RoundedCornerShape(7.dp)).padding(horizontal = 9.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        if (dot) Box(Modifier.size(5.dp).background(fg, CircleShape))
        Text(text, color = fg, style = MaterialTheme.typography.labelLarge)
    }
}

enum class BadgeTone { Blue, Pink, Amber, Mint, Danger, Neutral }

@Composable
fun NivaasaAvatar(name: String, color: Color = NK.brand600, size: Int = 40) {
    val fg = if ((color.red * 0.2126f + color.green * 0.7152f + color.blue * 0.0722f) > 0.62f) NK.ink else Color.White
    Box(Modifier.size(size.dp).background(color, CircleShape), contentAlignment = Alignment.Center) {
        Text(initials(name), color = fg, style = MaterialTheme.typography.labelLarge)
    }
}

@Composable
fun StatCard(label: String, value: String, hint: String? = null, tone: StatTone = StatTone.Neutral, icon: ImageVector? = null) {
    val bg = if (tone == StatTone.Pink) Brush.linearGradient(listOf(NK.blush50, NK.surface, NK.brand50.copy(alpha = 0.5f))) else Brush.linearGradient(listOf(NK.surface, NK.surface))
    val border = when (tone) {
        StatTone.Blue -> NK.brand100
        StatTone.Pink -> NK.blush200
        StatTone.Green -> NK.mint600.copy(alpha = 0.15f)
        StatTone.Amber -> NK.amberInk.copy(alpha = 0.15f)
        StatTone.Neutral -> NK.line
    }
    Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp), color = NK.surface, border = BorderStroke(1.dp, border)) {
        Column(Modifier.background(bg).padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                Text(label, color = NK.inkSoft, style = MaterialTheme.typography.bodyLarge)
                if (icon != null) Icon(icon, contentDescription = null, tint = when (tone) {
                    StatTone.Blue -> NK.brand500
                    StatTone.Pink -> NK.blush500
                    StatTone.Green -> NK.mint600
                    StatTone.Amber -> NK.amberInk
                    else -> NK.muted
                }, modifier = Modifier.size(18.dp))
            }
            Text(value, color = NK.ink, style = MaterialTheme.typography.headlineMedium)
            if (hint != null) Text(hint, color = NK.muted, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

enum class StatTone { Neutral, Blue, Pink, Green, Amber }

@Composable
fun NivaasaTopBar(
    unread: Int,
    userName: String,
    onMenu: () -> Unit,
    onSearch: () -> Unit,
    onNotifications: () -> Unit,
    onAccount: () -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().height(76.dp).background(NK.surface).padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        IconButton(onClick = onMenu) { Icon(Icons.Outlined.Menu, contentDescription = "Open navigation", tint = NK.inkSoft) }
        Image(painterResource(R.drawable.nivaasa_mark), contentDescription = "Nivaasa", modifier = Modifier.size(32.dp))
        Spacer(Modifier.weight(1f))
        IconButton(onClick = onSearch) { Icon(Icons.Outlined.Search, contentDescription = "Search community", tint = NK.inkSoft) }
        Box {
            IconButton(onClick = onNotifications) { Icon(Icons.Outlined.Notifications, contentDescription = if (unread > 0) "Notifications, $unread unread" else "Notifications", tint = NK.inkSoft) }
            if (unread > 0) {
                Box(Modifier.align(Alignment.TopEnd).padding(top = 4.dp, end = 2.dp).background(NK.brand600, CircleShape).padding(horizontal = 5.dp, vertical = 1.dp)) {
                    Text(if (unread > 9) "9+" else "$unread", color = Color.White, style = MaterialTheme.typography.labelSmall)
                }
            }
        }
        IconButton(onClick = onAccount) { NivaasaAvatar(userName, size = 36) }
    }
    HorizontalDivider(color = NK.line, thickness = 1.dp)
}

@Composable
fun NivaasaBottomBar(tabs: List<Triple<String, ImageVector, String>>, selection: String, onSelect: (String) -> Unit) {
    Row(Modifier.fillMaxWidth().background(NK.surface)) {
        tabs.forEach { (title, icon, label) ->
            val active = selection == title
            Column(
                Modifier.weight(1f).heightIn(min = 64.dp).clickable { onSelect(title) }.padding(vertical = 7.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Icon(icon, contentDescription = label, tint = if (active) NK.brand700 else NK.muted, modifier = Modifier.size(22.dp))
                Text(label, color = if (active) NK.brand700 else NK.muted, style = MaterialTheme.typography.labelSmall, fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium)
            }
        }
    }
    HorizontalDivider(color = NK.line, thickness = 1.dp)
}

@Composable
fun SectionHeading(title: String, action: String? = null, run: (() -> Unit)? = null) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(title, style = MaterialTheme.typography.titleLarge, color = NK.ink)
        if (action != null && run != null) {
            TextButton(onClick = run) { Text(action, color = NK.brand700, style = MaterialTheme.typography.labelLarge) }
        }
    }
}

@Composable
fun TabStrip(tabs: List<String>, selection: String, onSelect: (String) -> Unit) {
    Row(Modifier.fillMaxWidth().horizontalScroll(androidx.compose.foundation.rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        tabs.forEach { tab ->
            val active = tab == selection
            Surface(
                onClick = { onSelect(tab) },
                shape = RoundedCornerShape(999.dp),
                color = if (active) NK.brand600 else NK.surface,
                border = if (active) null else BorderStroke(1.dp, NK.line),
            ) {
                Text(tab, color = if (active) Color.White else NK.inkSoft, style = MaterialTheme.typography.labelLarge,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp))
            }
        }
    }
}

private fun initials(name: String) = name.split(" ").filter(String::isNotBlank).take(2).map { it.first() }.joinToString("")
