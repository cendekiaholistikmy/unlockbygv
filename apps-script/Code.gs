/**
 * UNLOCK by GengVolunteers · Google Apps Script backend
 * ─────────────────────────────────────────────────────────────
 * Bound to the "UNLOCK Guests & Planning" Google Sheet.
 *
 *  Public  (no key):  GET  ?action=public      → published sessions + settings
 *                     POST submitGuest         → speaker offer / suggestion, with photos
 *  Admin   (key):     POST adminLoad, saveSession, deleteSession, saveGuest,
 *                     deleteGuest, savePlan, deletePlan, saveSettings, uploadPhoto
 *
 * Setup (once):
 *  1. Sheet › Extensions › Apps Script, paste this whole file, Save.
 *  2. Run  setup  (approve the permissions). It builds any missing tabs.
 *  3. Back in the sheet: UNLOCK menu › Set admin key.
 *  4. Deploy › New deployment › Web app · Execute as: Me · Who has access: Anyone.
 *  5. Copy the /exec URL into src/config.ts (APPS_SCRIPT_URL) in the GitHub repo.
 *  After any change to this file: Deploy › Manage deployments › Edit › Version: New.
 */

var TZ = 'Asia/Kuala_Lumpur';
var MAX_PHOTOS = 4;
var MAX_PHOTO_CHARS = 4 * 1024 * 1024; // ~3 MB image as base64

var SHEETS = {
  Sessions: ['ID', 'Episode', 'Title', 'Track', 'Status', 'Date', 'Time', 'Day', 'Speaker', 'Speaker Title', 'Speaker Photo', 'Poster', 'Gallery', 'Recording URL', 'Live URL', 'Summary', 'Takeaways', 'Published', 'Updated', 'Duration', 'Venue'],
  Guests: ['ID', 'Timestamp', 'Type', 'Status', 'Name', 'Email', 'Phone', 'Organisation', 'Role', 'Topic', 'Track', 'Abstract', 'Preferred Night', 'Preferred Date', 'Links', 'Photos', 'Source', 'Session ID', 'Notes', 'PDPA Consent'],
  Planning: ['ID', 'Session ID', 'Session', 'Task', 'Owner', 'Due', 'Status', 'Link', 'Notes'],
  Settings: ['Key', 'Value', 'What it does'],
  Audit: ['Timestamp', 'Action', 'Detail'],
};

var DEFAULT_SETTINGS = [
  ['announcement', 'One session every weekend · Jumaat, Sabtu or Ahad · 9 PM', 'Message in the dynamic island when no session is coming up'],
  ['telegramUrl', 'https://t.me/', 'GV Familia Telegram invite link'],
  ['registerUrl', '', 'Optional registration form link; adds a Register button'],
  ['contactEmail', 'persatuanbeliacendekiaholistik@gmail.com', 'Shown in the footer'],
  ['liveOverride', 'auto', 'auto = follow session times · on = force LIVE · off = never'],
  ['defaultTime', '21:00', 'Default start time for new sessions'],
];

var DAY_FORMULA = '=IFERROR(CHOOSE(WEEKDAY(INDIRECT("RC[-2]",FALSE)),"Ahad","Isnin","Selasa","Rabu","Khamis","Jumaat","Sabtu"),"")';

