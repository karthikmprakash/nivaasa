// Send a realistic visitor-gate APNs payload to a booted iOS simulator.
// Simulator push bypasses APNs, so it works without a paid Apple Developer team.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const Database = require('better-sqlite3');

const root = path.resolve(__dirname, '..');
const db = new Database(path.join(root, 'data/nivaasa.db'), { readonly: true });
const row = db.prepare(`
  select v.id, v.name, v.company, v.purpose, v.notes, v.phone, v.photo_color, v.type, u.number
  from visitors v left join units u on v.unit_id = u.id
  where v.status = 'pending'
  order by v.created_at desc limit 1
`).get();
db.close();

const visitor = row ?? {
  id: 'preview',
  name: 'Yash Sharma',
  company: 'Swiggy',
  purpose: 'Food delivery',
  notes: '2 bags — order #SW-884211',
  phone: '+91 98765 44332',
  photo_color: '#fde8ef',
  type: 'delivery',
  number: 'A-402',
};
const payload = {
  'Simulator Target Bundle': 'app.nivaasa.community',
  aps: {
    alert: {
      title: `${visitor.name} is at the gate`,
      subtitle: `${visitor.company ? `${visitor.company} · ` : ''}Home ${visitor.number ?? 'A-402'}`,
      body: [visitor.purpose, visitor.notes].filter(Boolean).join(' · '),
    },
    sound: 'default',
    category: 'VISITOR_AT_GATE',
    'thread-id': `visitor-${visitor.id}`,
    'mutable-content': 1,
    'relevance-score': 1,
  },
  visitorId: visitor.id,
  visitorName: visitor.name,
  photoColor: visitor.photo_color ?? '#3155f8',
  unitNumber: visitor.number ?? 'A-402',
  visitorType: visitor.type,
  company: visitor.company ?? '',
  purpose: visitor.purpose ?? '',
  imageUrl: 'http://localhost:3100/platforms/zomato.png',
  callPhone: visitor.phone ?? '',
};
const file = path.join(process.env.NIVAASA_TEST_ROOT ?? '/private/var/folders/jj/jxlxftbx0ln144_vqrh2wyvm0000gn/T/opencode', 'visitor-gate.apns');
fs.writeFileSync(file, JSON.stringify(payload, null, 2));
execFileSync('xcrun', ['simctl', 'push', process.env.SIMULATOR_ID ?? 'booted', file], { stdio: 'inherit' });
console.log(`Pushed ${visitor.name} from ${visitor.company ?? visitor.type} to Home ${visitor.number ?? 'A-402'}.`);
