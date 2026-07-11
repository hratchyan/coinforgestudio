/* ============================================================
   CoinForge Studio — billing.js
   Upgrade & billing for the HOSTED app, via the "Run Payments
   with Stripe" Firebase extension:

   - plan catalog:   /products (mirrored from Stripe; a product's
                     metadata.firebaseRole = 'pro' | 'elite')
   - checkout:       create /customers/{uid}/checkout_sessions doc,
                     extension fills .url → redirect to Stripe
   - manage/cancel:  extension's createPortalLink callable
   - entitlement:    Stripe webhook sets the stripeRole custom
                     claim; we refresh the ID token to pick it up

   Inert on desktop and local use, and fails soft (a friendly
   "plans launch soon" note) until the extension is installed
   and products exist. Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const U = CF.util;
  const PORTAL_FN = 'https://us-central1-coinforgestudio.cloudfunctions.net/ext-firestore-stripe-payments-createPortalLink';
  /* two-tier model: one paid plan. 'elite' lingers only as a legacy
     role on old accounts — same entitlement as pro. */
  const PLAN_ORDER = { pro: 0, elite: 0 };
  const PLAN_BLURB = {
    pro: '10 cloud slots · full & growing template vault · AI assistant (MCP) add-on',
    elite: '10 cloud slots · full & growing template vault · AI assistant (MCP) add-on',
  };

  const ready = () =>
    CF.auth && CF.auth.required && CF.auth.user &&
    typeof firebase !== 'undefined' && firebase.firestore;

  const db = () => firebase.firestore();

  /* ---------- catalog ---------- */
  async function plans() {
    const snap = await db().collection('products').where('active', '==', true).get();
    const out = [];
    for (const doc of snap.docs) {
      const p = doc.data();
      const role = (p.metadata || {}).firebaseRole;
      if (role !== 'pro' && role !== 'elite') continue;
      const prices = await doc.ref.collection('prices').where('active', '==', true).get();
      let best = null;
      prices.forEach(pr => {
        const d = pr.data();
        if (d.type === 'recurring' && (!best || d.unit_amount < best.unit_amount)) {
          best = { id: pr.id, unit_amount: d.unit_amount, currency: d.currency, interval: (d.recurring || {}).interval || 'year' };
        }
      });
      if (best) out.push({
        role, name: p.name || role, priceId: best.id,
        amount: best.unit_amount, currency: best.currency, interval: best.interval,
        promoId: (p.metadata || {}).promo_id || null,
        promoNote: (p.metadata || {}).promo_note || null,
      });
    }
    out.sort((a, b) => (PLAN_ORDER[a.role] || 0) - (PLAN_ORDER[b.role] || 0));
    return out;
  }

  const money = (amount, currency) =>
    (currency === 'usd' ? '$' : (currency || '').toUpperCase() + ' ') + (amount / 100).toFixed(amount % 100 ? 2 : 0);

  /* ---------- checkout ---------- */
  async function checkout(priceId, btn, promoId) {
    const uid = CF.auth.user.uid;
    if (btn) { btn.disabled = true; btn.textContent = 'Opening secure checkout…'; }
    const session = {
      price: priceId,
      success_url: location.origin + '/?upgraded=1',
      cancel_url: location.origin + '/',
    };
    /* auto-apply the early-bird promotion when the product carries one;
       otherwise let people type codes manually (Stripe allows only one
       of promotion_code / allow_promotion_codes per session) */
    if (promoId) session.promotion_code = promoId;
    else session.allow_promotion_codes = true;
    const ref = await db().collection('customers').doc(uid).collection('checkout_sessions').add(session);
    /* the extension writes back .url (or .error) within a few seconds */
    const unsub = ref.onSnapshot(snap => {
      const d = snap.data() || {};
      if (d.error) {
        unsub();
        CF.ui.toast('Checkout failed: ' + d.error.message, 5000, 'error');
        if (btn) { btn.disabled = false; btn.textContent = 'Try again'; }
      } else if (d.url) {
        unsub();
        location.assign(d.url);
      }
    });
    setTimeout(() => {
      unsub();
      if (btn && btn.disabled) { btn.disabled = false; btn.textContent = 'Try again'; CF.ui.toast('Checkout timed out — try again.', 4000, 'error'); }
    }, 25000);
  }

  /* ---------- customer portal (manage / cancel / invoices) ---------- */
  async function portal() {
    try {
      CF.ui.toast('Opening billing portal…');
      const idToken = await CF.auth.user.getIdToken();
      const res = await fetch(PORTAL_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
        body: JSON.stringify({ data: { returnUrl: location.origin } }),
      });
      const j = await res.json();
      const url = j && j.result && j.result.url;
      if (!url) throw new Error((j && j.error && j.error.message) || 'no portal URL');
      location.assign(url);
    } catch (e) {
      console.warn('portal failed:', e);
      CF.ui.toast('Could not open the billing portal — try again in a minute.', 4500, 'error');
    }
  }

  /* ---------- entitlement refresh ---------- */
  async function refreshTier(force) {
    if (!ready()) return CF.auth.tier || 'free';
    try {
      if (force) await CF.auth.user.getIdToken(true);
      const tok = await CF.auth.user.getIdTokenResult();
      const role = tok.claims && tok.claims.stripeRole;
      const tier = (role === 'pro' || role === 'elite') ? role : 'free';
      if (tier !== CF.auth.tier) {
        CF.auth.tier = tier;
        CF.bus.emit('auth');
      }
      return tier;
    } catch (e) { return CF.auth.tier || 'free'; }
  }

  /* ---------- post-checkout thank-you ---------- */
  let tyOverlay = null;
  function closeThankYou() {
    if (tyOverlay) { tyOverlay.remove(); tyOverlay = null; }
  }
  function thankYouOverlay(state, tier) {
    if (!tyOverlay) {
      tyOverlay = U.el('div', { class: 'cf-ty-overlay' });
      document.body.appendChild(tyOverlay);
    }
    tyOverlay.innerHTML = '';
    const card = U.el('div', { class: 'cf-ty-card' });

    if (state === 'wait') {
      card.appendChild(U.el('div', { class: 'cf-ty-spin' }));
      card.appendChild(U.el('h2', { class: 'cf-ty-title' }, 'Payment received'));
      card.appendChild(U.el('p', { class: 'cf-ty-lead' }, 'Unlocking your plan — just a few seconds…'));
    } else if (state === 'done') {
      const nice = tier.charAt(0).toUpperCase() + tier.slice(1);
      card.appendChild(U.el('img', { class: 'cf-ty-logo', src: 'favicon.png', alt: '' }));
      card.appendChild(U.el('h2', { class: 'cf-ty-title' }, 'Welcome to ', U.el('em', null, nice)));
      card.appendChild(U.el('p', { class: 'cf-ty-lead' },
        'Thank you for fueling the forge — support like yours is what keeps CoinForge free for everyone else. Here\'s what just unlocked:'));
      const ul = U.el('ul', { class: 'cf-ty-list' });
      ul.appendChild(U.el('li', null, U.el('b', null, '10 cloud slots'), ' — your coins now follow your account to any device'));
      ul.appendChild(U.el('li', null, 'The full & growing template and asset vault'));
      ul.appendChild(U.el('li', null, 'AI assistant (MCP) add-on — early access as it rolls out'));
      card.appendChild(ul);
      const row = U.el('div', { class: 'cf-ty-btns' });
      const b1 = U.el('button', { class: 'cf-btn primary' }, '☁ Save this coin to the cloud');
      b1.addEventListener('click', () => { closeThankYou(); CF.projects.openManager(); });
      const b2 = U.el('button', { class: 'cf-btn' }, 'Keep designing');
      b2.addEventListener('click', closeThankYou);
      row.appendChild(b1);
      row.appendChild(b2);
      card.appendChild(row);
      card.appendChild(U.el('p', { class: 'cf-ty-foot' },
        'Your receipt is in your email · manage or cancel anytime from the account menu.'));
      coinConfetti(tyOverlay);
    } else { /* 'slow' */
      card.appendChild(U.el('h2', { class: 'cf-ty-title' }, 'Almost there'));
      card.appendChild(U.el('p', { class: 'cf-ty-lead' },
        'Your payment went through — activation is taking a moment longer than usual. Your plan will be live on your next sign-in at the latest.'));
      const b = U.el('button', { class: 'cf-btn primary' }, 'OK');
      b.addEventListener('click', closeThankYou);
      card.appendChild(b);
    }
    tyOverlay.appendChild(card);
  }

  /* falling gold coins, ~9s, skipped under prefers-reduced-motion */
  function coinConfetti(host) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = U.el('canvas', { class: 'cf-ty-confetti' });
    host.insertBefore(cv, host.firstChild);
    const ctx = cv.getContext('2d');
    const W = cv.width = innerWidth, H = cv.height = innerHeight;
    const golds = ['#f4dc8a', '#d9b544', '#bd9927', '#8a6d1f'];
    const P = Array.from({ length: 90 }, () => ({
      x: Math.random() * W, y: -30 - Math.random() * H * 0.6,
      r: 3 + Math.random() * 5.5, vy: 1.3 + Math.random() * 2.4, vx: -0.6 + Math.random() * 1.2,
      rot: Math.random() * Math.PI, vr: -0.09 + Math.random() * 0.18,
      c: golds[(Math.random() * golds.length) | 0],
    }));
    const t0 = performance.now();
    requestAnimationFrame(function frame(t) {
      if (!cv.isConnected) return;
      ctx.clearRect(0, 0, W, H);
      for (const p of P) {
        p.y += p.vy; p.x += p.vx; p.rot += p.vr;
        if (p.y > H + 30) { p.y = -30; p.x = Math.random() * W; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, 0.3 + 0.7 * Math.abs(Math.sin(p.rot * 2))); /* coin-flip illusion */
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.fill();
        ctx.restore();
      }
      if (t - t0 < 9000) requestAnimationFrame(frame);
      else cv.remove();
    });
  }

  /* after returning from Stripe: poll until the webhook lands the claim */
  function watchUpgradeReturn() {
    const params = new URLSearchParams(location.search);
    if (!params.get('upgraded')) return;
    history.replaceState(null, '', location.pathname); /* clean the URL */
    thankYouOverlay('wait');
    let tries = 0;
    const iv = setInterval(async () => {
      tries++;
      const tier = await refreshTier(true);
      if (tier !== 'free') {
        clearInterval(iv);
        thankYouOverlay('done', tier);
      } else if (tries >= 20) {
        clearInterval(iv);
        thankYouOverlay('slow');
      }
    }, 3000);
  }

  /* ---------- upgrade dialog ---------- */
  async function upgradeDialog() {
    if (!ready()) { window.open('https://coinforgestudio.com/#pricing', '_blank', 'noopener'); return; }
    const current = CF.auth.tier || 'free';
    const modal = CF.ui.modal({ title: 'Upgrade CoinForge', width: '560px' });
    modal.body.appendChild(U.el('p', { class: 'cf-hint' }, 'Loading plans…'));
    let list = [];
    try { list = await plans(); } catch (e) { console.warn('plans unavailable:', e); }
    /* only show tiers ABOVE the current plan */
    list = list.filter(pl => (PLAN_ORDER[pl.role] ?? -1) > (PLAN_ORDER[current] ?? -1));
    modal.body.innerHTML = '';
    if (current !== 'free') {
      modal.body.appendChild(U.el('p', { class: 'cf-confirm-msg' },
        '🥇 You\'re on Pro — everything CoinForge has is already yours. Thank you for keeping the forge hot.'));
      return;
    }
    if (!list.length) {
      modal.body.appendChild(U.el('p', { class: 'cf-confirm-msg' },
        'Plans are momentarily unavailable — try again in a minute, or ',
        U.el('a', { href: 'https://coinforgestudio.com/#pricing', target: '_blank', rel: 'noopener', style: { color: 'var(--accent)' } }, 'see pricing →')));
      return;
    }
    modal.body.appendChild(U.el('p', { class: 'cf-confirm-msg' },
      'The designer stays free, forever. Pro adds the cloud, the vault, and the AI.'));
    for (const pl of list) {
      const buyBtn = U.el('button', { class: 'cf-btn primary' }, 'Go Pro');
      const priceEl = pl.promoNote
        ? U.el('div', { class: 'cf-planrow-price' },
            U.el('s', { style: { color: 'var(--muted)', fontWeight: '400' } }, money(pl.amount, pl.currency)),
            ' ' + money(pl.amount - 2000, pl.currency),
            U.el('small', null, ' first year'))
        : U.el('div', { class: 'cf-planrow-price' }, money(pl.amount, pl.currency), U.el('small', null, ' / ' + pl.interval));
      const row = U.el('div', { class: 'cf-planrow' },
        U.el('div', { class: 'cf-planrow-info' },
          U.el('div', { class: 'cf-planrow-name' }, pl.name,
            U.el('span', { class: 'cf-tierchip cf-tier-pro', style: { marginLeft: '8px' } }, 'PRO')),
          U.el('div', { class: 'cf-planrow-desc' }, PLAN_BLURB[pl.role] || ''),
          pl.promoNote ? U.el('div', { class: 'cf-planrow-promo' }, '🏷 ' + pl.promoNote) : null),
        U.el('div', { class: 'cf-planrow-buy' }, priceEl, buyBtn));
      buyBtn.addEventListener('click', (e) => checkout(pl.priceId, e.currentTarget, pl.promoId));
      modal.body.appendChild(row);
    }
    modal.body.appendChild(U.el('p', { class: 'cf-planrow-foot' },
      'Secure payment by Stripe · annual, cancel anytime · 14-day money-back guarantee.'));
  }

  CF.billing = { upgradeDialog, portal, refreshTier, ready };

  /* deep link: app.coinforgestudio.com/#upgrade opens the dialog post-login */
  CF.bus.on('auth', () => {
    if (location.hash === '#upgrade' && CF.auth.user) {
      history.replaceState(null, '', location.pathname);
      setTimeout(upgradeDialog, 400);
    }
  });
  if (ready()) watchUpgradeReturn();
  else CF.bus.on('auth', function once() { watchUpgradeReturn(); CF.bus.off && CF.bus.off('auth', once); });
})();