/* ── entry points ─────────────────────────────────────────────── */

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'public';
    if (action === 'ping') return json_({ ok: true, at: new Date().toISOString() });
    if (action === 'public') {
      var sessions = readSessions_().filter(function (s) { return s.published && s.status !== 'Draft'; });
      return json_({ ok: true, sessions: sessions, settings: readSettings_() });
    }
    return json_({ ok: false, error: 'Unknown action.' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var action = body.action, data = body.data || {}, key = body.key || '';

    if (action === 'submitGuest') {
      lock.waitLock(20000);
      return json_(submitGuest_(data));
    }

    if (!checkKey_(key)) return json_({ ok: false, error: 'Wrong admin key.' });
    if (action === 'adminLoad') {
      return json_({ ok: true, sessions: readSessions_(), settings: readSettings_(), guests: readGuests_(), plan: readPlan_() });
    }

    lock.waitLock(20000);
    switch (action) {
      case 'saveSession': saveSession_(data); break;
      case 'deleteSession': deleteRow_('Sessions', data.id); deleteWhere_('Planning', 'Session ID', data.id); break;
      case 'saveGuest': saveGuest_(data); break;
      case 'deleteGuest': deleteRow_('Guests', data.id); break;
      case 'savePlan': (data.tasks || []).forEach(savePlanTask_); break;
      case 'deletePlan': deleteRow_('Planning', data.id); break;
      case 'saveSettings': saveSettings_(data); break;
      case 'uploadPhoto': return json_({ ok: true, url: savePhoto_(data.dataUrl, data.name, 'Sessions', true) });
      default: return json_({ ok: false, error: 'Unknown action: ' + action });
    }
    audit_(action, data.id || data.title || data.name || '');
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

/* ── public: speaker offers and suggestions ───────────────────── */

function submitGuest_(g) {
  var name = clean_(g.name, 120), email = clean_(g.email, 160), topic = clean_(g.topic, 300);
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !topic) return { ok: false, error: 'Name, a valid email and a topic are needed.' };
  if (!g.consent) return { ok: false, error: 'Please tick the PDPA consent box.' };
  var types = ['Offer to share', 'Suggest a speaker', 'Suggest a topic'];
  var type = types.indexOf(g.type) >= 0 ? g.type : 'Offer to share';

  var photos = (g.photos || []).slice(0, MAX_PHOTOS).map(function (d, i) {
    return savePhoto_(d, name + '-' + (i + 1), 'Guests', false);
  });

  var id = 'g-' + Utilities.getUuid().slice(0, 8);
  appendObject_('Guests', {
    'ID': id,
    'Timestamp': new Date(),
    'Type': type,
    'Status': 'New',
    'Name': name,
    'Email': email,
    'Phone': phone_(g.phone),
    'Organisation': clean_(g.organisation, 160),
    'Role': clean_(g.role, 200),
    'Topic': topic,
    'Track': ['CAREER', 'LEAD', 'TECH', 'LIFE'].indexOf(g.track) >= 0 ? g.track : '',
    'Abstract': clean_(g.abstract, 3000),
    'Preferred Night': clean_(g.preferredSlot, 40),
    'Preferred Date': clean_(g.preferredDate, 20),
    'Links': clean_(g.links, 500),
    'Photos': photos.join('\n'),
    'Source': 'Website',
    'Session ID': '',
    'Notes': '',
    'PDPA Consent': true,
  });
  audit_('submitGuest', type + ': ' + name);
  notifyTeam_(type, name, topic);
  return { ok: true, id: id };
}

/** Emails the sheet owner when a request arrives. Delete this call to stop the emails. */
function notifyTeam_(type, name, topic) {
  try {
    var to = Session.getEffectiveUser().getEmail();
    if (!to) return;
    MailApp.sendEmail(to, 'UNLOCK: new ' + type.toLowerCase() + ' from ' + name,
      name + ' sent "' + topic + '".\n\nOpen the site admin (Guests tab) or the Guests sheet to review.\n' + SpreadsheetApp.getActive().getUrl());
  } catch (e) { /* email quota or permission: the row is saved anyway */ }
}

/* ── sessions ─────────────────────────────────────────────────── */

function readSessions_() {
  return readObjects_('Sessions').filter(function (r) { return r['ID']; }).map(function (r) {
    return {
      id: String(r['ID']),
      episode: Number(r['Episode']) || 0,
      title: String(r['Title'] || ''),
      track: String(r['Track'] || 'CAREER'),
      status: String(r['Status'] || 'Upcoming'),
      date: asDate_(r['Date']),
      time: asTime_(r['Time']),
      duration: Number(r['Duration']) > 0 ? Number(r['Duration']) : 60,
      venue: String(r['Venue'] || ''),
      speaker: String(r['Speaker'] || ''),
      speakerTitle: String(r['Speaker Title'] || ''),
      speakerPhoto: String(r['Speaker Photo'] || ''),
      poster: String(r['Poster'] || ''),
      gallery: lines_(r['Gallery']),
      recordingUrl: String(r['Recording URL'] || ''),
      liveUrl: String(r['Live URL'] || ''),
      summary: String(r['Summary'] || ''),
      takeaways: lines_(r['Takeaways']),
      published: r['Published'] === true || String(r['Published']).toUpperCase() === 'TRUE',
      updatedAt: r['Updated'] instanceof Date ? r['Updated'].toISOString() : String(r['Updated'] || ''),
    };
  }).sort(function (a, b) { return a.episode - b.episode; });
}

function saveSession_(s) {
  if (!s.id) throw new Error('Session has no ID.');
  // Anything shown publicly must be viewable: open up Drive photos used here.
  var urls = [s.poster, s.speakerPhoto].concat(s.gallery || []);
  urls.forEach(publishDriveUrl_);
  upsertObject_('Sessions', s.id, {
    'ID': s.id,
    'Episode': Number(s.episode) || 0,
    'Title': clean_(s.title, 300),
    'Track': s.track,
    'Status': s.status,
    'Date': s.date || '',
    'Time': s.time || '21:00',
    'Day': DAY_FORMULA,
    'Speaker': clean_(s.speaker, 160),
    'Speaker Title': clean_(s.speakerTitle, 200),
    'Speaker Photo': s.speakerPhoto || '',
    'Poster': s.poster || '',
    'Gallery': (s.gallery || []).join('\n'),
    'Recording URL': s.recordingUrl || '',
    'Live URL': s.liveUrl || '',
    'Summary': clean_(s.summary, 2000),
    'Takeaways': (s.takeaways || []).join('\n'),
    'Published': !!s.published,
    'Updated': new Date(),
    'Duration': Number(s.duration) > 0 ? Number(s.duration) : 60,
    'Venue': clean_(s.venue, 200),
  });
}

/* ── guests ───────────────────────────────────────────────────── */

function readGuests_() {
  return readObjects_('Guests').filter(function (r) { return r['ID']; }).map(function (r) {
    return {
      id: String(r['ID']),
      timestamp: r['Timestamp'] instanceof Date ? r['Timestamp'].toISOString() : String(r['Timestamp'] || ''),
      type: String(r['Type'] || 'Offer to share'),
      status: String(r['Status'] || 'New'),
      name: String(r['Name'] || ''),
      email: String(r['Email'] || ''),
      phone: String(r['Phone'] || ''),
      organisation: String(r['Organisation'] || ''),
      role: String(r['Role'] || ''),
      topic: String(r['Topic'] || ''),
      track: String(r['Track'] || ''),
      abstract: String(r['Abstract'] || ''),
      preferredSlot: String(r['Preferred Night'] || ''),
      preferredDate: asDate_(r['Preferred Date']),
      links: String(r['Links'] || ''),
      photos: lines_(r['Photos']),
      source: String(r['Source'] || ''),
      sessionId: String(r['Session ID'] || ''),
      notes: String(r['Notes'] || ''),
      consent: r['PDPA Consent'] === true || String(r['PDPA Consent']).toUpperCase() === 'TRUE',
    };
  }).sort(function (a, b) { return String(b.timestamp).localeCompare(String(a.timestamp)); });
}

function saveGuest_(g) {
  if (!g.id) throw new Error('Guest has no ID.');
  upsertObject_('Guests', g.id, {
    'ID': g.id,
    'Timestamp': g.timestamp ? new Date(g.timestamp) : new Date(),
    'Type': g.type, 'Status': g.status, 'Name': clean_(g.name, 120), 'Email': clean_(g.email, 160), 'Phone': phone_(g.phone),
    'Organisation': clean_(g.organisation, 160), 'Role': clean_(g.role, 200), 'Topic': clean_(g.topic, 300), 'Track': g.track || '',
    'Abstract': clean_(g.abstract, 3000), 'Preferred Night': g.preferredSlot || '', 'Preferred Date': g.preferredDate || '',
    'Links': clean_(g.links, 500), 'Photos': (g.photos || []).join('\n'), 'Source': g.source || 'Network',
    'Session ID': g.sessionId || '', 'Notes': clean_(g.notes, 3000), 'PDPA Consent': !!g.consent,
  });
}

/* ── planning ─────────────────────────────────────────────────── */

function readPlan_() {
  return readObjects_('Planning').filter(function (r) { return r['ID']; }).map(function (r) {
    return {
      id: String(r['ID']), sessionId: String(r['Session ID'] || ''), task: String(r['Task'] || ''), owner: String(r['Owner'] || ''),
      due: asDate_(r['Due']), status: String(r['Status'] || 'Not started'), link: String(r['Link'] || ''), notes: String(r['Notes'] || ''),
    };
  });
}

function savePlanTask_(t) {
  if (!t.id) return;
  var s = readSessions_().filter(function (x) { return x.id === t.sessionId; })[0];
  upsertObject_('Planning', t.id, {
    'ID': t.id, 'Session ID': t.sessionId, 'Session': s ? 'UNLOCK ' + ('0' + s.episode).slice(-2) + ': ' + s.title : '',
    'Task': clean_(t.task, 300), 'Owner': clean_(t.owner, 80), 'Due': t.due || '', 'Status': t.status || 'Not started',
    'Link': clean_(t.link, 500), 'Notes': clean_(t.notes, 1000),
  });
}

/* ── settings ─────────────────────────────────────────────────── */

function readSettings_() {
  var out = {};
  DEFAULT_SETTINGS.forEach(function (d) { out[d[0]] = d[1]; });
  var sh = sheet_('Settings');
  var rows = sh.getDataRange().getValues().slice(1);
  rows.forEach(function (r) {
    if (r[0]) out[String(r[0])] = r[1] instanceof Date ? Utilities.formatDate(r[1], tz_(), 'HH:mm') : String(r[1]);
  });
  return out;
}

function saveSettings_(s) {
  var sh = sheet_('Settings');
  var rows = sh.getDataRange().getValues();
  Object.keys(s).forEach(function (k) {
    var found = false;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === k) { sh.getRange(i + 1, 2).setValue(String(s[k])); found = true; break; }
    }
    if (!found) sh.appendRow([k, String(s[k]), '']);
  });
}

