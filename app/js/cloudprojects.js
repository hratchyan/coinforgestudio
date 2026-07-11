/* ============================================================
   CoinForge Studio — cloudprojects.js
   Cloud project slots for the HOSTED app.

   Projects live in numbered SLOTS — like game saves:
     Free → slot 0 (1 cloud project, forever)
     Pro  → slots 0–9 (10)
   The slot number itself is what security rules validate against
   the plan, so the cap is enforced server-side with no counters.

   Storage:   users/{uid}/projects/{slot}.json   (full payload)
   Firestore: users/{uid}/projects/{slot}        (name, thumb, meta)

   Inert on desktop (window.native) and local use — same policy
   as auth.js. Client checks here are UX only; the real
   enforcement is firestore.rules + storage.rules.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  /* two-tier model (2026-07-11): Free gets 1 cloud slot forever, Pro
     gets all 10. 'elite' kept as an accepted legacy role — same as pro. */
  const SLOTS = { free: 1, pro: 10, elite: 10 };
  const MAX_SLOT_ID = 9; /* absolute ceiling, matches rules */

  const ready = () =>
    CF.auth && CF.auth.required && CF.auth.user &&
    typeof firebase !== 'undefined' && firebase.storage && firebase.firestore;

  const tier = () => (CF.auth && CF.auth.tier) || 'free';
  const uid = () => CF.auth.user.uid;
  const metaCol = () => firebase.firestore().collection('users').doc(uid()).collection('projects');
  const fileRef = (slot) => firebase.storage().ref('users/' + uid() + '/projects/' + slot + '.json');

  const friendly = (e) => {
    const code = (e && e.code) || '';
    if (code.includes('unauthorized') || code.includes('permission-denied'))
      return 'Your plan doesn\'t include this cloud slot.';
    if (code.includes('quota')) return 'Cloud storage quota reached.';
    if (code.includes('retry-limit') || code.includes('network') || code.includes('unavailable'))
      return 'Network problem — check your connection and try again.';
    return (e && e.message) || 'Cloud request failed.';
  };

  /* list(): array indexed by slot id 0..9; null = empty slot.
     Includes docs ABOVE the current plan (after a downgrade) so
     nobody ever loses access to their own work — rules allow
     read/delete on any slot, write only within the plan. */
  async function list() {
    const snap = await metaCol().get();
    const out = new Array(MAX_SLOT_ID + 1).fill(null);
    snap.forEach(d => {
      const s = parseInt(d.id, 10);
      if (s >= 0 && s <= MAX_SLOT_ID) out[s] = Object.assign({ slot: s }, d.data());
    });
    return out;
  }

  async function read(slot) {
    const url = await fileRef(slot).getDownloadURL();
    const res = await fetch(url);
    if (!res.ok) throw new Error('download failed (' + res.status + ')');
    return await res.json();
  }

  async function write(slot, payload) {
    /* payload = same shape as local saves: {app, version, doc, thumb, saved} */
    const json = JSON.stringify(payload);
    await fileRef(slot).putString(json, 'raw', { contentType: 'application/json' });
    await metaCol().doc(String(slot)).set({
      name: (payload.doc && payload.doc.name) || '(untitled)',
      modified: Date.now(),
      thumb: payload.thumb || null,
      bytes: json.length,
      version: CF.VERSION,
    });
  }

  async function remove(slot) {
    try { await fileRef(slot).delete(); }
    catch (e) { if (!(e && e.code === 'storage/object-not-found')) throw e; }
    await metaCol().doc(String(slot)).delete();
  }

  async function rename(slot, name) {
    await metaCol().doc(String(slot)).set({ name }, { merge: true });
    /* payload keeps its old name until next save — meta is what lists show */
  }

  CF.cloud = {
    SLOTS,
    available: ready,
    tier,
    maxSlots: () => SLOTS[tier()] || 0,
    list, read, write, remove, rename, friendly,
    plansURL: 'https://coinforgestudio.com/#pricing',
  };
})();
