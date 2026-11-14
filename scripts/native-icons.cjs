// Reproduce the web's Lucide artwork in the iOS asset catalogue, at 3x.
// The files are templates: SwiftUI supplies the semantic colour and point size.
const fs = require('node:fs');
const path = require('node:path');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const icons = require('lucide-react');
const sharp = require('sharp');
const root = path.resolve(__dirname, '../apps/ios/Nivaasa/Assets.xcassets');
const map = {
  house: 'House', newspaper: 'Newspaper', 'wallet.bifold': 'Wallet',
  'person.crop.circle.badge.checkmark': 'UserRoundCheck', 'line.3.horizontal': 'Menu',
  'wrench.and.screwdriver': 'Wrench', 'building.2': 'Building2', 'book.closed': 'BookUser',
  'doc.text': 'FileText', calendar: 'CalendarDays', 'gearshape': 'Settings',
  'exclamationmark.shield': 'ShieldAlert', 'exclamationmark.shield.fill': 'ShieldAlert',
  'shield.lefthalf.filled': 'ShieldCheck', 'checkmark.shield': 'ShieldCheck',
  bell: 'Bell', magnifyingglass: 'Search', 'text.magnifyingglass': 'Search',
  'chevron.right': 'ChevronRight', 'chevron.down': 'ChevronDown', 'chevron.left': 'ChevronLeft',
  xmark: 'X', checkmark: 'Check', 'checkmark.circle': 'CircleCheck', 'checkmark.circle.fill': 'CircleCheck',
  circle: 'Circle', 'person.badge.plus': 'UserRoundPlus', shippingbox: 'PackageOpen',
  'rectangle.portrait.and.arrow.right': 'LogOut', 'arrow.right': 'ArrowRight',
  'arrow.left': 'ArrowLeft', 'arrow.down.circle': 'ArrowDownToLine',
  heart: 'Heart', message: 'MessageCircle', eye: 'Eye', 'eye.slash': 'EyeOff', clock: 'Clock3',
  'doc.on.doc': 'Copy', 'square.grid.2x2': 'LayoutGrid', 'chart.bar': 'ChartNoAxesCombined',
  'chart.bar.xaxis': 'LayoutDashboard', 'ellipsis.circle': 'Ellipsis',
  'indianrupee.circle': 'IndianRupee', 'door.left.hand.open': 'DoorOpen',
  'qrcode.viewfinder': 'KeyRound', 'scan.qr.code': 'ScanQrCode', 'camera': 'Camera', 'paperplane': 'Send', 'map': 'MapPin',
  party: 'PartyPopper', waves: 'Waves', dumbbell: 'Dumbbell', trophy: 'Trophy', activity: 'Activity',
  bed: 'BedDouble', flower: 'Flower2', laptop: 'Laptop',
  droplets: 'Droplets', lightbulb: 'Lightbulb', 'arrow.up.down': 'ArrowUpDown', 'shield.check': 'ShieldCheck',
  package: 'Package', wifi: 'Wifi',
  pin: 'Pin', plus: 'Plus', key: 'KeyRound', 'person.2': 'Users',
  car: 'Car', pawprint: 'PawPrint', 'phone': 'Phone', 'lock': 'LockKeyhole',
  'sparkles': 'Sparkles', 'creditcard': 'CreditCard', 'tray': 'Receipt',
  'ticket': 'Ticket', 'star': 'Star', 'calendarheart': 'CalendarHeart',
};
(async () => {
  for (const [key, icon] of Object.entries(map)) {
    if (!icons[icon]) throw new Error(`Unknown Lucide icon: ${icon}`);
    const directory = path.join(root, `Lucide-${key}.imageset`);
    fs.mkdirSync(directory, { recursive: true });
    const svg = renderToStaticMarkup(React.createElement(icons[icon], { size: 24, strokeWidth: 1.8, color: '#000' }));
    await sharp(Buffer.from(svg)).resize(72, 72).png().toFile(path.join(directory, 'icon@3x.png'));
    fs.writeFileSync(path.join(directory, 'Contents.json'), JSON.stringify({
      images: [{ filename: 'icon@3x.png', idiom: 'universal', scale: '3x' }],
      info: { author: 'xcode', version: 1 }, properties: { 'template-rendering-intent': 'template' },
    }, null, 2) + '\n');
  }
  fs.copyFileSync(path.resolve(__dirname, '../node_modules/lucide-react/LICENSE'), path.join(root, '../Lucide-LICENSE.txt'));
  console.log(`Generated ${Object.keys(map).length} Lucide template assets.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
