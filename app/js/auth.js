/* ============================================================
   CoinForge Studio — auth.js
   Account gate for the HOSTED app only.

   - Desktop app (window.native) and local/file usage: no auth,
     fully open — this file becomes inert.
   - On coinforgestudio.com domains: requires Google sign-in
     (email pre-verified) or email/password with verified email.
   - Syncs lightweight user preferences to Firestore
     (users/{uid}.prefs) and keeps a profile document.

   This is a relationship gate, not DRM: the code is open source
   and the desktop build needs no account by design.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util;

  const HOSTED = /(^|\.)coinforgestudio\.com$|(^|\.)(coinforgestudio|app-coinforgestudio)\.web\.app$|(^|\.)coinforgestudio\.firebaseapp\.com$/i;
  const forced = new URLSearchParams(location.search).has('authgate'); /* dev/testing */
  const required = (!window.native && HOSTED.test(location.hostname)) || forced;

  CF.auth = { required, user: null };
  if (!required) return;

  if (typeof firebase === 'undefined' || !window.CF_FIREBASE_CONFIG) {
    console.error('auth required but Firebase SDK/config missing');
    return;
  }

  firebase.initializeApp(window.CF_FIREBASE_CONFIG);
  const auth = firebase.auth();
  const db = firebase.firestore();

  const PREF_KEYS = ['metal', 'markLight', 'relief', 'showGuides', 'unit'];
  let prefsLoaded = false;
  let saveTimer = null;

  /* ---------------- overlay UI ---------------- */
  let overlay = null;

  function show(panelBuilder) {
    if (!overlay) {
      overlay = U.el('div', { class: 'cf-auth-overlay' });
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = '';
    const card = U.el('div', { class: 'cf-auth-card' });
    card.appendChild(U.el('div', { class: 'cf-auth-brand' },
      U.el('img', { class: 'cf-auth-coin', src: 'favicon.png', alt: '' }),
      U.el('span', { class: 'cf-auth-name' }, 'CoinForge'),
      U.el('span', { class: 'cf-auth-sub' }, 'STUDIO')));
    panelBuilder(card);
    card.appendChild(U.el('p', { class: 'cf-auth-foot' },
      'Prefer no account? The ',
      U.el('a', { href: 'https://github.com/hratchyan/coinforgestudio/releases', target: '_blank', rel: 'noopener' }, 'free desktop app'),
      ' needs none — same designer, works offline.'));
    overlay.appendChild(card);
  }

  function hideOverlay() {
    if (overlay) { overlay.remove(); overlay = null; }
  }

  const friendly = (e) => ({
    'auth/operation-not-allowed': 'Email sign-up isn\'t enabled here — please continue with Google.',
    'auth/unauthorized-domain': 'This domain isn\'t authorized for sign-in yet.',
    'auth/invalid-email': 'That email address doesn\'t look right.',
    'auth/user-not-found': 'No account with that email — switch to "Create account".',
    'auth/wrong-password': 'Wrong password for that account.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'That email already has an account — switch to "Sign in".',
    'auth/weak-password': 'Password needs at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts — wait a minute and try again.',
    'auth/popup-blocked': 'Your browser blocked the popup — trying redirect…',
    'auth/popup-closed-by-user': 'Popup closed before finishing — try again when ready.',
    'auth/network-request-failed': 'Network problem — check your connection.',
  }[e && e.code] || (e && e.message) || 'Something went wrong.');

  /* Google "G" mark */
  const gIcon = () => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 48 48');
    s.setAttribute('class', 'cf-gicon');
    s.innerHTML = '<path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.4 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.5-5.8c-2 1.4-4.7 2.3-7.7 2.3-6.3 0-11.7-3.9-13.6-9.3l-7.8 6C6.5 42.6 14.6 48 24 48z"/>';
    return s;
  };

  function signInPanel(card, msg) {
    card.appendChild(U.el('h2', { class: 'cf-auth-title' }, 'Sign in to start designing'));
    card.appendChild(U.el('p', { class: 'cf-auth-lead' }, 'The hosted studio is free — it just needs an account.'));
    if (msg) card.appendChild(U.el('p', { class: 'cf-auth-err' }, msg));

    const gbtn = U.el('button', { class: 'cf-auth-google' }, gIcon(), U.el('span', null, 'Continue with Google'));
    gbtn.addEventListener('click', async () => {
      gbtn.disabled = true;
      try {
        await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
      } catch (e) {
        if (e.code === 'auth/popup-blocked') {
          try { await auth.signInWithRedirect(new firebase.auth.GoogleAuthProvider()); return; } catch (e2) { e = e2; }
        }
        show(c => signInPanel(c, friendly(e)));
      }
    });
    card.appendChild(gbtn);

    card.appendChild(U.el('div', { class: 'cf-auth-div' }, U.el('span', null, 'or use email')));

    let mode = 'signin';
    const email = U.el('input', { class: 'cf-input', type: 'email', placeholder: 'you@example.com', autocomplete: 'email' });
    const pass = U.el('input', { class: 'cf-input', type: 'password', placeholder: 'Password (6+ characters)', autocomplete: 'current-password' });
    const err = U.el('p', { class: 'cf-auth-err', style: { display: 'none' } });
    const submit = U.el('button', { class: 'cf-btn primary cf-auth-submit' }, 'Sign in');
    const toggle = U.el('button', { class: 'cf-auth-toggle' }, 'New here? Create an account');
    toggle.addEventListener('click', () => {
      mode = mode === 'signin' ? 'create' : 'signin';
      submit.textContent = mode === 'signin' ? 'Sign in' : 'Create account';
      toggle.textContent = mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in';
      err.style.display = 'none';
    });
    const go = async () => {
      err.style.display = 'none';
      submit.disabled = true;
      try {
        if (mode === 'create') {
          const cred = await auth.createUserWithEmailAndPassword(email.value.trim(), pass.value);
          await cred.user.sendEmailVerification();
        } else {
          await auth.signInWithEmailAndPassword(email.value.trim(), pass.value);
        }
        /* onAuthStateChanged routes to verify-panel or app */
      } catch (e) {
        err.textContent = friendly(e);
        err.style.display = '';
        submit.disabled = false;
      }
    };
    submit.addEventListener('click', go);
    pass.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });

    card.appendChild(email);
    card.appendChild(pass);
    card.appendChild(err);
    card.appendChild(submit);
    card.appendChild(toggle);
  }

  function verifyPanel(card, user, note) {
    card.appendChild(U.el('h2', { class: 'cf-auth-title' }, 'Verify your email'));
    card.appendChild(U.el('p', { class: 'cf-auth-lead' },
      'We sent a verification link to ', U.el('strong', null, user.email),
      '. Click it, then come back here.'));
    if (note) card.appendChild(U.el('p', { class: 'cf-auth-note' }, note));

    const cont = U.el('button', { class: 'cf-btn primary cf-auth-submit' }, 'I\'ve verified — continue');
    cont.addEventListener('click', async () => {
      cont.disabled = true;
      await user.reload();
      if (auth.currentUser && auth.currentUser.emailVerified) enter(auth.currentUser);
      else show(c => verifyPanel(c, user, 'Not verified yet — give the email a minute, check spam.'));
    });
    card.appendChild(cont);

    const row = U.el('div', { class: 'cf-auth-row' });
    const resend = U.el('button', { class: 'cf-auth-toggle' }, 'Resend email');
    resend.addEventListener('click', async () => {
      resend.disabled = true;
      try { await user.sendEmailVerification(); resend.textContent = 'Sent!'; }
      catch (e) { resend.textContent = friendly(e); }
    });
    const out = U.el('button', { class: 'cf-auth-toggle' }, 'Sign out');
    out.addEventListener('click', () => auth.signOut());
    row.appendChild(resend);
    row.appendChild(out);
    card.appendChild(row);

    /* gentle auto-poll while this panel is up */
    const iv = setInterval(async () => {
      if (!overlay || !document.body.contains(overlay)) { clearInterval(iv); return; }
      try {
        await user.reload();
        if (auth.currentUser && auth.currentUser.emailVerified) { clearInterval(iv); enter(auth.currentUser); }
      } catch (e) { clearInterval(iv); }
    }, 6000);
  }

  /* ---------------- user doc + prefs ---------------- */
  async function ensureUserDoc(user) {
    const ref = db.collection('users').doc(user.uid);
    try {
      const snap = await ref.get();
      const base = {
        email: user.email || null,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      if (!snap.exists) {
        base.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        base.tier = 'free';
        base.prefs = {};
      }
      await ref.set(base, { merge: true });
      return snap.exists ? snap.data() : base;
    } catch (e) {
      console.warn('user doc unavailable:', e.message);
      return null;
    }
  }

  function applyPrefs(data) {
    if (!data || !data.prefs) { prefsLoaded = true; return; }
    const patch = {};
    for (const k of PREF_KEYS) if (data.prefs[k] !== undefined) patch[k] = data.prefs[k];
    if (Object.keys(patch).length) CF.store.setUI(patch);
    prefsLoaded = true;
  }

  function watchPrefs(user) {
    CF.bus.on('ui', () => {
      if (!prefsLoaded || !auth.currentUser) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const prefs = {};
        for (const k of PREF_KEYS) prefs[k] = CF.store.ui[k];
        db.collection('users').doc(user.uid).set({ prefs }, { merge: true }).catch(() => { });
      }, 2000);
    });
  }

  /* ---------------- topbar chip ---------------- */
  function mountChip(user) {
    const old = U.$('#cf-userchip');
    if (old) old.remove();
    const chip = U.el('div', { id: 'cf-userchip', class: 'cf-userchip', title: user.email || '' });
    if (user.photoURL) chip.appendChild(U.el('img', { src: user.photoURL, referrerpolicy: 'no-referrer' }));
    else chip.appendChild(U.el('span', { class: 'cf-userchip-letter' }, (user.displayName || user.email || '?')[0].toUpperCase()));
    chip.addEventListener('click', () => {
      CF.ui.menu(chip, [
        { label: user.displayName || user.email || 'Account', disabled: true },
        '-',
        { label: 'Sign out', onClick: () => auth.signOut().then(() => location.reload()) },
      ]);
    });
    const bar = U.$('#topbar');
    if (bar) bar.appendChild(chip);
    else setTimeout(() => mountChip(user), 400); /* topbar builds during boot */
  }

  /* ---------------- entry ---------------- */
  async function enter(user) {
    CF.auth.user = user;
    /* email-verified claim must be fresh in the ID token before Firestore
       will accept writes (rules check email_verified) */
    try { await user.getIdToken(true); } catch (e) { }
    const data = await ensureUserDoc(user);
    applyPrefs(data);
    watchPrefs(user);
    mountChip(user);
    hideOverlay();
  }

  const isVerified = (user) =>
    user.emailVerified || (user.providerData || []).some(p => p && p.providerId === 'google.com');

  /* boot: block immediately, then route on auth state */
  show(card => card.appendChild(U.el('p', { class: 'cf-auth-lead', style: { textAlign: 'center' } }, 'Checking session…')));

  auth.getRedirectResult().catch(e => {
    if (e.code && e.code !== 'auth/no-auth-event') show(c => signInPanel(c, friendly(e)));
  });

  auth.onAuthStateChanged(user => {
    if (!user) { CF.auth.user = null; prefsLoaded = false; show(c => signInPanel(c)); return; }
    if (isVerified(user)) enter(user);
    else show(c => verifyPanel(c, user));
  });
})();