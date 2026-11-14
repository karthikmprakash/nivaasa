// Black-box checks against a production build and a disposable SQLite backup.
// Never accepts a remote base URL or writes to the source database.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { mkdtempSync, createWriteStream } = require('node:fs');
const { tmpdir } = require('node:os');
const { createHmac } = require('node:crypto');
const path = require('node:path');
const Database = require('better-sqlite3');

async function main() {
  const root = path.resolve(__dirname, '..');
  const directory = mkdtempSync(path.join(process.env.NIVAASA_TEST_ROOT ?? tmpdir(), 'nivaasa-api-'));
  const databasePath = path.join(directory, 'fixture.db');
  const source = new Database(path.join(root, 'data/nivaasa.db'), { readonly: true });
  await source.backup(databasePath);
  source.close();
  const db = new Database(databasePath);
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'start', '--port', '3101', '--hostname', '127.0.0.1'], {
    cwd: path.join(root, 'apps/web'),
    env: { ...process.env, DATABASE_PATH: databasePath, NIVAASA_UPLOADS_DIR: path.join(directory, 'uploads'), PUSH_IMAGE_SECRET: 'isolated-photo-signing-test-key', NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const log = createWriteStream(path.join(directory, 'server.log'));
  server.stdout.pipe(log);
  server.stderr.pipe(log);
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Test server did not start within 30s')), 30_000);
      const ready = chunk => {
        if (chunk.toString().includes('Ready in')) { clearTimeout(timeout); server.stdout.off('data', ready); resolve(); }
      };
      server.stdout.on('data', ready);
      server.once('error', error => { clearTimeout(timeout); reject(error); });
      server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Test server exited: ${code}. See ${directory}/server.log`)); });
    });
    const request = async (route, { token, body, cookie, raw } = {}) => {
      const response = await fetch('http://127.0.0.1:3101/api/' + route, {
        method: body !== undefined || raw !== undefined ? 'POST' : 'GET',
        headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': 'application/json' },
        body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
      });
      return { status: response.status, data: await response.json() };
    };
    const multipart = async (route, token, fields, photo) => {
      const form = new FormData();
      for (const [key, value] of Object.entries(fields)) form.set(key, String(value));
      form.set('photo', new Blob([photo.bytes], { type: photo.type }), photo.name);
      const response = await fetch('http://127.0.0.1:3101/api/' + route, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: form,
      });
      return { status: response.status, data: await response.json() };
    };
    const login = async email => {
      const result = await request('auth/login', { body: { email: email + '@nivaasa.app', password: 'demo1234' } });
      assert.equal(result.status, 200, `Login failed for fixture persona ${email}`);
      return result.data;
    };
    const resident = await login('resident');
    const tenant = await login('meera');
    const guard = await login('guard');
    const security = await login('security');
    const token = resident.token;
    const userId = resident.user.id;
    const societyId = resident.membership.societyId;
    const unitId = resident.membership.unitId;

    await test('mobile endpoints reject missing and invalid authentication', async () => {
      for (const route of ['mobile/home', 'mobile/more', 'mobile/payments', 'mobile/emergency']) {
        assert.equal((await request(route)).status, 401, route);
        assert.equal((await request(route, { token: 'invalid-test-token' })).status, 401, route);
      }
      for (const route of ['mobile/settings', 'mobile/discussions', 'mobile/emergency', 'mobile/daily-help', 'mobile/visitors/cancel']) {
        assert.equal((await request(route, { body: {} })).status, 401, route);
        assert.equal((await request(route, { token: guard.token, body: {} })).status, 403, route);
      }
    });
    await test('mobile reads stay inside the active society, unit and document audience', async () => {
      const more = await request('mobile/more', { token });
      assert.equal(more.status, 200);
      assert.equal(more.data.household.unit.id, unitId);
      for (const key of ['vehicles', 'pets', 'help', 'moves']) {
        for (const record of more.data.household[key]) { assert.equal(record.unitId, unitId); assert.equal(record.societyId, societyId); }
      }
      for (const note of more.data.notifications) { assert.equal(note.userId, userId); assert.equal(note.societyId, societyId); }
      for (const delivery of more.data.deliveries) { assert.equal(delivery.unitId, unitId); assert.equal(delivery.societyId, societyId); }
      assert.equal(more.data.unread, db.prepare('select count(*) n from notifications where user_id=? and society_id=? and read_at is null').get(userId, societyId).n);
      for (const doc of more.data.documents) { assert.equal(doc.societyId, societyId); assert.notEqual(doc.visibility, 'committee'); }
      const tenantMore = await request('mobile/more', { token: tenant.token });
      for (const doc of tenantMore.data.documents) assert.equal(doc.visibility, 'all');
      const payments = await request('mobile/payments', { token });
      assert.equal(payments.status, 200);
      for (const record of [...payments.data.invoices, ...payments.data.payments]) { assert.equal(record.unitId, unitId); assert.equal(record.societyId, societyId); }
      const otherMembership = db.prepare('select society_id,unit_id from memberships where user_id=? and society_id<>? and status=?').get(userId, societyId, 'active');
      assert.ok(otherMembership, 'Fixture must have a second resident society');
      const switched = await request('mobile/more', { token, cookie: 'nivaasa_society=' + otherMembership.society_id });
      assert.equal(switched.data.household.unit.id, otherMembership.unit_id);
      assert.notEqual(switched.data.household.unit.id, unitId);
    });
    await test('settings validate input and modify only the authenticated account/membership', async () => {
      for (const body of [{ action: 'profile', name: 'x', phone: 'bad' }, { action: 'privacy', visible: 'yes' }, { action: 'notifications', visitors: true }, { action: 'password', current: 'wrong', next: '12345678', confirm: '12345678' }]) {
        assert.equal((await request('mobile/settings', { token, body })).status, 400);
      }
      assert.equal((await request('mobile/settings', { token, raw: '{' })).status, 400);
      const otherBefore = db.prepare('select name,phone from users where id=?').get(tenant.user.id);
      assert.equal((await request('mobile/settings', { token, body: { action: 'profile', name: '  Parity test resident  ', phone: '+91 98765 43210', userId: tenant.user.id } })).status, 200);
      assert.equal(db.prepare('select name from users where id=?').get(userId).name, 'Parity test resident');
      assert.deepEqual(db.prepare('select name,phone from users where id=?').get(tenant.user.id), otherBefore);
      assert.equal((await request('mobile/settings', { token, body: { action: 'privacy', visible: false } })).status, 200);
      assert.equal(db.prepare('select directory_visible v from memberships where user_id=? and society_id=?').get(userId, societyId).v, 0);
      const prefs = { visitors: false, payments: true, community: false, helpdesk: true };
      assert.equal((await request('mobile/settings', { token, body: { action: 'notifications', ...prefs } })).status, 200);
      assert.deepEqual(JSON.parse(db.prepare('select notification_prefs p from memberships where user_id=? and society_id=?').get(userId, societyId).p), prefs);
    });
    await test('discussion validation, authorship, moderation and audit records follow server state', async () => {
      assert.equal((await request('mobile/discussions', { token, body: { title: 'short', body: 'x', category: 'unknown' } })).status, 400);
      assert.equal((await request('mobile/discussions', { token, raw: '{' })).status, 400);
      for (const approval of [true, false]) {
        const settings = JSON.parse(db.prepare('select settings from societies where id=?').get(societyId).settings ?? '{}');
        db.prepare('update societies set settings=? where id=?').run(JSON.stringify({ ...settings, discussionApproval: approval }), societyId);
        const created = await request('mobile/discussions', { token, body: { title: '  Native parity verification  ', body: 'This post is created only in the disposable test database.', category: 'question', authorId: tenant.user.id, societyId: tenant.membership.societyId, status: 'published' } });
        assert.equal(created.status, 201);
        const post = db.prepare('select author_id,society_id,status,title from discussions where id=?').get(created.data.id);
        assert.equal(post.author_id, userId); assert.equal(post.society_id, societyId);
        assert.equal(post.status, approval ? 'pending' : 'published'); assert.equal(post.title, 'Native parity verification');
        assert.equal(db.prepare('select count(*) n from audit_logs where entity_id=? and action=?').get(created.data.id, 'discussion.created').n, 1);
      }
    });
    await test('daily help registration is scoped, duplicate-safe and audited', async () => {
      const before = db.prepare('select count(*) n from staff where unit_id=? and society_id=? and kind=?').get(unitId, societyId, 'daily_help').n;
      assert.equal((await request('mobile/daily-help', { token, body: { name: 'Test help', role: 'Cook', phone: 'bad' } })).status, 400);
      const phone = '+91 90000 12345';
      const created = await request('mobile/daily-help', { token, body: { name: 'Test help', role: 'Cook', phone, shift: '7–10 AM', monthlyRate: 6000 } });
      assert.equal(created.status, 201);
      const person = db.prepare('select unit_id,society_id,phone,role,active,police_verified from staff where unit_id=? and society_id=? and kind=? and phone=?').get(unitId, societyId, 'daily_help', phone);
      assert.equal(person.unit_id, unitId); assert.equal(person.society_id, societyId);
      assert.equal(person.role, 'Cook'); assert.equal(person.active, 1); assert.equal(person.police_verified, 0);
      assert.equal(db.prepare('select count(*) n from staff where unit_id=? and society_id=? and kind=?').get(unitId, societyId, 'daily_help').n, before + 1);
      assert.equal(db.prepare('select count(*) n from audit_logs where action=? and actor_id=?').get('household.daily_help.added', userId).n, 1);
      assert.equal((await request('mobile/daily-help', { token, body: { name: 'Duplicate', role: 'Cook', phone } })).status, 400);
      assert.equal((await request('mobile/daily-help', { token: tenant.token, body: { name: 'Other help', role: 'Cook', phone: '+91 90000 12346' } })).status, 201);
      assert.equal(db.prepare('select society_id from staff where phone=?').get('+91 90000 12346').society_id, tenant.membership.societyId);
    });
    await test('active visitor passes can only be cancelled by their own home', async () => {
      const now = Date.now();
      const ownId = crypto.randomUUID(); const otherId = crypto.randomUUID();
      const insert = db.prepare('insert into visitors (id,society_id,unit_id,host_user_id,name,type,status,code,pre_approved,valid_from,valid_to,created_at) values (?,?,?,?,?,?,?,?,?,?,?,?)');
      insert.run(ownId, societyId, unitId, userId, 'Isolated pass', 'guest', 'approved', '918273', 1, now, now + 86_400_000, now);
      insert.run(otherId, tenant.membership.societyId, tenant.membership.unitId, tenant.user.id, 'Other pass', 'guest', 'approved', '918274', 1, now, now + 86_400_000, now);
      assert.equal((await request('mobile/visitors/cancel', { token, body: {} })).status, 400);
      assert.equal((await request('mobile/visitors/cancel', { token, body: { visitorId: otherId } })).status, 404);
      assert.equal((await request('mobile/visitors/cancel', { token, body: { visitorId: ownId } })).status, 200);
      assert.equal(db.prepare('select status from visitors where id=?').get(ownId).status, 'expired');
      assert.equal(db.prepare('select status from visitors where id=?').get(otherId).status, 'approved');
      assert.equal(db.prepare('select count(*) n from audit_logs where entity_id=? and action=?').get(ownId, 'visitor.pass.cancelled').n, 1);
      assert.equal((await request('mobile/visitors/cancel', { token, body: { visitorId: ownId } })).status, 409);
    });
    await test('push registration is authenticated and follows the device to the active account', async () => {
      assert.equal((await request('mobile/push')).status, 401);
      assert.equal((await request('mobile/push', { token, body: { token: 'not-a-token' } })).status, 400);
      const deviceToken = 'a'.repeat(64);
      assert.equal((await request('mobile/push', { token, body: { token: deviceToken, environment: 'sandbox', deviceName: 'API test' } })).status, 200);
      let device = db.prepare('select user_id,society_id,environment,revoked_at from push_devices where token=?').get(deviceToken);
      assert.equal(device.user_id, userId); assert.equal(device.society_id, societyId); assert.equal(device.environment, 'sandbox'); assert.equal(device.revoked_at, null);
      assert.equal((await request('mobile/push', { token: tenant.token, body: { token: deviceToken, environment: 'sandbox', deviceName: 'Reassigned test' } })).status, 200);
      device = db.prepare('select user_id,society_id from push_devices where token=?').get(deviceToken);
      assert.equal(device.user_id, tenant.user.id); assert.equal(device.society_id, tenant.membership.societyId);
      const status = await request('mobile/push', { token: tenant.token });
      assert.equal(status.status, 200); assert.equal(status.data.configured, false); assert.equal(status.data.devices, 1);
      assert.equal((await request('mobile/push/unregister', { token: tenant.token, body: { token: deviceToken } })).status, 200);
      assert.ok(db.prepare('select revoked_at from push_devices where token=?').get(deviceToken).revoked_at);
    });
    await test('gate photo is stored privately and sent to the visitor notification path', async () => {
      assert.equal(security.membership.societyId, societyId, 'Gate fixture must belong to the resident society');
      const prefs = JSON.parse(db.prepare('select notification_prefs p from memberships where user_id=? and society_id=?').get(userId, societyId).p ?? '{}');
      db.prepare('update memberships set notification_prefs=? where user_id=? and society_id=?').run(JSON.stringify({ ...prefs, visitors: true }), userId, societyId);
      const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
      const entry = await multipart('gate/entry', security.token, {
        type: 'guest', unitId, name: 'Photo visitor', phone: '+91 90000 00009', purpose: 'Photo verification',
      }, { bytes: png, type: 'image/png', name: 'visitor.png' });
      assert.equal(entry.status, 200);
      assert.equal(entry.data.status, 'pending');
      assert.ok(entry.data.visitorId);
      let photoResponse;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        photoResponse = await fetch(`http://127.0.0.1:3101/api/visitors/${entry.data.visitorId}/photo`, { headers: { Authorization: 'Bearer ' + token } });
        if (photoResponse.status === 200) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      assert.equal(photoResponse.status, 200);
      assert.match(photoResponse.headers.get('content-type') ?? '', /^image\/png/);
      assert.deepEqual(Buffer.from(await photoResponse.arrayBuffer()), png);
      assert.equal((await fetch(`http://127.0.0.1:3101/api/visitors/${entry.data.visitorId}/photo`)).status, 401);
      assert.equal((await fetch(`http://127.0.0.1:3101/api/visitors/${entry.data.visitorId}/photo`, { headers: { Authorization: 'Bearer ' + tenant.token } })).status, 401);
      const expires = Math.floor(Date.now() / 1000) + 60;
      const signature = createHmac('sha256', 'isolated-photo-signing-test-key').update(`${entry.data.visitorId}:${expires}`).digest('hex');
      const signed = await fetch(`http://127.0.0.1:3101/api/visitors/${entry.data.visitorId}/photo?expires=${expires}&signature=${signature}`);
      assert.equal(signed.status, 200);
      assert.deepEqual(Buffer.from(await signed.arrayBuffer()), png);
      assert.equal((await fetch(`http://127.0.0.1:3101/api/visitors/${entry.data.visitorId}/photo?expires=${expires - 120}&signature=${signature}`)).status, 401);
      assert.equal((await fetch(`http://127.0.0.1:3101/api/visitors/${entry.data.visitorId}/photo?expires=${expires}&signature=${'0'.repeat(64)}`)).status, 401);
      const stored = db.prepare('select photo_url,status from visitors where id=?').get(entry.data.visitorId);
      assert.equal(stored.status, 'pending'); assert.ok(stored.photo_url);
      assert.equal(db.prepare('select count(*) n from notifications where user_id=? and title like ?').get(userId, '%Visitor waiting%').n, 1);
    });
    await test('emergency reads and resolving alerts cannot cross users or societies', async () => {
      const ownId = crypto.randomUUID(); const otherId = crypto.randomUUID(); const now = Date.now();
      const insert = db.prepare('insert into panic_alerts (id,society_id,user_id,unit_id,message,status,created_at) values (?,?,?,?,?,?,?)');
      insert.run(ownId, societyId, userId, unitId, 'Isolated verification only', 'open', now);
      insert.run(otherId, tenant.membership.societyId, tenant.user.id, tenant.membership.unitId, 'Another resident test', 'open', now);
      const own = await request('mobile/emergency', { token });
      assert.equal(own.status, 200);
      assert.ok(own.data.alerts.some(alert => alert.id === ownId));
      assert.ok(own.data.alerts.every(alert => alert.userId === userId && alert.societyId === societyId));
      assert.equal((await request('mobile/emergency', { token, body: { id: otherId } })).status, 404);
      assert.equal((await request('mobile/emergency', { token, body: { id: ownId } })).status, 200);
      assert.equal(db.prepare('select status from panic_alerts where id=?').get(ownId).status, 'resolved');
      assert.equal(db.prepare('select status from panic_alerts where id=?').get(otherId).status, 'open');
      assert.equal(db.prepare('select count(*) n from audit_logs where entity_id=? and action=?').get(ownId, 'panic.resolved_by_resident').n, 1);
    });
  } finally {
    server.kill('SIGTERM');
    if (server.exitCode === null && server.signalCode === null) await once(server, 'exit');
    db.close();
    log.end();
    console.log('Disposable test data and server log: ' + directory);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
