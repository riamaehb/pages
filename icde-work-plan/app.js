(function () {
  'use strict';
  var CFG = window.CONFIG || {};
  var DEMO = !CFG.API_URL;
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var STATUSES = ['Not started', 'In progress', 'Blocked', 'Done', 'Cancelled'];
  var DATE_STATUS = { firm: 'Date set', proposed: 'Proposed date', target: 'Target date', conditional: 'Depends on approval', tbc: 'Date to be confirmed' };
  var CONF_START = '2027-11-15';
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pad = function (n) { return ('0' + n).slice(-2); };
  var TODAY = (function () {
    var q = ''; try { q = new URLSearchParams(location.search).get('today') || ''; } catch (e) {}
    if (/^\d{4}-\d{2}-\d{2}$/.test(q)) return q;
    var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  })();
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function days(a, b) { return Math.round((parse(b) - parse(a)) / 86400000); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function fmtD(s) { var d = parse(s); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }
  function fmtM(s) { var d = parse(s); return MON[d.getMonth()] + ' ' + d.getFullYear(); }
  function lastDay(s) { var d = parse(s); return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); }
  function dateText(t) {
    if (!t.start) return 'Date to be set';
    var e = t.end || t.start;
    if (t.precision === 'month') return fmtM(t.start);
    if (t.precision === 'part-month') { var sd = parse(t.start).getDate(); return (sd === 1 ? 'Early ' : sd === 11 ? 'Mid ' : 'Late ') + fmtM(t.start); }
    if (t.start === e) return fmtD(t.start);
    var a = parse(t.start), b = parse(e);
    var wholeMonths = a.getDate() === 1 && b.getDate() === lastDay(e);
    if (wholeMonths) return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear() ? fmtM(t.start) : fmtM(t.start) + ' to ' + fmtM(e);
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return a.getDate() + ' to ' + fmtD(e);
    return fmtD(t.start) + ' to ' + fmtD(e);
  }
  function short(c) { return String(c).replace(/ Committee$/, ''); }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

  /* ---------- state ---------- */
  var S = { data: null, user: null, key: '', view: 'overview', param: '', drawer: null, toast: '', open: {}, f: { q: '', c: '', s: '', m: '', kids: false }, mode: 'list', sel: null, rep: null, asRole: 'admin', cs: 'proposed', cg: 'date', cAll: false };
  var D = {};
  function isOpen(t) { return t.status !== 'Done' && t.status !== 'Cancelled'; }
  /* repeating tasks: one tick per week, month or quarter */
  var REPEATS = { '': 'Does not repeat', weekly: 'Every week', monthly: 'Every month', quarterly: 'Every quarter' };
  function periodKey(rp, d0) { var d = parse(d0); if (rp === 'weekly') return addDays(d0, -((d.getDay() + 6) % 7)); if (rp === 'monthly') return d0.slice(0, 7); return d0.slice(0, 4) + '-Q' + (Math.floor((+d0.slice(5, 7) - 1) / 3) + 1); }
  function periodEnd(rp, k) { if (rp === 'weekly') return addDays(k, 6); var m = rp === 'monthly' ? +k.slice(5, 7) : +k.slice(6) * 3; return iso(new Date(+k.slice(0, 4), m, 0)); }
  function periodLabel(rp, k) { if (rp === 'weekly') { var d = parse(k); return 'week of ' + d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); } if (rp === 'monthly') return MON[+k.slice(5, 7) - 1] + ' ' + k.slice(0, 4); return k.slice(5) + ' ' + k.slice(0, 4); }
  function periodsOf(t) {
    if (!t.repeat || !t.start || !t.end) return [];
    var out = [], k = periodKey(t.repeat, t.start), last = periodKey(t.repeat, t.end);
    for (var i = 0; i < 400; i++) { out.push(k); if (k >= last) break; k = periodKey(t.repeat, addDays(periodEnd(t.repeat, k), 1)); }
    return out;
  }
  function periodDone(t, k) { return (t.done_periods || []).indexOf(k) >= 0; }
  /* the most recent period that has ended and is not ticked; older gaps show in the list but are not chased */
  function missedPeriod(t) {
    if (!t.repeat || !isOpen(t)) return '';
    var prev = ''; periodsOf(t).forEach(function (k) { if (periodEnd(t.repeat, k) < TODAY) prev = k; });
    return prev && !periodDone(t, prev) ? prev : '';
  }
  function currentPeriod(t, day) { if (!t.repeat) return ''; var k = periodKey(t.repeat, day || TODAY); return periodsOf(t).indexOf(k) >= 0 ? k : ''; }
  function overdue(t) { if (!isOpen(t)) return false; if (t.repeat && missedPeriod(t)) return true; return !!(t.end && t.end < TODAY); }
  /* committee colours */
  function ccv(n) { return 'var(--cc-' + String((D.code || {})[n] || 'X').replace(/[^A-Za-z0-9_-]/g, '') + ', var(--muted))'; }
  function isMine(t) { var u = S.user; return !!(u && u.role === 'editor' && ((u.committees || []).indexOf(t.lead) >= 0 || (!!t.subcommittee && mySubs().indexOf(t.subcommittee) >= 0))); }
  function subChip(t) { return t.subcommittee ? ' <span class="chip sub" title="Subcommittee">' + esc(t.subcommittee.replace(/ Subcommittee$/, '')) + '</span>' : ''; }
  function ccAttr(t) { return ' style="--cc:' + ccv(t.lead) + '"'; }
  function cdot(n) { return '<span class="cdot" style="background:' + ccv(n) + '"></span>'; }
  function repChip(t) { return t.repeat ? ' <span class="chip">' + esc((REPEATS[t.repeat] || '').replace('Every ', 'Each ')) + '</span>' : ''; }
  function statusChip(t) {
    var c = t.status === 'Done' ? 'done' : t.status === 'In progress' ? 'prog' : t.status === 'Blocked' ? 'block' : '';
    return '<span class="chip ' + c + '">' + esc(t.status) + '</span>';
  }
  function dsChip(t) { return t.datestatus && t.datestatus !== 'firm' ? '<span class="chip warn">' + esc(DATE_STATUS[t.datestatus] || t.datestatus) + '</span>' : ''; }
  function derive() {
    var all = S.data.tasks; if (S.user && S.user.role !== 'admin') all = all.filter(function (t) { return !t.review; });
    D = { byId: {}, kids: {}, names: [], code: {}, links: [], proposed: [], rejected: [] };
    all.forEach(function (t) { D.byId[t.id] = t; if (t.review === 'proposed') D.proposed.push(t); else if (t.review) D.rejected.push(t); });
    var tasks = all.filter(function (t) { return !t.review; });
    D.canon = tasks.filter(function (t) { return !t.parent; });
    tasks.forEach(function (t) { if (t.parent) (D.kids[t.parent] = D.kids[t.parent] || []).push(t); });
    D.subs = {}; D.subBy = {}; (S.data.subcommittees || []).forEach(function (x) { (D.subs[x.committee] = D.subs[x.committee] || []).push(x); D.subBy[x.name] = x; });
    D.com = {}; D.mem = {}; S.data.committees.forEach(function (c) { D.names.push(c.name); D.code[c.name] = c.code; D.com[c.name] = c; });
    (S.data.members || []).forEach(function (m) { (D.mem[m.committee] = D.mem[m.committee] || []).push(m); });
    tasks.forEach(function (t) { if (t.relation === 'duplicate') return; (t.links || []).forEach(function (l) { D.links.push({ l: l, t: t }); }); });
  }
  function lastUpdate(n) { var m = ''; D.canon.forEach(function (t) { if (t.lead === n && !t.source && t.updated_at && t.updated_at > m) m = t.updated_at; }); return m ? m.slice(0, 10) : ''; }
  function inv(t) { return t.lead === undefined ? [] : [t.lead].concat(t.support || []); }

  /* ---------- permissions ---------- */
  function mySubs() { var u = S.user; return u && u.role === 'editor' ? (u.subcommittees || []) : []; }
  function canEdit(t) { var u = S.user; if (t.review) return u.role === 'admin'; return u.role === 'admin' || (u.role === 'editor' && (u.committees.indexOf(t.lead) >= 0 || (!!t.subcommittee && mySubs().indexOf(t.subcommittee) >= 0))); }
  function isCommEditor(c) { var u = S.user; return u.role === 'editor' && u.committees.indexOf(c) >= 0; }
  function canNote(t) {
    var u = S.user; if (t.review) return false; if (canEdit(t)) return true; if (u.role !== 'editor') return false;
    return u.committees.some(function (c) { return (t.support || []).indexOf(c) >= 0; });
  }
  var APPROVERS = ['ICDE Secretariat', 'ICDE Steering Committee', 'ICDE Program Committee', 'Chancellor'];
  function apprList(t) { return (t.approvals || []).concat(t.approval_other ? [t.approval_other] : []); }
  function started(t) { return t.status === 'In progress' || t.status === 'Blocked'; }
  /* An approval counts as "waiting" only once the lead committee has started the work. */
  function needsNow(t) { return isOpen(t) && started(t) && apprList(t).length > 0; }
  function apprChips(t, needs) {
    return apprList(t).map(function (a) { return '<span class="chip gate' + (started(t) ? '' : ' soft') + '"' + (started(t) ? '' : ' title="Not needed yet: work has not started"') + '>' + (needs ? (started(t) ? 'Needs ' : 'Will need ') : '') + esc(a) + '</span>'; }).join(' ');
  }
  function canAdd(c) { var u = S.user; return u.role === 'admin' || isCommEditor(c) || mySubs().some(function (n) { return D.subBy[n] && D.subBy[n].committee === c; }); }

  /* ---------- API ---------- */
  function api(action, payload) {
    if (DEMO) return Promise.resolve(localApi(action, payload || {}));
    var body = Object.assign({ key: S.key, action: action }, payload || {});
    return fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) }).then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'Could not reach the server. Check your connection and try again. Your change was not saved.' }; });
  }
  function localApi(action, req) {
    var u = S.user, tasks = S.data.tasks, nowS = TODAY + 'T09:00:00';
    function log(id, type, text, o, n) { S.data.updates.unshift({ at: nowS, task_id: id, user: u.name, type: type, text: text || '', old: o || '', new: n || '' }); }
    if (action === 'saveTask') {
      var p = req.task, t = p.id ? D.byId[p.id] : null;
      if (!t) {
        var code = D.code[p.lead], max = 0; tasks.forEach(function (x) { var m = x.id.match(/^([A-Z]+)-(\d+)$/); if (m && m[1] === code) max = Math.max(max, +m[2]); });
        if (!(u.role === 'admin' || isCommEditor(p.lead))) { var okSub = mySubs().filter(function (n) { return D.subBy[n] && D.subBy[n].committee === p.lead; }); if (!okSub.length) return { ok: false, error: 'You can add tasks only for your own committee' }; if (!p.subcommittee && okSub.length === 1) p.subcommittee = okSub[0]; if (okSub.indexOf(p.subcommittee) < 0) return { ok: false, error: 'You can add tasks only for your own subcommittee' }; }
        t = { id: code + '-' + pad(max + 1), subcommittee: p.subcommittee || '', title: p.title, lead: p.lead, support: [], external: [], start: '', end: '', precision: 'day', datestatus: 'proposed', condition: '', status: 'Not started', approvals: [], prereq: '', deliverable: '', toconfirm: '', parent: '', relation: '', series: '', listed_in: p.lead, flag_owner: '', links: [], note: '' };
        tasks.push(t); D.byId[t.id] = t; D.canon.push(t); log(t.id, 'create', t.title);
      } else if (!canEdit(t)) return { ok: false, error: 'Only the lead committee can edit this task.' };
      ['title', 'assignee', 'support', 'external', 'prereq', 'deliverable', 'toconfirm', 'status', 'datestatus', 'approvals', 'approval_other', 'repeat'].concat(u.role === 'admin' || isCommEditor(t.lead) ? ['subcommittee'] : []).forEach(function (k) { if (p[k] !== undefined) t[k] = p[k]; });
      var dep = (t.support || []).length > 0 || (t.links || []).length > 0, pend = false;
      if (p.start !== undefined && (p.start !== t.start || p.end !== t.end)) {
        if (!t.start || u.role === 'admin' || !dep) { t.start = p.start; t.end = p.end || p.start; t.precision = t.start === t.end ? 'day' : 'range'; t.pending_start = ''; }
        else { t.pending_start = p.start; t.pending_end = p.end || p.start; t.pending_by = u.name; t.pending_reason = req.reason || ''; pend = true; log(t.id, 'date-request', req.reason, '', p.start + ' to ' + p.end); }
      }
      return { ok: true, task: t, pending: pend };
    }
    if (action === 'addUpdate') {
      var tk = D.byId[req.id]; if (!tk) return { ok: false, error: 'Task not found' };
      if (!canNote(tk)) return { ok: false, error: 'You cannot post updates on this task' };
      var old = tk.status; if (req.status && req.status !== tk.status) { if (!canEdit(tk)) return { ok: false, error: 'Only the lead committee can change status' }; tk.status = req.status; }
      if (!(req.text || '').trim() && old === tk.status) return { ok: false, error: 'Nothing to save' };
      if ((req.text || '').trim()) tk.note = req.text.trim();
      log(tk.id, 'note', (req.text || '').trim() + (req.link ? ' [' + req.link + ']' : ''), old, tk.status); return { ok: true, task: tk };
    }
    if (action === 'reviewTask') {
      if (u.role !== 'admin') return { ok: false, error: 'Admin only' };
      var rt = D.byId[req.id]; if (!rt || !rt.source) return { ok: false, error: 'Only contract tasks are reviewed here' };
      var was = rt.review || 'accepted'; rt.review = req.decision === 'accept' ? '' : req.decision === 'reject' ? 'rejected' : 'proposed';
      log(rt.id, 'contract-' + req.decision, '', was, rt.review || 'accepted'); return { ok: true, task: rt };
    }
    if (action === 'reviewAll') {
      if (u.role !== 'admin') return { ok: false, error: 'Admin only' };
      var nAcc = 0; tasks.forEach(function (x) { if (x.review === 'proposed') { x.review = ''; nAcc++; } }); log('-', 'contract-accept-all', nAcc + ' contract tasks accepted'); return { ok: true, count: nAcc };
    }
    if (action === 'markPeriod') {
      var mp = D.byId[req.id]; if (!mp || mp.review) return { ok: false, error: 'Task not found' };
      if (!canEdit(mp)) return { ok: false, error: 'Only the lead committee can tick a period' };
      if (!mp.repeat) return { ok: false, error: 'This task does not repeat' };
      if (periodsOf(mp).indexOf(req.period) < 0) return { ok: false, error: 'That period is outside the task dates' };
      mp.done_periods = (mp.done_periods || []).filter(function (k) { return k !== req.period; });
      if (req.done !== false) { mp.done_periods.push(req.period); if (mp.status === 'Not started') mp.status = 'In progress'; }
      mp.done_periods.sort(); log(mp.id, 'period', periodLabel(mp.repeat, req.period) + (req.done !== false ? ' done' : ' not done'), '', ''); return { ok: true, task: mp };
    }
    if (action === 'approveDate') {
      var a = D.byId[req.id]; if (!a || !a.pending_start) return { ok: false, error: 'No pending change' };
      log(a.id, req.approve ? 'date-approved' : 'date-declined', '', a.start + ' to ' + a.end, a.pending_start + ' to ' + a.pending_end);
      if (req.approve) { a.start = a.pending_start; a.end = a.pending_end; } a.pending_start = ''; a.pending_end = ''; return { ok: true };
    }
    if (action === 'freezeBaseline') { tasks.forEach(function (x) { if (!x.base_start) { x.base_start = x.start; x.base_end = x.end; } }); log('-', 'baseline', 'Baseline frozen'); return { ok: true, frozen: tasks.length }; }
    if (action === 'saveReport') { S.data.reports.unshift({ month: req.month, saved_at: nowS, saved_by: u.name, content: JSON.stringify(req.content) }); return { ok: true }; }
    return { ok: false, error: 'Unknown action' };
  }

  /* ---------- load ---------- */
  function loadKey() { try { return localStorage.getItem('icde-wp-key') || ''; } catch (e) { return ''; } }
  function saveKey(k) { try { localStorage.setItem('icde-wp-key', k); } catch (e) {} }
  function boot() {
    if (DEMO) {
      S.data = JSON.parse(JSON.stringify(window.DEMO_DATA)); S.data.updates = S.data.updates || []; S.data.reports = S.data.reports || [];
      setDemoUser(); derive(); routeFromHash(); render(); return;
    }
    S.key = loadKey();
    if (!S.key) { signin(''); return; }
    refresh().catch(function (e) { signin(String(e.message || e)); });
  }
  function setDemoUser() {
    var m = String(S.asRole);
    if (m === 'admin') S.user = { name: 'Organizing Committee Chair (demo)', role: 'admin', committees: [] };
    else if (m === 'viewer') S.user = { name: 'ICDE viewer (demo)', role: 'viewer', committees: [] };
    else if (m === '*multi') S.user = { name: 'Multi-committee editor (demo)', role: 'editor', committees: ['Program Committee', 'Paper Committee'] };
    else if (m.indexOf('sub:') === 0) S.user = { name: 'Subcommittee lead (demo)', role: 'editor', committees: [], subcommittees: [m.slice(4)] };
    else S.user = { name: 'Committee editor (demo)', role: 'editor', committees: [m] };
    S.wc = undefined; S.weekOff = 0;
  }
  function refresh() {
    return api('data').then(function (r) {
      if (!r.ok) throw new Error(r.error || 'Could not load');
      S.data = r; S.user = r.user; S.loadedAt = Date.now(); derive(); routeFromHash(); render();
    });
  }
  function signin(err) {
    $('#app').innerHTML = '<div class="signin card"><h2>ICDE 2027 Committee Work Plan</h2><p class="muted">Enter the access key sent to you by the Organizing Committee.</p>' +
      (err ? '<p class="callout bad">' + esc(err) + '</p>' : '') +
      '<div class="field"><label for="k">Access key</label><input id="k" type="password" autocomplete="off"></div><button class="btn primary" data-act="signin">Open the work plan</button></div>';
  }

  /* ---------- routing ---------- */
  var ALLVIEWS = [['overview', 'Overview'], ['week', 'This week'], ['committees', 'Committees'], ['plan', 'Master plan'], ['dependencies', 'Dependencies'], ['decisions', 'Approvals'], ['contract', 'Contract'], ['report', 'ICDE report']];
  var NAVGROUPS = [['', ['overview', 'week', 'committees']], ['Plan', ['plan', 'dependencies']], ['Approvals and reports', ['decisions', 'contract', 'report']]];
  var LOGO = window.LOGO_SRC || 'logo.png';
  function views() { var role = S.user ? S.user.role : 'viewer'; return ALLVIEWS.filter(function (v) { return v[0] !== 'contract' || role === 'admin'; }); }
  function routeFromHash() {
    var h = (location.hash || '').replace(/^#/, ''), m = h.match(/^([a-z]+)(?:-(.+))?$/i);
    if (!m) { S.view = 'overview'; S.param = ''; return; }
    var v = m[1].toLowerCase(); if (v === 'committee') v = 'committees';
    S.view = views().some(function (x) { return x[0] === v; }) ? v : 'overview'; S.param = m[2] || '';
    if (S.view === 'plan') S.mode = S.param === 'gantt' ? 'gantt' : 'list';
  }
  function go(v, p) { location.hash = v + (p ? '-' + p : ''); }
  window.addEventListener('hashchange', function () { if (!S.data) return; routeFromHash(); S.drawer = null; S.menu = false; render(); window.scrollTo(0, 0); });

  /* ---------- helpers for views ---------- */
  function taskItem(t, extra) {
    return '<li class="item cc' + (isMine(t) ? ' mine' : '') + '"' + ccAttr(t) + ' data-act="open" data-id="' + esc(t.id) + '"><span class="id">' + esc(t.id) + '</span><div class="body"><div class="t">' + esc(t.title) + repChip(t) + subChip(t) + '</div>' +
      '<div class="meta">' + cdot(t.lead) + esc(short(t.lead)) + ' · ' + esc(dateText(t)) + (extra ? ' · ' + extra : '') + '</div></div>' + statusChip(t) + '</li>';
  }
  function list(items, empty) { return items.length ? '<ul class="list">' + items.join('') + '</ul>' : '<div class="empty">' + esc(empty) + '</div>'; }
  function handoffs(window_) {
    var out = [];
    D.links.forEach(function (x) {
      if (x.l.kind !== 'provides' || !isOpen(x.t) || !x.t.start) return;
      var due = x.t.start; if (due > addDays(TODAY, window_)) return;
      out.push({ due: due, from: x.l.frm, to: x.l.to, t: x.t, text: x.l.text });
    });
    out.sort(function (a, b) { return a.due < b.due ? -1 : 1; });
    var seen = {}; return out.filter(function (o) { var k = o.t.id + o.from + o.to; if (seen[k]) return false; seen[k] = 1; return true; });
  }
  function budgetKnown() { return S.data.committees.some(function (c) { return c.budget_submitted === true || c.budget_submitted === false; }); }
  function link(u, t) { return /^https?:\/\//.test(u) ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t) + '</a>' : esc(t); }
  function pendingDates() { return D.canon.filter(function (t) { return t.pending_start; }); }

  /* ---------- overview ---------- */
  function vOverview() {
    var c = D.canon.filter(function (t) { return t.relation !== 'duplicate'; });
    var done = c.filter(function (t) { return t.status === 'Done'; }).length;
    var late = c.filter(overdue), soon = c.filter(function (t) { return isOpen(t) && t.end && t.end >= TODAY && t.end <= addDays(TODAY, 30); });
    var tc = c.filter(function (t) { return t.toconfirm && isOpen(t); }), pend = pendingDates();
    var left = days(TODAY, CONF_START);
    var adm = S.user.role === 'admin';
    var h = '<div class="page-head"><div><h2>' + (adm ? 'Chair\'s overview' : 'Overview') + '</h2><p>' + (adm ? 'What needs a decision, what is late, and who is waiting on whom.' : 'Where the preparations stand, what is late, and what is waiting for approval.') + ' Today is ' + esc(fmtD(TODAY)) + '.</p></div></div>';
    h += '<div class="kpis"><div class="kpi"><b>' + left + '</b><span>days to the conference (15 Nov 2027)</span></div>' +
      '<div class="kpi"><b>' + done + ' / ' + c.length + '</b><span>tasks done</span></div>' +
      '<div class="kpi' + (late.length ? ' alert' : '') + '"><b>' + late.length + '</b><span>overdue</span></div>' +
      '<div class="kpi"><b>' + soon.length + '</b><span>due in the next 30 days</span></div>' +
      '<div class="kpi"><b>' + tc.length + '</b><span>open questions</span></div>' +
      '<div class="kpi' + (pend.length ? ' alert' : '') + '"><b>' + pend.length + '</b><span>date changes awaiting approval</span></div></div>';
    // progress
    var progress = '<div class="card" style="margin-bottom:14px"><h3>Progress by committee</h3>' + D.names.map(function (n) {
      var mine = c.filter(function (t) { return t.lead === n; }), tot = mine.length || 1;
      var cnt = function (s) { return mine.filter(function (t) { return t.status === s; }).length; };
      var dn = cnt('Done'), pr = cnt('In progress'), bl = cnt('Blocked'), lt = mine.filter(overdue).length;
      return '<div class="bar-row" data-act="goto" data-v="committees" data-p="' + esc(D.code[n]) + '"><span class="bl">' + cdot(n) + esc(short(n)) + '<small class="muted" style="display:block;font-weight:400">' + (lastUpdate(n) ? 'updated ' + esc(fmtD(lastUpdate(n)).replace(/ \d{4}$/, '')) : 'no update yet') + '</small></span><div class="stack"><i style="width:' + dn / tot * 100 + '%;background:var(--done)"></i><i style="width:' + pr / tot * 100 + '%;background:var(--prog)"></i><i style="width:' + bl / tot * 100 + '%;background:var(--block)"></i></div><span class="num muted">' + dn + '/' + mine.length + (lt ? ' <b style="color:var(--block)">' + lt + '!</b>' : '') + '</span></div>';
    }).join('') + '<div class="legend"><span><i style="background:var(--done)"></i>Done</span><span><i style="background:var(--prog)"></i>In progress</span><span><i style="background:var(--block)"></i>Blocked</span><span>! = overdue</span></div></div>';
    if (S.user.role === 'admin' && D.proposed.length) h += '<div class="callout info" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span><b>' + D.proposed.length + ' contract tasks are waiting for your review.</b> They come from the Host Agreement and the venue agreement and do not count in the numbers above until you accept them.</span><button class="btn sm primary" data-act="goto" data-v="contract">Review them</button></div>';
    h += progress;
    var gate = c.filter(function (t) { return needsNow(t); }).sort(function (a, b) { return (a.start || '9') < (b.start || '9') ? -1 : 1; });
    h += '<div class="card" style="margin-bottom:14px"><h3>Waiting for approval from outside the committees <button class="btn sm" data-act="goto" data-v="decisions">See all (' + gate.length + ')</button></h3>' + list(gate.slice(0, 6).map(function (t) { return taskItem(t, apprChips(t)); }), 'Nothing in progress is waiting for an outside approval.') + '</div>';
    h += '<div class="grid g2">';
    // decisions
    var dec = '';
    if (pend.length) dec += '<ul class="list">' + pend.map(function (t) {
      return '<li class="item" data-act="open" data-id="' + esc(t.id) + '"><span class="id">' + esc(t.id) + '</span><div class="body"><div class="t">' + esc(t.title) + '</div><div class="meta">' + esc(t.pending_by) + ' asks to move it from ' + esc(dateText(t)) + ' to ' + esc(fmtD(t.pending_start)) + (t.pending_end && t.pending_end !== t.pending_start ? ' to ' + esc(fmtD(t.pending_end)) : '') + (t.pending_reason ? '. Reason: ' + esc(t.pending_reason) : '') + '</div>' +
        (S.user.role === 'admin' ? '<div style="margin-top:6px"><button class="btn sm primary" data-act="approve" data-id="' + esc(t.id) + '" data-ok="1">Approve</button> <button class="btn sm" data-act="approve" data-id="' + esc(t.id) + '" data-ok="0">Decline</button></div>' : '') + '</div></li>';
    }).join('') + '</ul>';
    dec += list(tc.slice(0, 6).map(function (t) { return taskItem(t, '<b>Open question:</b> ' + esc(t.toconfirm)); }), pend.length ? '' : 'Nothing waiting for a decision.');
    h += '<div class="card"><h3>Needs a decision <button class="btn sm" data-act="goto" data-v="decisions">See all (' + (tc.length + pend.length) + ')</button></h3>' + dec + '</div>';
    // overdue
    h += '<div class="card"><h3>Overdue</h3>' + list(late.sort(function (a, b) { return a.end < b.end ? -1 : 1; }).slice(0, 8).map(function (t) { return taskItem(t, t.repeat && missedPeriod(t) ? esc(periodLabel(t.repeat, missedPeriod(t))) + ' not ticked' : 'was due ' + esc(fmtD(t.end))); }), 'Nothing is overdue.') + '</div>';
    // handoffs
    var hs = handoffs(30);
    h += '<div class="card"><h3>Handoffs due within 30 days</h3>' + list(hs.slice(0, 8).map(function (o) {
      return '<li class="item" data-act="open" data-id="' + esc(o.t.id) + '"><span class="id">' + esc(o.t.id) + '</span><div class="body"><div class="t">' + esc(short(o.from)) + ' to ' + esc(short(o.to)) + '</div><div class="meta">For: ' + esc(o.t.title) + ' · ' + (o.due < TODAY ? 'was needed by ' : 'needed by ') + esc(fmtD(o.due)) + ' · follow up with <b>' + esc(short(o.from)) + '</b></div></div></li>';
    }), 'No open handoffs in the next 30 days.') + '</div>';
    // due soon
    h += '<div class="card"><h3>Due in the next 30 days</h3>' + list(soon.sort(function (a, b) { return a.end < b.end ? -1 : 1; }).slice(0, 8).map(function (t) { return taskItem(t); }), 'Nothing else is due in the next 30 days.') + '</div>';
    h += '</div>';
    if (budgetKnown()) {
      var nb = S.data.committees.filter(function (c) { return c.budget_submitted === false; }), sb = S.data.committees.filter(function (c) { return c.budget_submitted === true; });
      h += '<div class="card" style="margin-top:14px"><h3>Budget and timeline submissions <span class="chip ' + (nb.length ? 'warn' : 'done') + '">' + sb.length + ' of ' + (sb.length + nb.length) + ' submitted</span></h3>' + (nb.length ? '<p class="muted small" style="margin-top:0">Not yet submitted. Follow up with the chair.</p><ul class="list">' + nb.map(function (c) { return '<li class="item" data-act="goto" data-v="committees" data-p="' + esc(c.code) + '"><div class="body"><div class="t">' + esc(c.name) + '</div><div class="meta">' + esc(c.chair_name || 'Chair not set') + (c.chair_email ? ' · ' + esc(c.chair_email) : '') + '</div></div></li>'; }).join('') + '</ul>' : '<div class="empty">All committees have submitted.</div>') + '</div>';
    }
    if ((S.data.links || []).length) h += '<div class="card" style="margin-top:14px"><h3>Shared documents</h3><p style="margin:0">' + S.data.links.map(function (l) { return link(l.url, l.label); }).join(' · ') + '</p></div>';
    // recent
    var ups = S.data.updates.slice(0, 6);
    h += '<div class="card" style="margin-top:14px"><h3>Recent updates</h3>' + (ups.length ? ups.map(function (u) { return '<div class="hist"><b>' + esc(u.task_id) + '</b> ' + esc(u.type) + ' by ' + esc(u.user) + ' on ' + esc(String(u.at).slice(0, 10)) + (u.text ? ': ' + esc(u.text) : '') + '</div>'; }).join('') : '<div class="empty">No updates yet. Committees post updates from their pages.</div>') + '</div>';
    return h;
  }

  /* ---------- committees ---------- */
  function contributions(c) {
    var seen = {}, out = [];
    D.canon.forEach(function (t) { if (t.relation === 'duplicate' || t.all_committees) return; if (t.lead !== c && ((t.support || []).indexOf(c) >= 0 || t.listed_in === c)) { seen[t.id] = 1; out.push({ t: t }); } });
    S.data.tasks.forEach(function (k) { if (k.parent && k.relation === 'contribution' && k.listed_in === c && D.byId[k.parent] && D.byId[k.parent].lead !== c && !seen[k.parent]) { seen[k.parent] = 1; out.push({ t: D.byId[k.parent], note: k.deliverable }); } });
    return out;
  }
  function vCommittees() {
    var code = S.param, name = D.names.filter(function (n) { return D.code[n] === code; })[0];
    if (!name) {
      var h = '<div class="page-head"><div><h2>Committees</h2><p>Each committee page shows what it leads, what it contributes to, and who it is waiting for.</p></div></div>' + myStrip('') + '<div class="grid g3">';
      D.names.forEach(function (n) {
        var mine = D.canon.filter(function (t) { return t.lead === n && t.relation !== 'duplicate'; }), dn = mine.filter(function (t) { return t.status === 'Done'; }).length, lt = mine.filter(overdue).length, nx = mine.filter(isOpen).sort(function (a, b) { return a.end < b.end ? -1 : 1; })[0];
        var ch = S.data.committees.filter(function (c) { return c.name === n; })[0] || {};
        h += '<a class="card ccard" style="text-decoration:none;color:inherit;--cc:' + ccv(n) + '" href="#committees-' + esc(D.code[n]) + '"><h3>' + cdot(n) + esc(n) + '</h3><div class="muted small">' + (ch.chair_name ? 'Chair: ' + esc(ch.chair_name) : 'Chair not set') + '</div><div style="margin:8px 0">' + mine.length + ' tasks led · ' + dn + ' done' + (lt ? ' · <b style="color:var(--block)">' + lt + ' overdue</b>' : '') + '</div>' + ((D.com[n] || {}).budget_submitted === false ? '<div style="margin-bottom:6px"><span class="chip warn">Budget not yet submitted</span></div>' : '') + '<div class="muted small">' + (nx ? 'Next: ' + esc(nx.title.slice(0, 60)) + ' (' + esc(dateText(nx)) + ')' : 'No open tasks') + '</div></a>';
      });
      h += '</div>';
      var oc = D.mem['Organizing Committee'] || [];
      if (oc.length && D.names.indexOf('Organizing Committee') < 0) h = h.replace('<div class="grid g3">', '<div class="card" style="margin-bottom:14px"><h3>Organizing Committee</h3><p style="margin:6px 0 0">' + oc.map(function (m) { return '<b>' + esc(m.name) + '</b> <span class="muted small">' + esc(m.position) + (m.email ? ' · ' + esc(m.email) : '') + '</span>'; }).join('<br>') + '</p></div><div class="grid g3">');
      var ppl = {};
      D.names.forEach(function (n) { (D.mem[n] || []).forEach(function (m) { var k = m.email ? m.email.toLowerCase() : m.name.toLowerCase().replace(/\b[a-z]{1,2}\.?(?=\s)/g, '').replace(/[^a-z]/g, ''); (ppl[k] = ppl[k] || { name: m.name, c: [] }).c.push(short(n) + (m.position.indexOf('Chair') === 0 ? ' (chair)' : '')); }); });
      var multi = Object.keys(ppl).map(function (k) { return ppl[k]; }).filter(function (x) { return x.c.length > 1; }).sort(function (x, y) { return y.c.length - x.c.length || (x.name < y.name ? -1 : 1); });
      var total = Object.keys(ppl).length;
      if (total) h += '<details class="more" style="margin-top:14px"><summary>' + total + ' people on committees · ' + multi.length + ' serve on more than one</summary>' + list(multi.map(function (x) { return '<li class="item" style="cursor:default"><div class="body"><div class="t">' + esc(x.name) + ' <span class="chip">' + x.c.length + '</span></div><div class="meta">' + esc(x.c.join(', ')) + '</div></div></li>'; }), 'Nobody serves on more than one committee.') + '</details>';
      return h;
    }
    var lead = D.canon.filter(function (t) { return t.lead === name && t.relation !== 'duplicate'; }).sort(function (a, b) { return (a.start || '9') < (b.start || '9') ? -1 : 1; });
    var contrib = contributions(name), wide = D.canon.filter(function (t) { return t.all_committees && t.lead !== name && t.relation !== 'duplicate'; });
    var need = D.links.filter(function (x) { return x.l.kind === 'provides' && x.l.to === name && x.l.frm !== name && isOpen(x.t); }).sort(function (a, b) { return a.t.start < b.t.start ? -1 : 1; });
    var owe = D.links.filter(function (x) { return x.l.kind === 'provides' && x.l.frm === name && isOpen(x.t); }).sort(function (a, b) { return a.t.start < b.t.start ? -1 : 1; });
    var cm = D.com[name] || {}, mems = D.mem[name] || [];
    var info = '<div class="card" style="margin-bottom:14px"><div class="meta-row">' +
      (cm.chair_name ? '<div><span class="muted small">Chair</span><br><b>' + esc(cm.chair_name) + '</b>' + (cm.chair_email ? '<br><span class="small">' + esc(cm.chair_email) + '</span>' : '') + '</div>' : '') +
      (cm.group_email ? '<div><span class="muted small">Committee email</span><br><span class="small">' + esc(cm.group_email) + '</span></div>' : '') +
      (cm.budget_submitted === true || cm.budget_submitted === false ? '<div><span class="muted small">Budget and timeline</span><br>' + (cm.budget_submitted ? '<span class="chip done">Submitted</span> ' + esc(cm.budget_doc || '') : '<span class="chip warn">Not yet submitted</span>') + '</div>' : '') +
      ((cm.folder_url || (cm.docs || []).length) ? '<div><span class="muted small">Folders and documents</span><br>' + (cm.folder_url ? [link(cm.folder_url, 'Committee folder')] : []).concat((cm.docs || []).map(function (d) { return link(d.url, d.label); })).join(' · ') + '</div>' : '') +
      '</div>' + (mems.length ? '<details class="more"><summary>Members (' + mems.length + ')</summary><ul class="list">' + mems.map(function (m) { return '<li class="item" style="cursor:default"><div class="body"><div class="t">' + esc(m.name) + '</div><div class="meta">' + esc(m.position) + (m.email ? ' · ' + esc(m.email) : '') + '</div></div></li>'; }).join('') + '</ul></details>' : '') + '</div>';
    var h2 = '<div class="page-head"><div><a href="#committees" class="small">All committees</a><h2>' + cdot(name) + esc(name) + '</h2><p>' + lead.length + ' tasks led · ' + contrib.length + ' contributions · ' + need.length + ' inputs awaited · ' + owe.length + ' inputs owed to others</p></div>' + (canAdd(name) ? '<button class="btn primary" data-act="new" data-c="' + esc(name) + '">Add a task</button>' : '') + '</div>';
    var subsHere = D.subs[name] || [], sf = (S.subf && S.subf[name]) || '';
    var leadAll = lead; if (sf) lead = lead.filter(function (t) { return t.subcommittee === sf; });
    var subCard = subsHere.length ? '<div class="card" style="margin-bottom:14px"><h3>Subcommittees' + (sf ? ' <button class="btn sm" data-act="subf" data-c="' + esc(name) + '" data-s="">Show all tasks</button>' : '') + '</h3><p class="muted small" style="margin:0 0 8px">Tap one to see only its tasks. Each subcommittee lead can update the tasks tagged to their subcommittee.</p><div class="subgrid">' + subsHere.map(function (x) {
      var ts = leadAll.filter(function (t) { return t.subcommittee === x.name; }), dn = ts.filter(function (t) { return t.status === 'Done'; }).length, od = ts.filter(overdue).length, ms = (D.mem[name] || []).filter(function (m) { return String(m.position).indexOf(x.name) >= 0; });
      return '<button type="button" class="subcard" data-act="subf" data-c="' + esc(name) + '" data-s="' + esc(x.name) + '" aria-pressed="' + (sf === x.name) + '"><b>' + esc(x.name) + '</b><span class="small muted">Lead: ' + esc(x.lead_name || 'not set') + ' · ' + ms.length + ' members</span><span class="small">' + ts.length + (ts.length === 1 ? ' task' : ' tasks') + ' · ' + dn + ' done' + (od ? ' · <span style="color:var(--block)">' + od + ' overdue</span>' : '') + '</span></button>';
    }).join('') + '</div></div>' : '';
    var prop = S.user.role === 'admin' ? D.proposed.filter(function (t) { return t.lead === name; }) : [];
    var att = [];
    leadAll.forEach(function (t) {
      if (!isOpen(t)) return; var why = '';
      if (t.repeat && missedPeriod(t)) why = periodLabel(t.repeat, missedPeriod(t)) + ' is not ticked. Tick it when it is done';
      else if (overdue(t)) why = 'Overdue, was due ' + fmtD(t.end);
      else if (t.start && t.start <= TODAY && t.status === 'Not started') why = 'Should have started on ' + fmtD(t.start) + '. Mark it in progress or post an update';
      else if (t.end && t.end >= TODAY && t.end <= addDays(TODAY, 30)) why = 'Due ' + fmtD(t.end);
      else if (t.toconfirm) why = 'Open question: ' + t.toconfirm;
      if (why) att.push({ t: t, why: why });
    });
    var attCard = '<div class="card" style="margin-bottom:14px"><h3>What needs attention' + (att.length ? ' <span class="chip warn">' + att.length + '</span>' : '') + '</h3><p class="muted small" style="margin:0 0 6px">Open a task and post a short update: what changed and what is next. This is what keeps the Chancellor, ICDE and the other committees informed.</p>' + list(att.slice(0, 8).map(function (x) { return taskItem(x.t, esc(x.why)); }), 'Nothing needs attention right now.') + (att.length > 8 ? '<p class="muted small">' + (att.length - 8) + ' more in the table below.</p>' : '') + '</div>';
    h2 = myStrip(name) + h2;
    h2 += info + subCard + attCard + (prop.length ? '<div class="card" style="margin-bottom:14px"><h3>Proposed from the contracts <span class="chip gate">' + prop.length + '</span></h3><p class="muted small" style="margin:0 0 6px">Only you can see these. They are not part of the plan until you accept them.</p>' + list(prop.map(function (t) { return taskItem(t, esc(t.source.split(';')[0])); }), '') + '</div>' : '') + '<div class="card"><h3>Tasks we lead</h3><div class="tw"><table><thead><tr><th>ID</th><th>Task</th><th>Date</th><th>Status</th>' + (mems.length ? '<th>Assigned to</th>' : '') + '<th>Needs approval from</th></tr></thead><tbody>' + lead.map(function (t) {
      return '<tr class="click cc' + (isMine(t) ? ' mine' : '') + '"' + ccAttr(t) + ' data-act="open" data-id="' + esc(t.id) + '"><td class="num muted">' + esc(t.id) + '</td><td>' + esc(t.title) + repChip(t) + subChip(t) + (t.source ? ' <span class="chip gate">Contract</span>' : '') + (t.toconfirm ? '<div class="small" style="color:var(--warn)">To confirm: ' + esc(t.toconfirm) + '</div>' : '') + '</td><td class="dt">' + esc(dateText(t)) + '<div>' + dsChip(t) + (overdue(t) ? ' <span class="chip late">Overdue</span>' : '') + (t.pending_start ? ' <span class="chip warn">Date change pending</span>' : '') + '</div></td><td>' + statusChip(t) + '</td>' + (mems.length ? '<td class="small">' + esc(t.assignee || '') + '</td>' : '') + '<td>' + apprChips(t, true) + '</td></tr>';
    }).join('') + '</tbody></table></div></div>';
    h2 += '<div class="grid g2" style="margin-top:14px">';
    h2 += '<div class="card"><h3>We are waiting for</h3>' + list(need.slice(0, 40).map(function (x) { return '<li class="item" data-act="open" data-id="' + esc(x.t.id) + '"><span class="id">' + esc(x.t.id) + '</span><div class="body"><div class="t"><b>' + esc(short(x.l.frm)) + '</b>: ' + esc(x.l.text.slice(0, 140)) + '</div><div class="meta">For ' + esc(x.t.title) + ' · Needed by ' + esc(dateText(x.t)) + '</div></div></li>'; }), 'We are not waiting on any other committee.') + '</div>';
    h2 += '<div class="card"><h3>Others are waiting for us</h3>' + list(owe.slice(0, 40).map(function (x) { return '<li class="item" data-act="open" data-id="' + esc(x.t.id) + '"><span class="id">' + esc(x.t.id) + '</span><div class="body"><div class="t"><b>' + esc(short(x.l.to)) + '</b>: ' + esc(x.l.text.slice(0, 140)) + '</div><div class="meta">For ' + esc(x.t.title) + ' · Needed by ' + esc(dateText(x.t)) + '</div></div></li>'; }), 'No other committee is waiting on us.') + '</div>';
    h2 += '</div><div class="card" style="margin-top:14px"><h3>Tasks we contribute to</h3>' + list(contrib.map(function (x) { return taskItem(x.t, 'led by ' + esc(short(x.t.lead)) + (x.note ? ' · ' + esc(x.note.slice(0, 90)) : '')); }), 'No contributions listed.') + (wide.length ? '<details class="more"><summary>Also applies to every committee (' + wide.length + ' conference-wide tasks)</summary>' + list(wide.map(function (t) { return taskItem(t, 'led by ' + esc(short(t.lead))); }), '') + '</details>' : '') + '</div>';
    return h2;
  }

  /* ---------- master plan ---------- */
  function filtered() {
    var f = S.f, q = f.q.toLowerCase();
    return D.canon.filter(function (t) {
      if (t.relation === 'duplicate') return false;
      if (f.c && t.lead !== f.c && (t.support || []).indexOf(f.c) < 0) return false;
      if (f.mine && myCommittees().indexOf(t.lead) < 0 && mySubs().indexOf(t.subcommittee) < 0 && !(t.support || []).some(function (c) { return myCommittees().indexOf(c) >= 0; })) return false;
      if (f.sub && t.subcommittee !== f.sub) return false;
      if (f.s && t.status !== f.s) return false;
      if (f.m && !(t.start && t.start.slice(0, 7) <= f.m && (t.end || t.start).slice(0, 7) >= f.m)) return false;
      if (q && (t.title + ' ' + t.id + ' ' + t.deliverable).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return (a.start || '9') < (b.start || '9') ? -1 : (a.start || '9') > (b.start || '9') ? 1 : a.id < b.id ? -1 : 1; });
  }
  function months() { var m = {}, out = []; D.canon.forEach(function (t) { if (t.start) m[t.start.slice(0, 7)] = 1; }); Object.keys(m).sort().forEach(function (k) { out.push(k); }); return out; }
  /* chips to jump between the committees a person belongs to */
  function myStrip(cur) {
    var m = myCommittees(); if (m.length < 2) return '';
    return '<div class="mystrip"><span class="small muted">Your committees</span>' + m.map(function (n) { return '<a class="chip mychip" href="#committees-' + esc(D.code[n]) + '"' + (n === cur ? ' aria-current="page"' : '') + ' style="--cc:' + ccv(n) + '">' + cdot(n) + esc(short(n)) + '</a>'; }).join('') + '</div>';
  }
  function myNav() {
    var m = myCommittees(), subs = mySubs().filter(function (n) { return D.subBy[n]; }); if (!m.length && !subs.length) return '';
    var link = function (code, label, dotFor) { return '<a href="#committees-' + esc(code) + '"' + (S.view === 'committees' && S.param === code ? ' aria-current="page"' : '') + '><span>' + cdot(dotFor) + esc(label) + '</span></a>'; };
    return '<div class="ng"><div class="nl">Your ' + (m.length ? 'committee' : 'subcommittee') + (m.length + subs.length > 1 ? 's' : '') + '</div>' + m.map(function (n) { return link(D.code[n], short(n), n); }).join('') + subs.map(function (n) { return link(D.code[D.subBy[n].committee], n.replace(/ Subcommittee$/, '') + ' (sub)', D.subBy[n].committee); }).join('') + '</div>';
  }
  function subOptions() { return (S.data.subcommittees || []).map(function (x) { return x.name; }); }
  function myCommittees() { return S.user && S.user.role === 'editor' ? (S.user.committees || []).filter(function (n) { return D.names.indexOf(n) >= 0; }) : []; }
  function mineBox() { return myCommittees().length || mySubs().length ? '<label class="small" style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox" id="fmine"' + (S.f.mine ? ' checked' : '') + '>Only my committee</label>' : ''; }
  function vPlan() {
    var h = '<div class="page-head"><div><h2>Master work plan</h2><p>Every task once, sorted by target date. Entries a committee only contributes to appear under the lead task.</p></div><div class="seg"><button data-act="mode" data-m="list" aria-pressed="' + (S.mode === 'list') + '">List</button><button data-act="mode" data-m="gantt" aria-pressed="' + (S.mode === 'gantt') + '">Gantt</button></div></div>';
    h += '<div class="filters"><input type="search" id="fq" placeholder="Search tasks" value="' + esc(S.f.q) + '" aria-label="Search tasks"><select id="fc" aria-label="Committee"><option value="">All committees</option>' + D.names.map(function (n) { return '<option value="' + esc(n) + '"' + (S.f.c === n ? ' selected' : '') + '>' + esc(short(n)) + '</option>'; }).join('') + '</select>' +
      (subOptions().length ? '<select id="fsub" aria-label="Subcommittee"><option value="">Any subcommittee</option>' + subOptions().map(function (n) { return '<option value="' + esc(n) + '"' + (S.f.sub === n ? ' selected' : '') + '>' + esc(n.replace(/ Subcommittee$/, '')) + '</option>'; }).join('') + '</select>' : '') + '<select id="fs" aria-label="Status"><option value="">Any status</option>' + STATUSES.map(function (s) { return '<option' + (S.f.s === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select>' +
      '<select id="fm" aria-label="Month"><option value="">Any month</option>' + months().map(function (m) { return '<option value="' + m + '"' + (S.f.m === m ? ' selected' : '') + '>' + fmtM(m + '-01') + '</option>'; }).join('') + '</select>' +
      mineBox() + '<button class="btn sm" data-act="clear">Clear</button></div><div id="planres">' + planResults() + '</div>';
    return h;
  }
  function planResults() { return S.mode === 'gantt' ? gantt() : planList(); }
  function planList() {
    var rows = filtered();
    return '<p class="muted small">' + rows.length + ' tasks</p><div class="tw"><table><thead><tr><th>ID</th><th>Task</th><th>Lead</th><th>Date</th><th>Status</th><th>With</th></tr></thead><tbody>' + rows.map(function (t) {
      var slip = t.base_end ? days(t.base_end, t.end) : 0;
      var kids = (D.kids[t.id] || []).filter(function (k) { return k.relation === 'contribution'; });
      return '<tr class="click cc' + (isMine(t) ? ' mine' : '') + '"' + ccAttr(t) + ' data-act="open" data-id="' + esc(t.id) + '"><td class="num muted">' + esc(t.id) + '</td><td>' + esc(t.title) + repChip(t) + subChip(t) + (t.source ? ' <span class="chip gate">Contract</span>' : '') + (kids.length ? ' <span class="chip">' + kids.length + ' contributions</span>' : '') + (t.flag_owner ? ' <span class="chip warn">Owner to agree</span>' : '') + '</td><td>' + esc(short(t.lead)) + '</td><td class="dt">' + esc(dateText(t)) + (slip ? ' <span class="chip ' + (slip > 0 ? 'late' : 'done') + '">' + (slip > 0 ? '+' : '') + slip + 'd</span>' : '') + '<div>' + dsChip(t) + '</div></td><td>' + statusChip(t) + (overdue(t) ? ' <span class="chip late">Overdue</span>' : '') + '</td><td class="small muted">' + esc((t.support || []).slice(0, 3).map(short).join(', ') + ((t.support || []).length > 3 ? ' +' + ((t.support || []).length - 3) : '')) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function gantt() {
    var rows = filtered(); if (!rows.length) return '<div class="empty">No tasks match the filters.</div>';
    var s0 = '2026-11-01', e0 = '2027-12-31'; rows.forEach(function (t) { if (t.start && t.start < s0) s0 = t.start.slice(0, 8) + '01'; if ((t.end || '') > e0) e0 = t.end; });
    var span = days(s0, e0) + 1, pct = function (d) { return days(s0, d) / span * 100; };
    var byC = {}; rows.forEach(function (t) { (byC[t.lead] = byC[t.lead] || []).push(t); });
    var mh = '', gr = '', d = parse(s0);
    while (iso(d) <= e0) { var k = iso(d); mh += '<span class="' + (d.getMonth() === 0 || k === s0 ? 'yr' : '') + '" style="left:' + pct(k) + '%">' + MON[d.getMonth()] + (d.getMonth() === 0 || k === s0 ? ' ' + d.getFullYear() : '') + '</span>'; gr += '<i style="left:' + pct(k) + '%"></i>'; d.setMonth(d.getMonth() + 1); }
    var msl = (S.data.milestones || []).filter(function (m) { return m.date >= s0 && m.date <= e0; });
    var overlay = '<div style="position:absolute;left:220px;right:0;top:0;bottom:0;pointer-events:none"><div class="g-grid">' + gr + '</div>' + msl.map(function (m) { return '<div class="g-ms" style="left:' + pct(m.date) + '%"></div>'; }).join('') + (TODAY >= s0 && TODAY <= e0 ? '<div class="g-today" style="left:' + pct(TODAY) + '%" title="Today"></div>' : '') + '</div>';
    var msrow = msl.map(function (m, i) { return '<span style="position:absolute;left:' + pct(m.date) + '%;top:' + (2 + (i % 2) * 13) + 'px;font-size:10px;color:var(--accent);white-space:nowrap;padding-left:3px" title="' + esc(m.label + ' (' + fmtD(m.date) + ')') + '">' + esc(m.label.length > 26 ? m.label.slice(0, 25) + '...' : m.label) + '</span>'; }).join('');
    var bar = function (t, tall) {
      var l = pct(t.start), w = t.precision === 'day' ? 0 : Math.max(pct(addDays(t.end || t.start, 1)) - l, 0.4);
      var cls = 'bar' + (tall ? ' tall' : '') + (t.precision === 'day' ? ' day' : '') + (t.status === 'Done' ? ' s-done' : t.status === 'In progress' ? ' s-prog' : t.status === 'Blocked' ? ' s-block' : '') + (t.datestatus === 'proposed' || t.datestatus === 'tbc' || t.datestatus === 'target' ? ' prop' : '') + (t.datestatus === 'conditional' ? ' cond' : '') + (overdue(t) ? ' late' : '');
      return '<div class="' + cls + '" data-act="open" data-id="' + esc(t.id) + '" title="' + esc(t.id + ' ' + t.title + ' (' + dateText(t) + ', ' + t.status + ')') + '" style="left:' + l + '%;width:' + w + '%;"></div>';
    };
    var out = '<div class="legend"><span><i style="background:var(--todo)"></i>Not started</span><span><i style="background:var(--prog)"></i>In progress</span><span><i style="background:var(--done)"></i>Done</span><span><i style="background:var(--block)"></i>Blocked</span><span><i style="background-image:repeating-linear-gradient(45deg,var(--todo) 0 3px,var(--surface) 3px 6px)"></i>Proposed date</span><span><i style="border:1.5px dashed var(--muted)"></i>Depends on approval</span><span><i style="background:var(--ink);opacity:.35;height:3px"></i>Baseline</span><span style="color:var(--accent)">| ICDE milestones</span><span style="color:var(--block)">| Today</span></div>';
    out += '<div class="gantt"><div class="g-in">' + overlay + '<div class="g-head"><div class="g-lab"><b>Committee</b> <span class="muted">(click to expand)</span></div><div class="g-track"><div class="g-months">' + mh + '</div><div class="g-months" style="height:30px">' + msrow + '</div></div></div>';
    D.names.forEach(function (n) {
      var list_ = byC[n]; if (!list_) return; var openRow = !!S.open[n];
      var lanes = [];
      if (!openRow) {
        list_.slice().sort(function (a, b) { return a.start < b.start ? -1 : 1; }).forEach(function (t) {
          var e = t.precision === 'day' ? addDays(t.start, 6) : addDays(t.end || t.start, 2), placed = false;
          for (var i = 0; i < lanes.length; i++) { if (lanes[i].end < t.start) { lanes[i].end = e; lanes[i].items.push(t); placed = true; break; } }
          if (!placed) lanes.push({ end: e, items: [t] });
        });
      }
      var hgt = openRow ? 30 : Math.max(lanes.length, 1) * 12 + 10;
      out += '<div class="g-row committee"><div class="g-lab">' + cdot(n) + '<button data-act="gc" data-c="' + esc(n) + '" aria-expanded="' + openRow + '">' + (openRow ? '▾ ' : '▸ ') + esc(short(n)) + '</button> <span class="muted">' + list_.length + '</span></div><div class="g-track" style="height:' + hgt + 'px">' +
        (openRow ? '' : lanes.map(function (ln, i) { return ln.items.map(function (t) { var b = bar(t, false); return b.replace('style="', 'style="top:' + (5 + i * 12) + 'px;'); }).join(''); }).join('')) + '</div></div>';
      if (openRow) list_.forEach(function (t) {
        out += '<div class="g-row"><div class="g-lab sub cc"' + ccAttr(t) + ' data-act="open" data-id="' + esc(t.id) + '" title="' + esc(t.title) + '">' + esc(t.id) + ' ' + esc(t.title) + '</div><div class="g-track" style="height:24px">' + bar(t, true) +
          (t.base_start ? '<div class="base" style="left:' + pct(t.base_start) + '%;width:' + Math.max(pct(addDays(t.base_end, 1)) - pct(t.base_start), 0.3) + '%;top:19px"></div>' : '') + '</div></div>';
      });
    });
    return out + '</div></div>';
  }

  /* ---------- dependencies ---------- */
  function matrixData(withCoord) {
    var m = {}; D.links.forEach(function (x) {
      if (x.l.kind !== 'provides' && !withCoord) return; if (x.l.frm === x.l.to) return;
      var k = x.l.frm + '>' + x.l.to; (m[k] = m[k] || []).push(x);
    }); return m;
  }
  function vDeps() {
    var coord = !!S.coord, m = matrixData(coord), max = 1; Object.keys(m).forEach(function (k) { max = Math.max(max, m[k].length); });
    var h = '<div class="page-head"><div><h2>Dependencies between committees</h2><p>Read each row as "provides to". A darker cell means more tasks where the row committee must hand something to the column committee. Directions come from the plan\'s wording and should be checked by the committees.</p></div><label class="small"><input type="checkbox" id="coord"' + (coord ? ' checked' : '') + '> Include "coordinate with" links</label></div>';
    h += '<div class="card"><div style="overflow-x:auto"><table class="matrix"><thead><tr><th></th>' + D.names.map(function (n) { return '<th title="' + esc(n) + '">' + esc(D.code[n]) + '</th>'; }).join('') + '<th class="rh">Total out</th></tr></thead><tbody>';
    D.names.forEach(function (a) {
      var tot = 0; var cells = D.names.map(function (b) {
        if (a === b) return '<td class="self"></td>'; var arr = m[a + '>' + b]; if (!arr) return '<td class="z">0</td>'; tot += arr.length;
        var sel = S.sel && S.sel[0] === a && S.sel[1] === b;
        return '<td data-act="cell" data-a="' + esc(a) + '" data-b="' + esc(b) + '" class="' + (sel ? 'sel' : '') + '" style="background:color-mix(in srgb, var(--accent) ' + Math.round(14 + 70 * arr.length / max) + '%, var(--surface));color:' + (arr.length / max > .45 ? 'var(--accent-ink)' : 'var(--ink)') + '" title="' + esc(short(a) + ' to ' + short(b) + ': ' + arr.length + ' tasks') + '">' + arr.length + '</td>';
      }).join('');
      h += '<tr><th class="rh" title="' + esc(a) + '">' + esc(short(a)) + ' <span class="muted">' + esc(D.code[a]) + '</span></th>' + cells + '<th class="rh num">' + tot + '</th></tr>';
    });
    h += '</tbody></table></div><div class="legend"><span>' + D.names.map(function (n) { return esc(D.code[n]) + ' = ' + esc(short(n)); }).join(' · ') + '</span></div></div>';
    if (S.sel) {
      var arr = (m[S.sel[0] + '>' + S.sel[1]] || []).slice().sort(function (a, b) { return a.t.start < b.t.start ? -1 : 1; });
      h += '<div class="card" style="margin-top:14px"><h3>' + esc(short(S.sel[0])) + ' provides to ' + esc(short(S.sel[1])) + ' (' + arr.length + ')</h3>' + list(arr.map(function (x) { return '<li class="item" data-act="open" data-id="' + esc(x.t.id) + '"><span class="id">' + esc(x.t.id) + '</span><div class="body"><div class="t">' + esc(x.t.title) + '</div><div class="meta">' + esc(dateText(x.t)) + ' · ' + esc(x.l.text.slice(0, 160)) + '</div></div>' + statusChip(x.t) + '</li>'; }), 'No links.') + '</div>';
    }
    var load = D.names.map(function (n) { var o = 0, i = 0; D.links.forEach(function (x) { if (x.l.kind !== 'provides') return; if (x.l.frm === n) o++; if (x.l.to === n) i++; }); return { n: n, o: o, i: i }; }).sort(function (a, b) { return b.o - a.o; });
    var mx = Math.max.apply(null, load.map(function (x) { return Math.max(x.o, x.i); }).concat([1]));
    h += '<div class="card" style="margin-top:14px"><h3>Who others depend on most</h3><p class="muted small" style="margin-top:0">Handoffs out of a committee (others are waiting for it) and into it (it is waiting for others).</p>' + load.map(function (x) {
      return '<div class="bar-row" style="grid-template-columns:150px 1fr 1fr"><span class="bl">' + esc(short(x.n)) + '</span><div><div class="stack" style="height:8px"><i style="width:' + x.o / mx * 100 + '%;background:var(--accent)"></i></div><span class="small muted">' + x.o + ' owed to others</span></div><div><div class="stack" style="height:8px"><i style="width:' + x.i / mx * 100 + '%;background:var(--warn)"></i></div><span class="small muted">' + x.i + ' awaited</span></div></div>';
    }).join('') + '</div>';
    return h;
  }

  /* ---------- this week ---------- */
  function weekBounds() { var d = parse(TODAY), dow = (d.getDay() + 6) % 7, mon = addDays(TODAY, -dow + 7 * (S.weekOff || 0)); return [mon, addDays(mon, 6)]; }
  function weekItem(t, why) {
    var q = '';
    if (canEdit(t) && t.repeat) { var ck = missedPeriod(t) || currentPeriod(t, weekBounds()[0]); if (ck) q = '<button class="btn sm" data-act="period" data-id="' + esc(t.id) + '" data-k="' + esc(ck) + '" aria-pressed="' + periodDone(t, ck) + '">' + (periodDone(t, ck) ? 'Ticked: ' : 'Tick ') + esc(periodLabel(t.repeat, ck).replace(/^week of /, '')) + '</button>'; }
    else if (canEdit(t)) q = (t.status === 'Not started' ? '<button class="btn sm" data-act="quick" data-id="' + esc(t.id) + '" data-s="In progress">Start</button>' : '') + '<button class="btn sm" data-act="quick" data-id="' + esc(t.id) + '" data-s="Done">Mark done</button>';
    return '<li class="item" data-act="open" data-id="' + esc(t.id) + '"><span class="id">' + esc(t.id) + '</span><div class="body"><div class="t">' + esc(t.title) + '</div><div class="meta">' + esc(short(t.lead)) + ' · ' + esc(dateText(t)) + (why ? ' · ' + why : '') + '</div></div>' + statusChip(t) + (q ? '<span class="qa">' + q + '</span>' : '') + '</li>';
  }
  function vWeek() {
    var u = S.user, mine = (u.committees || []).filter(function (n) { return D.names.indexOf(n) >= 0; });
    var subs = mySubs().filter(function (n) { return D.subBy[n]; });
    var sel = S.wc !== undefined ? S.wc : (u.role === 'editor' && (mine.length || subs.length) ? (mine.length + subs.length > 1 ? '*mine' : mine.length ? mine[0] : 'sub:' + subs[0]) : '');
    var isSub = sel.indexOf('sub:') === 0, selSet = sel === '*mine' ? mine : sel && !isSub ? [sel] : [];
    var inSel = function (c) { return !selSet.length || selSet.indexOf(c) >= 0; };
    /* a task is in the chosen view if its committee matches, or it is tagged to the chosen (or one of my) subcommittees */
    var matchT = function (t) { if (!sel) return true; if (isSub) return t.subcommittee === sel.slice(4); if (sel === '*mine') return mine.indexOf(t.lead) >= 0 || subs.indexOf(t.subcommittee) >= 0; return t.lead === sel; };
    var wb = weekBounds(), ws = wb[0], we = wb[1], now = !(S.weekOff || 0);
    var pool = D.canon.filter(function (t) { return t.relation !== 'duplicate' && isOpen(t) && matchT(t); });
    var seen = {}, take = function (arr) { return arr.filter(function (t) { if (seen[t.id]) return false; seen[t.id] = 1; return true; }); };
    var byEnd = function (a, b) { return (a.end || '9') < (b.end || '9') ? -1 : 1; };
    var rec = pool.filter(function (t) { return t.repeat && currentPeriod(t, ws) && t.start <= we && t.end >= ws; });
    var late = now ? take(pool.filter(function (t) { return t.repeat ? overdue(t) : t.end && t.end < ws; }).sort(byEnd)) : [];
    var due = take(pool.filter(function (t) { return t.end && t.end >= ws && t.end <= we; }).sort(byEnd));
    var begin = take(pool.filter(function (t) { return t.start && t.start >= ws && t.start <= we && t.status === 'Not started'; }).sort(function (a, b) { return a.start < b.start ? -1 : 1; }));
    var stale = now ? take(pool.filter(function (t) { return t.status === 'In progress' && (t.updated_at || '').slice(0, 10) < addDays(TODAY, -14); })) : [];
    var owe = sel && !isSub && selSet.length ? D.canon.filter(function (t) { return isOpen(t) && t.relation !== 'duplicate' && !inSel(t.lead) && (t.support || []).some(inSel) && t.end && t.end <= we && (now || t.end >= ws); }).sort(byEnd) : [];
    var title = fmtD(ws).replace(/ \d{4}$/, '') + ' to ' + fmtD(we);
    var h = '<div class="page-head"><div><h2>' + (now ? 'This week' : 'Week of ' + esc(fmtD(ws))) + '</h2><p>' + esc(title) + '. Built from the plan, so there is nothing extra to fill in. Post an update on anything you touched.</p></div>' +
      '<div class="filters" style="margin:0"><select id="wc" aria-label="Committee">' + (mine.length + subs.length > 1 ? '<option value="*mine"' + (sel === '*mine' ? ' selected' : '') + '>' + (subs.length ? 'All mine' : 'All my committees') + '</option>' : '') + subs.map(function (n) { return '<option value="sub:' + esc(n) + '"' + (sel === 'sub:' + n ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '<option value="">All committees</option>' + D.names.map(function (n) { return '<option value="' + esc(n) + '"' + (sel === n ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select>' +
      '<button class="btn sm" data-act="week" data-d="-1">Previous week</button><button class="btn sm" data-act="week" data-d="0">This week</button><button class="btn sm" data-act="week" data-d="1">Next week</button></div></div>';
    var sec = function (t, arr, empty, why) { return '<div class="card" style="margin-bottom:14px"><h3>' + esc(t) + ' <span class="chip ' + (arr.length && /Overdue|No update/.test(t) ? 'warn' : '') + '">' + arr.length + '</span></h3>' + list(arr.map(function (x) { return weekItem(x, typeof why === 'function' ? why(x) : why); }), empty) + '</div>'; };
    if (now) h += sec('Overdue, from earlier weeks', late, 'Nothing overdue.', function (t) { return t.repeat && missedPeriod(t) ? esc(periodLabel(t.repeat, missedPeriod(t))) + ' not ticked' : 'was due ' + esc(fmtD(t.end)); });
    h += sec('Repeating tasks', rec, 'No repeating task covers this week.', function (t) { var k = currentPeriod(t, ws); return esc(REPEATS[t.repeat]) + ' · ' + esc(periodLabel(t.repeat, k)) + (periodDone(t, k) ? ' · ticked' : ' · not yet ticked'); });
    h += sec('Due ' + (now ? 'this week' : 'that week'), due, now ? 'Nothing is due this week.' : 'Nothing is due that week.');
    h += sec('Starting ' + (now ? 'this week' : 'that week'), begin, now ? 'Nothing is scheduled to start this week.' : 'Nothing is scheduled to start that week.');
    if (sel && !isSub && selSet.length) h += sec('Inputs ' + (sel === '*mine' ? 'your committees owe' : short(sel) + ' owes') + ' to other committees', owe, 'No supporting tasks are due.', function (t) { return 'for ' + esc(short(t.lead)); });
    if (now) h += sec('No update in 2 weeks', stale, 'Every task in progress has a recent update.');
    return h;
  }

  /* ---------- decisions and approvals ---------- */
  function vDecisions() {
    var c = D.canon.filter(function (t) { return t.relation !== 'duplicate' && isOpen(t); }).sort(function (a, b) { return (a.start || '9') < (b.start || '9') ? -1 : 1; });
    var h = '<div class="page-head"><div><h2>Approvals</h2><p>Work that is already in progress and waiting for someone outside the lead committee. Tasks that have not started are not listed here, even if an approval is flagged on them.</p></div></div><div class="grid g2">';
    APPROVERS.forEach(function (a) {
      var arr = c.filter(function (t) { return needsNow(t) && (t.approvals || []).indexOf(a) >= 0; });
      h += '<div class="card"><h3>Waiting on ' + esc(a) + ' <span class="chip gate">' + arr.length + '</span></h3>' + list(arr.map(function (t) { return taskItem(t); }), 'Nothing flagged.') + '</div>';
    });
    var oth = c.filter(function (t) { return needsNow(t) && t.approval_other; });
    h += '<div class="card"><h3>Waiting on others <span class="chip gate">' + oth.length + '</span></h3>' + list(oth.map(function (t) { return taskItem(t, '<b>' + esc(t.approval_other) + '</b>'); }), 'Nothing flagged.') + '</div>';
    h += '</div>';
    var tc = c.filter(function (t) { return t.toconfirm; });
    h += '<div class="card" style="margin-top:14px"><h3>Open questions <span class="chip warn">' + tc.length + '</span></h3>' + list(tc.map(function (t) { return taskItem(t, '<b>Open question:</b> ' + esc(t.toconfirm)); }), 'No open questions.') + '</div>';
    var pr = c.filter(function (t) { return t.datestatus && t.datestatus !== 'firm'; });
    h += '<div class="card" style="margin-top:14px"><h3>Dates that are not yet firm <span class="chip warn">' + pr.length + '</span></h3>' + list(pr.map(function (t) { return taskItem(t, esc(DATE_STATUS[t.datestatus])); }), 'All dates are firm.') + '</div>';
    var ow = c.filter(function (t) { return t.flag_owner; });
    h += '<div class="card" style="margin-top:14px"><h3>Ownership to agree <span class="chip warn">' + ow.length + '</span></h3>' + list(ow.map(function (t) { return taskItem(t, esc(t.flag_owner)); }), 'No overlaps flagged.') + '</div>';
    return h;
  }


  /* ---------- contract obligations ---------- */
  function stateOf(t) { return t.review === 'proposed' ? 'proposed' : t.review ? 'rejected' : 'accepted'; }
  function vContract() {
    var all = S.data.tasks.filter(function (t) { return t.source; }), isAd = S.user.role === 'admin';
    var cnt = { proposed: 0, accepted: 0, rejected: 0 }; all.forEach(function (t) { cnt[stateOf(t)]++; });
    var open = all.filter(function (t) { return stateOf(t) !== 'rejected' && isOpen(t) && t.end && t.end >= TODAY; }).sort(function (a, b) { return a.end < b.end ? -1 : 1; })[0];
    var h = '<div class="page-head"><div><h2>Contract obligations</h2><p>Tasks drawn from the ICDE Host Agreement and the venue agreement. Proposed tasks do not count in progress, overdue or the Gantt chart until the chair accepts them. Dates are worked out from the contract text. Amounts stay in the contracts.</p></div></div>';
    h += '<div class="kpis"><div class="kpi' + (cnt.proposed ? ' alert' : '') + '"><b>' + cnt.proposed + '</b><span>proposed, waiting for review</span></div><div class="kpi"><b>' + cnt.accepted + '</b><span>accepted into the plan</span></div><div class="kpi"><b>' + cnt.rejected + '</b><span>rejected</span></div>' +
      '<div class="kpi"><b>' + (open ? days(TODAY, open.end) : 0) + '</b><span>days to the next contract date' + (open ? ' (' + esc(fmtD(open.end)) + ')' : '') + '</span></div></div>';
    h += '<div class="filters"><div class="seg" role="group" aria-label="Review state">' + [['proposed', 'Proposed'], ['accepted', 'Accepted'], ['rejected', 'Rejected']].map(function (x) { return '<button data-act="cstate" data-s="' + x[0] + '" aria-pressed="' + (S.cs === x[0]) + '">' + x[1] + ' (' + cnt[x[0]] + ')</button>'; }).join('') + '</div>' +
      '<div class="seg" role="group" aria-label="Group by"><button data-act="cgroup" data-g="date" aria-pressed="' + (S.cg === 'date') + '">By date</button><button data-act="cgroup" data-g="committee" aria-pressed="' + (S.cg === 'committee') + '">By committee</button></div>' +
      (isAd && S.cs === 'proposed' && cnt.proposed ? '<button class="btn sm ' + (S.cAll ? 'primary' : '') + '" data-act="acceptall">' + (S.cAll ? 'Confirm: accept all ' + cnt.proposed : 'Accept all ' + cnt.proposed) + '</button>' : '') + '</div>';
    var rows = all.filter(function (t) { return stateOf(t) === S.cs; }).sort(function (a, b) { return (a.start || '9') < (b.start || '9') ? -1 : (a.start || '9') > (b.start || '9') ? 1 : a.id < b.id ? -1 : 1; });
    if (!rows.length) return h + '<div class="empty">' + (S.cs === 'proposed' ? 'Nothing is waiting for review.' : S.cs === 'accepted' ? 'No contract task has been accepted yet.' : 'Nothing has been rejected.') + '</div>';
    var groups = [], idx = {};
    rows.forEach(function (t) {
      var g = S.cg === 'committee' ? short(t.lead) : (t.start ? fmtM(t.start) : 'Date to be set');
      if (!(g in idx)) { idx[g] = groups.length; groups.push({ g: g, items: [] }); } groups[idx[g]].items.push(t);
    });
    if (S.cg === 'committee') groups.sort(function (a, b) { return a.g < b.g ? -1 : 1; });
    h += '<div class="tw"><table><thead><tr><th>When</th><th>Task</th><th>Lead</th><th>Contract basis</th><th></th></tr></thead><tbody>';
    groups.forEach(function (gr) {
      h += '<tr class="grp"><td colspan="5">' + esc(gr.g) + ' <span class="muted">(' + gr.items.length + ')</span></td></tr>';
      gr.items.forEach(function (t) {
        var act = isAd ? (S.cs === 'proposed' ? '<button class="btn sm primary" data-act="review" data-d="accept" data-id="' + esc(t.id) + '">Accept</button> <button class="btn sm" data-act="review" data-d="reject" data-id="' + esc(t.id) + '">Reject</button>' : S.cs === 'rejected' ? '<button class="btn sm" data-act="review" data-d="restore" data-id="' + esc(t.id) + '">Restore</button>' : statusChip(t)) : (S.cs === 'accepted' ? statusChip(t) : '');
        h += '<tr class="click" data-act="open" data-id="' + esc(t.id) + '"><td class="dt">' + esc(dateText(t)) + '<div>' + dsChip(t) + (apprList(t).length ? ' <span class="chip gate">Needs ' + esc(apprList(t).join(', ')) + '</span>' : '') + '</div></td><td>' + esc(t.title) + (t.toconfirm ? '<div class="small" style="color:var(--warn)">To confirm: ' + esc(t.toconfirm) + '</div>' : '') + '</td><td>' + esc(short(t.lead)) + '</td><td class="small muted">' + esc(t.source) + '</td><td class="act">' + act + '</td></tr>';
      });
    });
    return h + '</tbody></table></div>';
  }

  /* ---------- ICDE report ---------- */
  function monthBounds(m) { var a = m + '-01', b = m + '-' + pad(lastDay(a)); return [a, b]; }
  function bullets(arr) { return arr.length ? arr.map(function (x) { return '- ' + x; }).join('\n') : '- None this month.'; }
  function draftReport(m) {
    var mb = monthBounds(m), all = D.canon.filter(function (t) { return t.relation !== 'duplicate'; });
    var ups = S.data.updates.filter(function (u) { return String(u.at).slice(0, 7) === m && (u.type === 'note' || u.type === 'edit' || u.type === 'create') && u.text; });
    var acc = all.filter(function (t) { return t.status === 'Done' && t.end && t.end.slice(0, 7) === m; }).map(function (t) { return t.id + ' ' + short(t.lead) + ': ' + t.title + ' (done)'; })
      .concat(ups.map(function (u) { return u.task_id + ': ' + u.text; }));
    var lim = addDays(mb[1], 60);
    var next = all.filter(function (t) { return isOpen(t) && t.start && t.start > mb[1] && t.start <= lim && days(t.start, t.end || t.start) <= 120; }).sort(function (a, b) { return a.start < b.start ? -1 : 1; }).slice(0, 14).map(function (t) { return dateText(t) + ': ' + t.title + ' (' + short(t.lead) + ')'; });
    var issues = all.filter(overdue).map(function (t) { return t.id + ' overdue since ' + fmtD(t.end) + ': ' + t.title; })
      .concat(all.filter(function (t) { return t.status === 'Blocked'; }).map(function (t) { return t.id + ' blocked: ' + t.title; }))
      .concat(pendingDates().map(function (t) { return t.id + ' date change awaiting approval: ' + t.title; }))
      .concat((function () { var seenF = {}; return all.filter(function (t) { if (!t.flag_owner || !isOpen(t) || seenF[t.flag_owner]) return false; seenF[t.flag_owner] = 1; return true; }).map(function (t) { return t.id + ' ownership to agree: ' + t.flag_owner; }); })());
    var ask = all.filter(function (t) { return needsNow(t) && (t.approvals || []).some(function (a) { return /^ICDE/.test(a); }); }).sort(function (a, b) { return a.start < b.start ? -1 : 1; }).slice(0, 10).map(function (t) { return 'Approval needed for ' + t.id + ' ' + t.title + ' (' + dateText(t) + ')'; });
    return { acc: bullets(acc), next: bullets(next), issues: bullets(issues), ask: bullets(ask), fig: { reg: '', sub: '', acc: '', spo: '', exh: '', bank: '' } };
  }
  function vReport() {
    var cur = S.param && /^\d{4}-\d{2}$/.test(S.param) ? S.param : TODAY.slice(0, 7);
    if (!S.rep || S.rep.month !== cur) { S.rep = Object.assign({ month: cur }, draftReport(cur)); }
    var r = S.rep, saved = S.data.reports || [];
    var h = '<div class="page-head"><div><h2>ICDE monthly report</h2><p>A draft built from the plan and committee updates. Edit the text, add the figures ICDE asks for, then save a dated copy of what was sent.</p></div><div class="field" style="margin:0"><label for="rm">Month</label><input id="rm" type="month" value="' + esc(cur) + '"></div></div>';
    h += '<div class="grid g2"><div class="card report-sec"><h3>Key accomplishments</h3><textarea id="r-acc" aria-label="Key accomplishments">' + esc(r.acc) + '</textarea></div><div class="card report-sec"><h3>Upcoming milestones (next 60 days)</h3><textarea id="r-next" aria-label="Upcoming milestones">' + esc(r.next) + '</textarea></div>' +
      '<div class="card report-sec"><h3>Issues affecting the conference</h3><textarea id="r-issues" aria-label="Issues">' + esc(r.issues) + '</textarea></div><div class="card report-sec"><h3>Decisions or support requested from ICDE</h3><textarea id="r-ask" aria-label="Requests to ICDE">' + esc(r.ask) + '</textarea></div></div>';
    h += '<div class="card" style="margin-top:14px"><h3>Figures for this month</h3><p class="muted small" style="margin-top:0">The host agreement asks for registrations, submissions, exhibits, sponsorships and bank statements. These are typed in, not taken from the task plan.</p><div class="fig">' +
      [['reg', 'Registrations'], ['sub', 'Abstracts submitted'], ['acc', 'Accepted'], ['spo', 'Sponsors confirmed (number and amount)'], ['exh', 'Exhibitors'], ['bank', 'Bank balance and statement reference']].map(function (f) { return '<div class="field"><label for="f-' + f[0] + '">' + f[1] + '</label><input id="f-' + f[0] + '" value="' + esc(r.fig[f[0]]) + '"></div>'; }).join('') + '</div></div>';
    h += '<div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" data-act="copyrep">Copy report text</button>' + (S.user.role === 'admin' ? '<button class="btn" data-act="saverep">Save a dated copy</button>' : '') + '<button class="btn" data-act="redraft">Rebuild draft from the plan</button></div>';
    h += '<div class="card" style="margin-top:14px"><h3>Saved reports</h3>' + (saved.length ? saved.map(function (s, i) { return '<div class="item" data-act="showrep" data-i="' + i + '"><div class="body"><div class="t">' + esc(s.month) + '</div><div class="meta">Saved ' + esc(String(s.saved_at).slice(0, 10)) + ' by ' + esc(s.saved_by) + '</div></div></div>'; }).join('') : '<div class="empty">No saved reports yet.</div>') + '</div>';
    return h;
  }
  function repText() {
    var r = S.rep, g = function (id) { var e = $('#' + id); return e ? e.value : ''; };
    ['acc', 'next', 'issues', 'ask'].forEach(function (k) { r[k] = g('r-' + k) || r[k]; });
    ['reg', 'sub', 'acc', 'spo', 'exh', 'bank'].forEach(function (k) { var e = $('#f-' + k); if (e) r.fig[k] = e.value; });
    return 'ICDE 2027 Organizing Committee progress report, ' + r.month + '\n\nKey accomplishments\n' + r.acc + '\n\nUpcoming milestones\n' + r.next + '\n\nIssues affecting the conference\n' + r.issues + '\n\nDecisions or support requested from ICDE\n' + r.ask +
      '\n\nFigures\nRegistrations: ' + r.fig.reg + '\nAbstracts submitted: ' + r.fig.sub + '\nAccepted: ' + r.fig.acc + '\nSponsors confirmed: ' + r.fig.spo + '\nExhibitors: ' + r.fig.exh + '\nBank: ' + r.fig.bank + '\n';
  }

  /* ---------- drawer ---------- */
  /* which of the listed outside parties must approve: one tick each, so there is a single list of parties */
  function partyApprovers(parties, ticked) {
    if (!parties.length) return '';
    return '<span>Which of these must approve? (leave blank if none)</span><div class="checks">' + parties.map(function (x) { return '<label><input type="checkbox" name="e-xa" value="' + esc(x) + '"' + (ticked.indexOf(x) >= 0 ? ' checked' : '') + '>' + esc(x) + '</label>'; }).join('') + '</div>';
  }
  function splitParties(v) { var out = []; String(v || '').split(',').forEach(function (x) { x = x.trim(); if (x && out.indexOf(x) < 0) out.push(x); }); return out; }
  /* Subcommittee tag: committee editors and the chair choose it; a subcommittee lead sees theirs and cannot move a task in or out. */
  function subField(t, nw) {
    var subs = D.subs[t.lead] || []; if (!subs.length) return '';
    var free = S.user.role === 'admin' || isCommEditor(t.lead);
    if (!free) return t.subcommittee ? '<p class="small muted">Subcommittee: ' + esc(t.subcommittee) + '</p>' : '';
    return '<div class="field"><label for="e-sub">Subcommittee</label><select id="e-sub"><option value="">None, committee-wide</option>' + subs.map(function (x) { return '<option value="' + esc(x.name) + '"' + (t.subcommittee === x.name ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></div>';
  }
  function periodSection(t, edit) {
    var ps = periodsOf(t), miss = missedPeriod(t), unit = t.repeat === 'weekly' ? 'week' : t.repeat === 'monthly' ? 'month' : 'quarter', cur = currentPeriod(t);
    return '<div class="sec"><h3>Each ' + unit + ' <span class="chip">' + ps.filter(function (k) { return periodDone(t, k); }).length + ' of ' + ps.length + ' done</span></h3>' +
      (edit ? '<p class="small muted">Tick each ' + unit + ' when it is done. The task stays open until you mark the whole task done.</p>' : '') + '<div class="periods">' +
      ps.map(function (k) { var dn = periodDone(t, k); return '<button type="button" class="pbtn' + (dn ? ' on' : '') + (k === cur ? ' cur' : '') + (k === miss ? ' late' : '') + '" data-act="period" data-id="' + esc(t.id) + '" data-k="' + esc(k) + '" aria-pressed="' + dn + '"' + (edit ? '' : ' disabled') + '>' + (dn ? '✓ ' : '') + esc(periodLabel(t.repeat, k).replace(/^week of /, '')) + '</button>'; }).join('') + '</div>' +
      (miss ? '<p class="small" style="color:var(--warn);margin:6px 0 0">' + esc(periodLabel(t.repeat, miss)) + ' is not ticked yet.</p>' : '') + '</div>';
  }
  function drawer() {
    var d = S.drawer; if (!d) return '';
    var nw = d.new, t = nw ? { id: '', title: '', lead: nw, support: [], external: [], start: '', end: '', status: 'Not started', datestatus: 'proposed', approvals: [], prereq: '', deliverable: '', toconfirm: '', links: [], subcommittee: (!isCommEditor(nw) && S.user.role !== 'admin' ? (mySubs().filter(function (n) { return D.subBy[n] && D.subBy[n].committee === nw; })[0] || '') : '') } : D.byId[d.id];
    if (!t) return '';
    var edit = nw ? true : canEdit(t), note = nw ? false : canNote(t), isAd = S.user.role === 'admin';
    var h = '<div class="scrim" data-act="close"></div><aside class="drawer" role="dialog" aria-label="Task details"><button class="btn sm" data-act="close" style="float:right">Close</button>';
    h += '<div class="muted small">' + (nw ? 'New task for ' + esc(short(t.lead)) : esc(t.id) + ' · led by ' + esc(t.lead)) + '</div>';
    if (!nw) {
      h += '<h2>' + esc(t.title) + '</h2><div>' + (t.review === 'proposed' ? '<span class="chip gate">Proposed from contract</span> ' : t.review ? '<span class="chip late">Rejected</span> ' : t.source ? '<span class="chip gate">Contract</span> ' : '') + statusChip(t) + ' ' + dsChip(t) + (overdue(t) ? ' <span class="chip late">Overdue</span>' : '') + ' ' + apprChips(t, true) + '</div>';
      h += '<div class="sec"><h3>When</h3><p>' + esc(dateText(t)) + (t.condition ? ' (' + esc(t.condition) + ')' : '') + '</p>' + (t.base_start ? '<p class="small muted">Baseline: ' + esc(fmtD(t.base_start)) + ' to ' + esc(fmtD(t.base_end)) + (t.base_end !== t.end ? ' · now ' + (days(t.base_end, t.end) > 0 ? '+' : '') + days(t.base_end, t.end) + ' days' : '') + '</p>' : '') + '</div>';
      if (t.repeat) h += periodSection(t, edit);
      if (t.review) h += '<div class="callout info"><b>' + (t.review === 'proposed' ? 'This task comes from the contracts and is waiting for the chair.' : 'This task was rejected and is hidden from the plan.') + '</b> It does not count in progress, overdue or the Gantt chart until it is accepted.' + (isAd ? '<div style="margin-top:6px">' + (t.review === 'proposed' ? '<button class="btn sm primary" data-act="review" data-d="accept" data-id="' + esc(t.id) + '">Accept into the plan</button> <button class="btn sm" data-act="review" data-d="reject" data-id="' + esc(t.id) + '">Reject</button>' : '<button class="btn sm" data-act="review" data-d="restore" data-id="' + esc(t.id) + '">Restore for review</button>') + '</div>' : '') + '</div>';
      if (t.source) h += '<div class="sec"><h3>Contract basis</h3><p>' + esc(t.source) + '</p></div>';
      if (t.pending_start) h += '<div class="callout warn"><b>Date change awaiting approval:</b> ' + esc(t.pending_by) + ' proposes ' + esc(fmtD(t.pending_start)) + (t.pending_end && t.pending_end !== t.pending_start ? ' to ' + esc(fmtD(t.pending_end)) : '') + (t.pending_reason ? '. Reason: ' + esc(t.pending_reason) : '') + (S.user.role === 'admin' ? '<div style="margin-top:6px"><button class="btn sm primary" data-act="approve" data-id="' + esc(t.id) + '" data-ok="1">Approve</button> <button class="btn sm" data-act="approve" data-id="' + esc(t.id) + '" data-ok="0">Decline</button></div>' : '') + '</div>';
      if (t.toconfirm) h += '<div class="callout warn"><b>Open question:</b> ' + esc(t.toconfirm) + '</div>';
      if (t.flag_owner) h += '<div class="callout bad"><b>Ownership:</b> ' + esc(t.flag_owner) + '</div>';
      if (t.assignee) h += '<div class="sec"><h3>Assigned to</h3><p>' + esc(t.assignee) + '</p></div>';
      h += '<div class="sec"><h3>Deliverable</h3><p>' + esc(t.deliverable || 'Not stated') + '</p></div><div class="sec"><h3>Needs and coordination</h3><p>' + esc(t.prereq || 'Not stated') + '</p></div>';
      h += '<div class="sec"><h3>Committees involved</h3>' + (t.subcommittee ? '<p class="small">Subcommittee: <b>' + esc(t.subcommittee) + '</b>' + (D.subBy[t.subcommittee] && D.subBy[t.subcommittee].lead_name ? ' · lead ' + esc(D.subBy[t.subcommittee].lead_name) : '') + '</p>' : '') + '<p>' + [t.lead].concat(t.support || []).map(function (c) { return '<a class="chip" href="#committees-' + esc(D.code[c] || '') + '">' + esc(short(c)) + '</a>'; }).join(' ') + '</p>' + ((t.external || []).length ? '<p class="small muted">Also: ' + esc(t.external.join(', ')) + '</p>' : '') + '</div>';
      var provs = (t.links || []).filter(function (l) { return l.kind === 'provides'; });
      if (provs.length) h += '<div class="sec"><h3>Handoffs</h3>' + provs.map(function (l) { return '<p class="small"><b>' + esc(short(l.frm)) + '</b> provides to <b>' + esc(short(l.to)) + '</b>: ' + esc(l.text) + '</p>'; }).join('') + '</div>';
      var kids = D.kids[t.id] || []; if (kids.length) h += '<div class="sec"><h3>Contributions and duplicate entries (' + kids.length + ')</h3>' + kids.map(function (k) { return '<p class="small"><b>' + esc(k.id) + '</b> ' + esc(k.relation === 'duplicate' ? 'duplicate entry' : 'contribution') + ' listed under ' + esc(short(k.listed_in)) + ': ' + esc(k.title) + '</p>'; }).join('') + '</div>';
      var hist = S.data.updates.filter(function (u) { return u.task_id === t.id; }).slice(0, 8);
      h += '<div class="sec"><h3>History</h3>' + (hist.length ? hist.map(function (u) { return '<div class="hist"><b>' + esc(u.type) + '</b> ' + esc(String(u.at).slice(0, 10)) + ' by ' + esc(u.user) + (u.text ? ': ' + esc(u.text) : '') + (u.old && u.new && u.old !== u.new ? ' (' + esc(u.old) + ' to ' + esc(u.new) + ')' : '') + '</div>'; }).join('') : '<p class="muted small">No updates yet.</p>') + '</div>';
      if (note) {
        h += '<div class="sec"><h3>Post an update</h3><div class="field"><label for="u-status">Status</label><select id="u-status"' + (edit ? '' : ' disabled') + '>' + STATUSES.map(function (s) { return '<option' + (s === t.status ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></div><div class="field"><label for="u-text">What changed</label><textarea id="u-text" placeholder="For example: invitations sent on 12 Nov, 3 of 5 replies received"></textarea></div><div class="field"><label for="u-link">Link to the output (optional)</label><input id="u-link" placeholder="https://"></div><button class="btn primary" data-act="postupdate" data-id="' + esc(t.id) + '">Post update</button></div>';
      }
    } else h += '<h2>Add a task</h2>';
    if (edit) {
      h += '<div class="sec"><h3>' + (nw ? 'Task details' : 'Edit task (lead committee)') + '</h3>';
      if (isAd && !nw) h += '<div class="field"><label for="e-lead">Lead committee</label><select id="e-lead">' + D.names.map(function (n) { return '<option value="' + esc(n) + '"' + (n === t.lead ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('') + '</select></div>';
      h += subField(t, nw);
      h += '<div class="field"><label for="e-title">Task</label><input id="e-title" value="' + esc(t.title) + '"></div>';
      h += '<div class="two"><div class="field"><label for="e-start">Start or target date</label><input id="e-start" type="date" value="' + esc(t.start) + '"></div><div class="field"><label for="e-end">End date</label><input id="e-end" type="date" value="' + esc(t.end) + '"></div></div>';
      h += '<div class="field"><label for="e-rep">Repeats</label><select id="e-rep">' + Object.keys(REPEATS).map(function (k) { return '<option value="' + k + '"' + ((t.repeat || '') === k ? ' selected' : '') + '>' + REPEATS[k] + '</option>'; }).join('') + '</select><span class="small muted">For a report or check that happens every period. Needs a start and an end date.</span></div>';
      h += '<div class="field"><label for="e-ds">Is the date confirmed?</label><select id="e-ds">' + Object.keys(DATE_STATUS).map(function (k) { return '<option value="' + k + '"' + (t.datestatus === k ? ' selected' : '') + '>' + DATE_STATUS[k] + '</option>'; }).join('') + '</select></div>';
      var ms = D.mem[t.lead] || [];
      if (ms.length) h += '<div class="field"><label for="e-as">Assigned to</label><select id="e-as"><option value="">Not assigned</option>' + ms.map(function (m) { return '<option' + (m.name === t.assignee ? ' selected' : '') + '>' + esc(m.name) + '</option>'; }).join('') + '</select></div>';
      h += '<div class="field"><label for="e-reason">Reason for a date change (needed when other committees are involved)</label><input id="e-reason"></div>';
      h += '<div class="field"><label for="e-del">Deliverable</label><textarea id="e-del">' + esc(t.deliverable) + '</textarea></div><div class="field"><label for="e-pre">What this needs from others</label><textarea id="e-pre">' + esc(t.prereq) + '</textarea></div>';
      h += '<div class="field"><span>Supporting committees</span><div class="checks">' + D.names.filter(function (n) { return n !== t.lead; }).map(function (n) { return '<label><input type="checkbox" name="e-sup" value="' + esc(n) + '"' + ((t.support || []).indexOf(n) >= 0 ? ' checked' : '') + '>' + esc(short(n)) + '</label>'; }).join('') + '</div></div>';
      h += '<div class="field"><span>Approval needed from</span><div class="checks">' + APPROVERS.map(function (a) { return '<label><input type="checkbox" name="e-app" value="' + a + '"' + ((t.approvals || []).indexOf(a) >= 0 ? ' checked' : '') + '>' + a + '</label>'; }).join('') + '</div></div></div>';
      var apprO = String(t.approval_other || '').split(/[,;]\s*/).map(function (x) { return x.trim(); }).filter(String), parties = (t.external || []).slice();
      apprO.forEach(function (x) { if (parties.indexOf(x) < 0) parties.push(x); });
      h += '<div class="field"><label for="e-ext">Other parties (separate with commas)</label><input id="e-ext" value="' + esc(parties.join(', ')) + '"></div>';
      h += '<div class="field" id="e-extapp">' + partyApprovers(parties, apprO) + '</div>';
      h += '<div class="field"><label for="e-tc">Open question (clear this when it is answered)</label><input id="e-tc" value="' + esc(t.toconfirm) + '"></div>';
      h += '<button class="btn primary" data-act="savetask" data-id="' + esc(t.id) + '" data-c="' + esc(t.lead) + '">' + (nw ? 'Add task' : 'Save changes') + '</button></div>';
    } else if (!nw && !note) h += '<p class="muted small" style="margin-top:14px">You have view-only access to this task.</p>';
    return h + '</aside>';
  }

  /* ---------- render ---------- */
  function render() {
    var user = S.user;
    if (S.view === 'contract' && !views().some(function (x) { return x[0] === 'contract'; })) S.view = 'overview';
    var vs = views(), cnt = { decisions: D.canon.filter(needsNow).length, contract: S.user.role === 'admin' ? D.proposed.length : 0 };
    var nav = NAVGROUPS.map(function (g) {
      var items = g[1].map(function (k) { return vs.filter(function (v) { return v[0] === k; })[0]; }).filter(Boolean);
      return items.length ? '<div class="ng">' + (g[0] ? '<div class="nl">' + esc(g[0]) + '</div>' : '') + items.map(function (v) { return '<a href="#' + v[0] + '"' + (S.view === v[0] ? ' aria-current="page"' : '') + '><span>' + esc(v[1]) + '</span>' + (cnt[v[0]] ? '<b class="nb">' + cnt[v[0]] + '</b>' : '') + '</a>'; }).join('') + '</div>' : '';
    }).join('') + myNav();
    var who = DEMO ? '<span class="badge">Demo data. Edits are not saved.</span><label class="small">View as <select id="as">' + '<option value="admin"' + (S.asRole === 'admin' ? ' selected' : '') + '>Chair (admin)</option><option value="viewer"' + (S.asRole === 'viewer' ? ' selected' : '') + '>ICDE (read only)</option>' + D.names.map(function (n) { return '<option value="' + esc(n) + '"' + (S.asRole === n ? ' selected' : '') + '>' + esc(short(n)) + ' editor</option>'; }).join('') + '<option value="*multi"' + (S.asRole === '*multi' ? ' selected' : '') + '>Program + Paper editor</option>' + (S.data.subcommittees || []).map(function (x) { return '<option value="sub:' + esc(x.name) + '"' + (S.asRole === 'sub:' + x.name ? ' selected' : '') + '>' + esc(x.name.replace(/ Subcommittee$/, '')) + ' lead</option>'; }).join('') + '</select></label>' :
      '<span>' + esc(user.name) + ' (' + esc(user.role) + ')</span><button class="btn sm" data-act="refresh">Refresh</button><button class="btn sm" data-act="signout">Sign out</button>';
    var body = S.view === 'week' ? vWeek() : S.view === 'committees' ? vCommittees() : S.view === 'plan' ? vPlan() : S.view === 'dependencies' ? vDeps() : S.view === 'decisions' ? vDecisions() : S.view === 'contract' ? vContract() : S.view === 'report' ? vReport() : vOverview();
    var left = days(TODAY, CONF_START);
    $('#app').innerHTML = '<div class="shell"><aside class="side" id="side" data-open="' + (S.menu ? '1' : '0') + '"><a class="logo" href="#overview"><img src="' + LOGO + '" alt="31st ICDE World Conference 2027"></a><div class="sub">Committee work plan<small>Cebu, 15 to 19 November 2027' + (left > 0 ? ' · ' + left + ' days to go' : '') + '</small></div><nav aria-label="Sections">' + nav + '</nav><div class="who">' + who + '</div></aside><div class="navscrim" data-act="menu"></div>' +
      '<div class="content"><div class="mbar"><button class="btn sm" data-act="menu" aria-controls="side" aria-expanded="' + (S.menu ? 'true' : 'false') + '">Menu</button><span class="mtitle">ICDE 2027 Work Plan</span></div><main class="wrap" id="main">' + body + '</main></div></div><div id="drawer">' + drawer() + '</div>' + (S.toast ? '<div class="toast" role="status">' + esc(S.toast) + '</div>' : '');
  }
  function toast(m) { S.toast = m; var el = $('.toast'); if (el) el.textContent = m; else { var d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = m; document.body.appendChild(d); } setTimeout(function () { S.toast = ''; var e = $('.toast'); if (e) e.remove(); }, 3200); }
  function rerenderKeep() { var y = window.scrollY; render(); window.scrollTo(0, y); }
  function openDrawer(o) { S.drawer = o; $('#drawer').innerHTML = drawer(); var dr = $('.drawer'); if (dr) dr.scrollTop = 0; }

  /* ---------- events ---------- */
  function vals(name) { return Array.prototype.map.call(document.querySelectorAll('input[name="' + name + '"]:checked'), function (e) { return e.value; }); }
  function finish(r, msg) {
    if (!r.ok) { toast(r.error || 'Something went wrong'); return; }
    toast(msg || 'Saved');
    if (DEMO) { derive(); S.drawer = null; rerenderKeep(); return; }
    refresh().then(function () { S.drawer = null; rerenderKeep(); }).catch(function (er) { toast(String(er && er.message || er)); });
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return; var a = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    if (a === 'open') { if (e.target.closest('a')) return; openDrawer({ id: id }); }
    else if (a === 'close') { S.drawer = null; $('#drawer').innerHTML = ''; }
    else if (a === 'menu') { S.menu = !S.menu; var sd = $('#side'); if (sd) sd.setAttribute('data-open', S.menu ? '1' : '0'); var mbtn = $('.mbar button'); if (mbtn) mbtn.setAttribute('aria-expanded', S.menu ? 'true' : 'false'); }
    else if (a === 'week') { var dd = +el.getAttribute('data-d'); S.weekOff = dd === 0 ? 0 : (S.weekOff || 0) + dd; rerenderKeep(); }
    else if (a === 'quick') api('addUpdate', { id: id, status: el.getAttribute('data-s'), text: '' }).then(function (r) { if (!r.ok) { toast(r.error || 'Could not save'); return; } toast(el.getAttribute('data-s') === 'Done' ? 'Marked done' : 'Started'); if (DEMO) { derive(); rerenderKeep(); } else refresh().then(rerenderKeep).catch(function (er) { toast(String(er && er.message || er)); }); });
    else if (a === 'period') { var pk = el.getAttribute('data-k'), t0 = D.byId[id], was = t0 && periodDone(t0, pk); api('markPeriod', { id: id, period: pk, done: !was }).then(function (r) { if (!r.ok) { toast(r.error || 'Could not save'); return; } toast(periodLabel(t0.repeat, pk) + (was ? ' unticked' : ' done')); var after = function () { var dr = $('.drawer'), dy = dr ? dr.scrollTop : 0, open = S.drawer; rerenderKeep(); if (open) { S.drawer = open; $('#drawer').innerHTML = drawer(); var d2 = $('.drawer'); if (d2) d2.scrollTop = dy; } }; if (DEMO) { derive(); after(); } else refresh().then(after).catch(function (er) { toast(String(er && er.message || er)); }); }); }
    else if (a === 'subf') { var sc = el.getAttribute('data-c'), sn = el.getAttribute('data-s'); S.subf = S.subf || {}; S.subf[sc] = S.subf[sc] === sn ? '' : sn; rerenderKeep(); }
    else if (a === 'goto') go(el.getAttribute('data-v'), el.getAttribute('data-p'));
    else if (a === 'mode') { S.mode = el.getAttribute('data-m'); location.hash = 'plan' + (S.mode === 'gantt' ? '-gantt' : ''); }
    else if (a === 'clear') { S.f = { q: '', c: '', s: '', m: '', kids: false, mine: false, sub: '' }; rerenderKeep(); }
    else if (a === 'gc') { var c = el.getAttribute('data-c'); S.open[c] = !S.open[c]; $('#planres').innerHTML = planResults(); }
    else if (a === 'cell') { S.sel = [el.getAttribute('data-a'), el.getAttribute('data-b')]; rerenderKeep(); }
    else if (a === 'new') openDrawer({ new: el.getAttribute('data-c') });
    else if (a === 'signin') { var k = $('#k').value.trim(); if (!k) return; S.key = k; saveKey(k); refresh().catch(function (er) { S.key = ''; saveKey(''); signin(String(er.message || er)); }); }
    else if (a === 'signout') { saveKey(''); S.key = ''; S.data = null; signin(''); }
    else if (a === 'refresh') refresh().then(function () { toast('Refreshed'); }).catch(function (er) { toast(String(er && er.message || er)); });
    else if (a === 'review') { var dec = el.getAttribute('data-d'); api('reviewTask', { id: id, decision: dec }).then(function (r) { finish(r, dec === 'accept' ? 'Added to the plan' : dec === 'reject' ? 'Rejected' : 'Back in review'); }); }
    else if (a === 'cstate') { S.cs = el.getAttribute('data-s'); S.cAll = false; rerenderKeep(); }
    else if (a === 'cgroup') { S.cg = el.getAttribute('data-g'); rerenderKeep(); }
    else if (a === 'acceptall') { if (!S.cAll) { S.cAll = true; rerenderKeep(); return; } S.cAll = false; api('reviewAll', { decision: 'accept' }).then(function (r) { finish(r, (r.count || 0) + ' contract tasks added to the plan'); }); }
    else if (a === 'approve') api('approveDate', { id: id, approve: el.getAttribute('data-ok') === '1' }).then(function (r) { finish(r, 'Done'); });
    else if (a === 'postupdate') {
      api('addUpdate', { id: id, status: $('#u-status').value, text: $('#u-text').value, link: $('#u-link').value }).then(function (r) { finish(r, 'Update posted'); });
    } else if (a === 'savetask') {
      var nwSub = !id && !$('#e-sub') ? (mySubs().filter(function (n) { return D.subBy[n] && D.subBy[n].committee === el.getAttribute('data-c'); })[0] || '') : '';
      var task = { id: id || '', lead: $('#e-lead') ? $('#e-lead').value : el.getAttribute('data-c'), title: $('#e-title').value.trim(), start: $('#e-start').value, end: $('#e-end').value || $('#e-start').value, datestatus: $('#e-ds').value, deliverable: $('#e-del').value, prereq: $('#e-pre').value, support: vals('e-sup'), approvals: vals('e-app'), approval_other: vals('e-xa').join(', '), subcommittee: $('#e-sub') ? $('#e-sub').value : (nwSub || undefined), repeat: $('#e-rep').value, external: $('#e-ext').value.split(',').map(function (s) { return s.trim(); }).filter(String), toconfirm: $('#e-tc').value.trim(), assignee: $('#e-as') ? $('#e-as').value : undefined };
      if (!task.title) { toast('Please enter a task title'); return; }
      api('saveTask', { task: task, reason: $('#e-reason').value }).then(function (r) { finish(r, r.pending ? 'Date change sent for approval' : 'Saved'); });
    } else if (a === 'copyrep') {
      var tx = repText(); var done = function () { toast('Report copied'); };
      try { navigator.clipboard.writeText(tx).then(done, function () { fallbackCopy(tx); }); } catch (er) { fallbackCopy(tx); }
    } else if (a === 'redraft') { S.rep = null; rerenderKeep(); }
    else if (a === 'saverep') { repText(); api('saveReport', { month: S.rep.month, content: S.rep }).then(function (r) { if (r.ok) { toast('Dated copy saved'); if (DEMO) rerenderKeep(); else refresh(); } else toast(r.error); }); }
    else if (a === 'showrep') { var s = S.data.reports[+el.getAttribute('data-i')], c2 = {}; try { c2 = JSON.parse(s.content); } catch (er) {} S.rep = Object.assign({ month: s.month, fig: {} }, c2); rerenderKeep(); toast('Showing the saved copy for ' + s.month); }
  });
  function fallbackCopy(tx) { var ta = document.createElement('textarea'); ta.value = tx; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Report copied'); } catch (e) { toast('Select the text and copy it manually'); } ta.remove(); }
  document.addEventListener('input', function (e) {
    var id = e.target.id;
    if (id === 'fq') { S.f.q = e.target.value; $('#planres').innerHTML = planResults(); }
    else if (id === 'e-ext') { var box = $('#e-extapp'); if (box) box.innerHTML = partyApprovers(splitParties(e.target.value), vals('e-xa')); }
  });
  document.addEventListener('change', function (e) {
    var id = e.target.id;
    if (id === 'fmine') { S.f.mine = e.target.checked; $('#planres').innerHTML = planResults(); return; }
    if (id === 'fsub') { S.f.sub = e.target.value; $('#planres').innerHTML = planResults(); return; }
    if (id === 'fc' || id === 'fs' || id === 'fm') { S.f[{ fc: 'c', fs: 's', fm: 'm' }[id]] = e.target.value; $('#planres').innerHTML = planResults(); }
    else if (id === 'e-lead') { var sf2 = $('#e-sub'); if (sf2) sf2.innerHTML = '<option value="">None, committee-wide</option>' + (D.subs[e.target.value] || []).map(function (x) { return '<option value="' + esc(x.name) + '">' + esc(x.name) + '</option>'; }).join(''); }
    else if (id === 'wc') { S.wc = e.target.value; rerenderKeep(); }
    else if (id === 'coord') { S.coord = e.target.checked; rerenderKeep(); }
    else if (id === 'rm') { go('report', e.target.value); }
    else if (id === 'as') { S.asRole = e.target.value; setDemoUser(); S.drawer = null; rerenderKeep(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && S.drawer) { S.drawer = null; $('#drawer').innerHTML = ''; } if (e.key === 'Enter' && e.target.id === 'k') { var b = $('[data-act="signin"]'); if (b) b.click(); } });
  document.addEventListener('visibilitychange', function () { if (!DEMO && !document.hidden && S.data && S.key && !S.drawer && Date.now() - (S.loadedAt || 0) > 300000) refresh().catch(function () {}); });
  window.__ICDE = { S: S, render: render };
  boot();
})();