/* ── photos in Drive ──────────────────────────────────────────── */

function folder_(sub) {
  var props = PropertiesService.getScriptProperties();
  var rootId = props.getProperty('UPLOAD_FOLDER_ID');
  var root;
  try { root = rootId ? DriveApp.getFolderById(rootId) : null; } catch (e) { root = null; }
  if (!root) {
    root = DriveApp.createFolder('UNLOCK Uploads');
    props.setProperty('UPLOAD_FOLDER_ID', root.getId());
  }
  var it = root.getFoldersByName(sub);
  return it.hasNext() ? it.next() : root.createFolder(sub);
}

/**
 * Saves a data:image/...;base64 string to Drive and returns a viewable link.
 * Guest photos stay private (only you can open them) until they are used on
 * a published session, which makes them viewable by link.
 */
function savePhoto_(dataUrl, name, sub, makePublic) {
  if (!dataUrl) return '';
  if (/^https?:\/\//.test(dataUrl)) return dataUrl;
  if (dataUrl.length > MAX_PHOTO_CHARS) throw new Error('A photo is too large. Please use a smaller image.');
  var m = String(dataUrl).match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
  if (!m) throw new Error('Photos must be JPG, PNG, WEBP or GIF.');
  var ext = m[1].split('/')[1].replace('jpeg', 'jpg');
  var stamp = Utilities.formatDate(new Date(), tz_(), 'yyyyMMdd-HHmmss');
  var safe = String(name || 'photo').replace(/[^\w.-]+/g, '-').slice(0, 60);
  var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], stamp + '-' + safe + '.' + ext);
  var file = folder_(sub).createFile(blob);
  if (makePublic) file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/file/d/' + file.getId() + '/view';
}

