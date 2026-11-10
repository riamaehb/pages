/* Shared helpers for the tenant, lessor, and admin pages. */
(function () {
  'use strict';

  var NET_ERR = 'Could not reach the server. Please check your connection and try again.';

  /** Calls the Apps Script API. Uses text/plain so the browser sends it without a CORS preflight. */
  window.api = function (action, payload) {
    var url = (window.APP_CONFIG || {}).API_URL || '';
    if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(url)) {
      return Promise.reject(new Error('This page is not configured yet. Please contact the lessor.'));
    }
    var body = JSON.stringify(Object.assign({ action: action }, payload || {}));
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body,
      redirect: 'follow'
    }).then(function (r) { return r.text(); }, function () { throw new Error(NET_ERR); })
      .then(function (text) {
        var j;
        try { j = JSON.parse(text); } catch (e) { throw new Error(NET_ERR); }
        if (!j.ok) throw new Error(j.error || 'Request failed.');
        return j.data;
      });
  };

  /** Reads a value from the part of the URL after "#", e.g. #t=abc. */
  window.hashParam = function (name) {
    var m = new RegExp('(?:^|[#&])' + name + '=([^&]*)').exec(location.hash);
    return m ? decodeURIComponent(m[1]) : '';
  };

  window.$ = function (id) { return document.getElementById(id); };

  window.showView = function (views, id) {
    views.forEach(function (v) { $(v).hidden = (v !== id); });
    window.scrollTo(0, 0);
  };

  window.errText = function (e) { return String((e && e.message) || e); };

  window.formMsg = function (form, text, kind) {
    var el = form.querySelector('[data-msg]');
    el.textContent = text || '';
    el.className = 'msg ' + (kind || 'err');
    el.hidden = !text;
  };

  window.busy = function (form, on, label) {
    var b = form.querySelector('button[type=submit]');
    if (!b) return;
    if (on) { b.dataset.label = b.textContent; b.textContent = label || 'Please wait…'; }
    else if (b.dataset.label) { b.textContent = b.dataset.label; }
    b.disabled = on;
  };

  var cssInjected = false;
  window.injectDocCss = function (css) {
    if (cssInjected || !css) return;
    var s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
    cssInjected = true;
  };

  window.readFileBase64 = function (file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res({ name: file.name, mimeType: file.type, base64: String(r.result).split(',')[1] }); };
      r.onerror = function () { rej(new Error('Could not read the file.')); };
      r.readAsDataURL(file);
    });
  };

  window.base64ToBlob = function (b64, mime) {
    var bin = atob(b64), n = bin.length, arr = new Uint8Array(n);
    for (var i = 0; i < n; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  /** Minimal signature pad: pointer events, high-DPI aware, PNG with transparent background. */
  window.SigPad = function (canvas, onChange) {
    var ctx = canvas.getContext('2d');
    var drawing = false, last = null, self = this;
    this.hasInk = false;

    function setup() {
      var r = canvas.getBoundingClientRect();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = ctx.fillStyle = '#0b1a3a';
      self.hasInk = false;
      if (onChange) onChange(false);
    }
    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    canvas.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      drawing = true;
      last = pos(e);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
      ctx.beginPath(); ctx.arc(last.x, last.y, 1.1, 0, Math.PI * 2); ctx.fill();
      if (!self.hasInk) { self.hasInk = true; if (onChange) onChange(true); }
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drawing) return;
      e.preventDefault();
      var p = pos(e);
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p;
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      canvas.addEventListener(ev, function () { drawing = false; });
    });

    this.resize = setup;
    this.clear = setup;
    this.toDataURL = function () { return canvas.toDataURL('image/png'); };
  };
})();