function publishDriveUrl_(url) {
  if (!url) return;
  var m = String(url).match(/\/d\/([\w-]{20,})/) || String(url).match(/[?&]id=([\w-]{20,})/);
  if (!m) return;
  try {
    var f = DriveApp.getFileById(m[1]);
    if (f.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK) f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) { /* not our file: leave it */ }
}

/* ── sheet helpers ────────────────────────────────────────────── */

function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}
function tz_() { return ss_().getSpreadsheetTimeZone() || TZ; }

function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Missing tab "' + name + '". Run setup from the UNLOCK menu.');
  return sh;
}

function headers_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function readObjects_(name) {
  var sh = sheet_(name);
  if (sh.getLastRow() < 2) return [];
  var values = sh.getRange(1, 1, sh.getLastRow(), sh.getLastColumn()).getValues();
  var head = values[0].map(String);
  return values.slice(1).map(function (row) {
    var o = {};
    head.forEach(function (h, i) { o[h] = row[i]; });
    return o;
  });
}

function rowOf_(sh, id) {
  if (sh.getLastRow() < 2) return -1;
  var ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function toRow_(head, obj, existing) {
  return head.map(function (h, i) { return Object.prototype.hasOwnProperty.call(obj, h) ? obj[h] : (existing ? existing[i] : ''); });
}

/** Adds any column the code knows about but the sheet doesn't have yet (at the end). */
function ensureHeaders_(sh, keys) {
  var head = headers_(sh);
  var missing = keys.filter(function (k) { return head.indexOf(k) < 0; });
  if (missing.length) {
    sh.getRange(1, head.length + 1, 1, missing.length).setValues([missing])
      .setFontWeight('bold').setBackground('#0B0D14').setFontColor('#FFFFFF');
  }
  return headers_(sh);
}

function upsertObject_(name, id, obj) {
  var sh = sheet_(name), head = ensureHeaders_(sh, Object.keys(obj)), r = rowOf_(sh, id);
  if (r > 0) {
    var range = sh.getRange(r, 1, 1, head.length);
    range.setValues([toRow_(head, obj, range.getValues()[0])]);
  } else {
    sh.appendRow(toRow_(head, obj, null));
  }
}

function appendObject_(name, obj) {
  var sh = sheet_(name);
  sh.appendRow(toRow_(headers_(sh), obj, null));
}

function deleteRow_(name, id) {
  var sh = sheet_(name), r = rowOf_(sh, id);
  if (r > 0) sh.deleteRow(r);
}

function deleteWhere_(name, col, value) {
  var sh = sheet_(name);
  if (sh.getLastRow() < 2) return;
  var head = headers_(sh), c = head.indexOf(col);
  var vals = sh.getRange(2, c + 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = vals.length - 1; i >= 0; i--) if (String(vals[i][0]) === String(value)) sh.deleteRow(i + 2);
}

function audit_(action, detail) {
  try { sheet_('Audit').appendRow([new Date(), action, String(detail).slice(0, 300)]); } catch (e) {}
}

/* ── small utilities ──────────────────────────────────────────── */

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function clean_(v, max) {
  // Strip a leading = or @ (and + or - not followed by a digit) so typed text
  // can never run as a sheet formula. Phone numbers like +60 12… are kept.
  var s = String(v == null ? '' : v).trim().replace(/^(=|@|[+\-](?=[^\d\s]))+/, '');
  if (/^[+\-]\d/.test(s) && !/^\+?\d[\d\s-]{5,}$/.test(s)) s = "'" + s;
  return s.slice(0, max || 500);
}

/** Phones are stored as text so a leading 0 or + survives. */
function phone_(v) {
  var p = String(v == null ? '' : v).replace(/^'/, '').trim().slice(0, 40);
  return p ? "'" + p : '';
}

function lines_(v) {
  return String(v || '').split(/\r?\n/).map(function (x) { return x.trim(); }).filter(String);
}

function asDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  var s = String(v || '').trim();
  var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // DD/MM/YYYY typed by hand
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return s;
}

function asTime_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'HH:mm');
  var s = String(v || '').trim();
  var m = s.match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?$/i);
  if (!m) return '21:00';
  var h = Number(m[1]);
  if (m[3] && /pm/i.test(m[3]) && h < 12) h += 12;
  if (m[3] && /am/i.test(m[3]) && h === 12) h = 0;
  return ('0' + h).slice(-2) + ':' + m[2];
}

function checkKey_(key) {
  var real = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!real) throw new Error('No admin key set yet. In the sheet: UNLOCK menu › Set admin key.');
  if (String(key).length !== real.length) return false;
  var diff = 0;
  for (var i = 0; i < real.length; i++) diff |= real.charCodeAt(i) ^ String(key).charCodeAt(i);
  return diff === 0;
}

/* ── sheet menu and one-time setup ────────────────────────────── */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('UNLOCK')
    .addItem('Set up / repair tabs', 'setup')
    .addItem('Set admin key', 'setAdminKey')
    .addItem('Open uploads folder', 'showUploadsFolder')
    .addToUi();
}

function setAdminKey() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('UNLOCK admin key', 'Type a new admin key (at least 8 characters). You will type this on the website Admin page.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var k = r.getResponseText().trim();
  if (k.length < 8) return ui.alert('Too short. Use at least 8 characters.');
  PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', k);
  ui.alert('Admin key saved. Keep it private: anyone with it can edit the site.');
}

function showUploadsFolder() {
  var f = folder_('Guests').getParents().next();
  SpreadsheetApp.getUi().alert('Uploads folder:\n' + f.getUrl());
}

/** Creates any missing tabs with headers, dropdowns and checkboxes. Safe to run again. */
function setup() {
  var ss = ss_();
  ss.setSpreadsheetTimeZone(TZ);
  Object.keys(SHEETS).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var head = SHEETS[name];
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#0B0D14').setFontColor('#FFFFFF');
      sh.setFrozenRows(1);
    } else {
      ensureHeaders_(sh, head);
    }
  });
  var st = ss.getSheetByName('Settings');
  var have = st.getLastRow() > 1 ? st.getRange(2, 1, st.getLastRow() - 1, 1).getValues().map(function (r) { return r[0]; }) : [];
  DEFAULT_SETTINGS.forEach(function (d) { if (have.indexOf(d[0]) < 0) st.appendRow(d); });

  var dv = function (list) { return SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(false).build(); };
  var s = ss.getSheetByName('Sessions');
  s.getRange('D2:D500').setDataValidation(dv(['CAREER', 'LEAD', 'TECH', 'LIFE']));
  s.getRange('E2:E500').setDataValidation(dv(['Draft', 'Upcoming', 'Live', 'Recorded', 'Cancelled']));
  s.getRange('R2:R500').insertCheckboxes();
  s.getRange('F2:F500').setNumberFormat('yyyy-mm-dd');
  var g = ss.getSheetByName('Guests');
  g.getRange('C2:C2000').setDataValidation(dv(['Offer to share', 'Suggest a speaker', 'Suggest a topic']));
  g.getRange('D2:D2000').setDataValidation(dv(['New', 'To invite', 'Invited', 'Confirmed', 'Declined', 'Done']));
  g.getRange('Q2:Q2000').setDataValidation(dv(['Website', 'Network', 'Referral']));
  var p = ss.getSheetByName('Planning');
  p.getRange('G2:G2000').setDataValidation(dv(['Not started', 'In progress', 'Done']));
  p.getRange('F2:F2000').setNumberFormat('yyyy-mm-dd');
  folder_('Guests'); folder_('Sessions');
  try { SpreadsheetApp.getUi().alert('UNLOCK tabs are ready. Next: UNLOCK menu › Set admin key, then Deploy as a Web app.'); } catch (e) {}
}
