/* ============================================================
   CoinForge Studio — qr.js
   Dependency-free QR encoder (ISO/IEC 18004): byte mode, EC
   levels L/M/Q/H, versions 1–10 (auto-select), full 8-mask
   penalty evaluation. Runs entirely offline — nothing leaves
   the machine. Feeds the 'qr' element in elements.js.
   Self-checks: module-capacity vs block tables + RS syndromes.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {

  /* ---------- GF(256), poly 0x11D ---------- */
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    let x = 1;
    for (let i = 0; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  const gmul = (a, b) => (a && b) ? EXP[LOG[a] + LOG[b]] : 0;

  /* RS generator polynomial for ecLen (cached) */
  const genCache = new Map();
  function rsGenerator(ecLen) {
    let g = genCache.get(ecLen);
    if (g) return g;
    g = [1];
    for (let i = 0; i < ecLen; i++) {
      const next = new Array(g.length + 1).fill(0);
      for (let j = 0; j < g.length; j++) {
        next[j] ^= gmul(g[j], EXP[i]);
        next[j + 1] ^= g[j];
      }
      g = next;
    }
    g.reverse(); /* highest degree first */
    genCache.set(ecLen, g);
    return g;
  }

  function rsEncode(data, ecLen) {
    const gen = rsGenerator(ecLen);
    const rem = new Uint8Array(ecLen);
    for (const d of data) {
      const factor = d ^ rem[0];
      rem.copyWithin(0, 1);
      rem[ecLen - 1] = 0;
      if (factor) {
        for (let i = 0; i < ecLen; i++) rem[i] ^= gmul(gen[i + 1], factor);
      }
    }
    return rem;
  }

  /* self-check: codeword poly must have zero syndromes at α^0..α^(ecLen-1) */
  function rsSyndromesZero(codewords, ecLen) {
    for (let i = 0; i < ecLen; i++) {
      let s = 0;
      const a = EXP[i];
      for (const c of codewords) s = gmul(s, a) ^ c;
      if (s !== 0) return false;
    }
    return true;
  }

  /* ---------- version tables (1–10) ----------
     [ecPerBlock, [[numBlocks, dataCodewordsPerBlock], ...]] per level */
  const TABLE = {
    1: { L: [7, [[1, 19]]], M: [10, [[1, 16]]], Q: [13, [[1, 13]]], H: [17, [[1, 9]]] },
    2: { L: [10, [[1, 34]]], M: [16, [[1, 28]]], Q: [22, [[1, 22]]], H: [28, [[1, 16]]] },
    3: { L: [15, [[1, 55]]], M: [26, [[1, 44]]], Q: [18, [[2, 17]]], H: [22, [[2, 13]]] },
    4: { L: [20, [[1, 80]]], M: [18, [[2, 32]]], Q: [26, [[2, 24]]], H: [16, [[4, 9]]] },
    5: { L: [26, [[1, 108]]], M: [24, [[2, 43]]], Q: [18, [[2, 15], [2, 16]]], H: [22, [[2, 11], [2, 12]]] },
    6: { L: [18, [[2, 68]]], M: [16, [[4, 27]]], Q: [24, [[4, 19]]], H: [28, [[4, 15]]] },
    7: { L: [20, [[2, 78]]], M: [18, [[4, 31]]], Q: [18, [[2, 14], [4, 15]]], H: [26, [[4, 13], [1, 14]]] },
    8: { L: [24, [[2, 97]]], M: [22, [[2, 38], [2, 39]]], Q: [22, [[4, 18], [2, 19]]], H: [26, [[4, 14], [2, 15]]] },
    9: { L: [30, [[2, 116]]], M: [22, [[3, 36], [2, 37]]], Q: [20, [[4, 16], [4, 17]]], H: [24, [[4, 12], [4, 13]]] },
    10: { L: [18, [[2, 68], [2, 69]]], M: [26, [[4, 43], [1, 44]]], Q: [24, [[6, 19], [2, 20]]], H: [28, [[6, 15], [2, 16]]] },
  };
  const MAX_VERSION = 10;
  const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
  const ECL_BITS = { L: 1, M: 0, Q: 3, H: 2 };

  const dataCodewords = (v, ecl) => TABLE[v][ecl][1].reduce((s, [n, d]) => s + n * d, 0);
  const totalCodewords = (v, ecl) => {
    const [ec, groups] = TABLE[v][ecl];
    return groups.reduce((s, [n, d]) => s + n * (d + ec), 0);
  };

  /* ---------- BCH for format / version info ---------- */
  const G15 = 0x537, G15_MASK = 0x5412, G18 = 0x1f25;
  const bchDigit = (x) => { let d = 0; while (x) { d++; x >>>= 1; } return d; };
  function bchFormat(data) {
    let d = data << 10;
    while (bchDigit(d) - bchDigit(G15) >= 0) d ^= G15 << (bchDigit(d) - bchDigit(G15));
    return ((data << 10) | d) ^ G15_MASK;
  }
  function bchVersion(v) {
    let d = v << 12;
    while (bchDigit(d) - bchDigit(G18) >= 0) d ^= G18 << (bchDigit(d) - bchDigit(G18));
    return (v << 12) | d;
  }

  /* ---------- matrix construction ---------- */
  /* matrix cells: null = free for data, 0/1 = function/data module */
  function newMatrix(version) {
    const size = version * 4 + 17;
    const m = new Array(size);
    for (let i = 0; i < size; i++) m[i] = new Array(size).fill(null);
    return m;
  }

  function placeFinder(m, row0, col0) {
    const size = m.length;
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row0 + r, cc = col0 + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        const dark = (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        m[rr][cc] = dark ? 1 : 0;
      }
    }
  }

  function placeFunctionPatterns(m, version) {
    const size = m.length;
    placeFinder(m, 0, 0);
    placeFinder(m, 0, size - 7);
    placeFinder(m, size - 7, 0);
    /* alignment */
    const pos = ALIGN[version];
    for (const r of pos) {
      for (const c of pos) {
        if (m[r][c] !== null) continue; /* overlaps a finder */
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            m[r + dr][c + dc] = (Math.max(Math.abs(dr), Math.abs(dc)) !== 1) ? 1 : 0;
          }
        }
      }
    }
    /* timing */
    for (let i = 8; i < size - 8; i++) {
      if (m[6][i] === null) m[6][i] = i % 2 === 0 ? 1 : 0;
      if (m[i][6] === null) m[i][6] = i % 2 === 0 ? 1 : 0;
    }
    /* dark module */
    m[size - 8][8] = 1;
  }

  function placeFormatInfo(m, ecl, maskPattern) {
    const size = m.length;
    const bits = bchFormat((ECL_BITS[ecl] << 3) | maskPattern);
    for (let i = 0; i < 15; i++) {
      const mod = (bits >> i) & 1;
      /* vertical copy (col 8) */
      if (i < 6) m[i][8] = mod;
      else if (i < 8) m[i + 1][8] = mod;
      else m[size - 15 + i][8] = mod;
      /* horizontal copy (row 8) */
      if (i < 8) m[8][size - i - 1] = mod;
      else if (i < 9) m[8][15 - i - 1 + 1] = mod;
      else m[8][15 - i - 1] = mod;
    }
  }

  function placeVersionInfo(m, version) {
    if (version < 7) return;
    const size = m.length;
    const bits = bchVersion(version);
    for (let i = 0; i < 18; i++) {
      const mod = (bits >> i) & 1;
      m[Math.floor(i / 3)][i % 3 + size - 8 - 3] = mod;
      m[i % 3 + size - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  const MASKS = [
    (i, j) => (i + j) % 2 === 0,
    (i, j) => i % 2 === 0,
    (i, j) => j % 3 === 0,
    (i, j) => (i + j) % 3 === 0,
    (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
    (i, j) => (i * j) % 2 + (i * j) % 3 === 0,
    (i, j) => ((i * j) % 2 + (i * j) % 3) % 2 === 0,
    (i, j) => ((i * j) % 3 + (i + j) % 2) % 2 === 0,
  ];

  /* zigzag data placement, mask applied to data modules only */
  function placeData(m, codewords, maskPattern) {
    const size = m.length;
    const mask = MASKS[maskPattern];
    let inc = -1, row = size - 1, bitIndex = 7, byteIndex = 0;
    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (;;) {
        for (let c = 0; c < 2; c++) {
          if (m[row][col - c] === null) {
            let dark = 0;
            if (byteIndex < codewords.length) dark = (codewords[byteIndex] >>> bitIndex) & 1;
            if (mask(row, col - c)) dark ^= 1;
            m[row][col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
          }
        }
        row += inc;
        if (row < 0 || row >= size) { row -= inc; inc = -inc; break; }
      }
    }
  }

  /* ---------- mask penalty (spec rules N1–N4) ---------- */
  function penalty(m) {
    const size = m.length;
    let score = 0;
    /* N1: runs ≥5 in rows and cols */
    for (let axis = 0; axis < 2; axis++) {
      for (let i = 0; i < size; i++) {
        let run = 1, prev = axis ? m[0][i] : m[i][0];
        for (let j = 1; j < size; j++) {
          const v = axis ? m[j][i] : m[i][j];
          if (v === prev) {
            run++;
            if (run === 5) score += 3;
            else if (run > 5) score += 1;
          } else { run = 1; prev = v; }
        }
      }
    }
    /* N2: 2×2 blocks */
    for (let i = 0; i < size - 1; i++) {
      for (let j = 0; j < size - 1; j++) {
        const v = m[i][j];
        if (v === m[i][j + 1] && v === m[i + 1][j] && v === m[i + 1][j + 1]) score += 3;
      }
    }
    /* N3: 1011101 with 0000 on either side, rows and cols */
    const pat = [1, 0, 1, 1, 1, 0, 1];
    const at = (axis, i, j) => axis ? m[j][i] : m[i][j];
    for (let axis = 0; axis < 2; axis++) {
      for (let i = 0; i < size; i++) {
        for (let j = 0; j + 7 <= size; j++) {
          let hit = true;
          for (let k = 0; k < 7; k++) if (at(axis, i, j + k) !== pat[k]) { hit = false; break; }
          if (!hit) continue;
          let lightBefore = j >= 4, lightAfter = j + 11 <= size;
          for (let k = 1; k <= 4 && lightBefore; k++) if (at(axis, i, j - k) !== 0) lightBefore = false;
          for (let k = 0; k < 4 && lightAfter; k++) if (at(axis, i, j + 7 + k) !== 0) lightAfter = false;
          if (lightBefore || lightAfter) score += 40;
        }
      }
    }
    /* N4: dark proportion */
    let dark = 0;
    for (const row of m) for (const v of row) dark += v;
    const pct = dark * 100 / (size * size);
    score += Math.floor(Math.abs(pct - 50) / 5) * 10;
    return score;
  }

  /* ---------- capacity self-check (guards the tables) ---------- */
  const capacityChecked = new Set();
  function assertCapacity(version, ecl) {
    const key = version + ecl;
    if (capacityChecked.has(key)) return;
    const m = newMatrix(version);
    placeFunctionPatterns(m, version);
    placeFormatInfo(m, ecl, 0);
    placeVersionInfo(m, version);
    let free = 0;
    for (const row of m) for (const v of row) if (v === null) free++;
    if (Math.floor(free / 8) !== totalCodewords(version, ecl)) {
      throw new Error(`QR internal: capacity mismatch v${version}-${ecl} (${Math.floor(free / 8)} vs ${totalCodewords(version, ecl)})`);
    }
    capacityChecked.add(key);
  }

  /* ---------- encode ---------- */
  function encode(text, ecl) {
    ecl = TABLE[1][ecl] ? ecl : 'M';
    const bytes = new TextEncoder().encode(String(text));

    /* pick the smallest version that fits (byte mode) */
    let version = 0;
    for (let v = 1; v <= MAX_VERSION; v++) {
      const cci = v <= 9 ? 8 : 16;
      if (4 + cci + 8 * bytes.length <= dataCodewords(v, ecl) * 8) { version = v; break; }
    }
    if (!version) throw new Error('QR: text too long for version ' + MAX_VERSION + '-' + ecl + ' (' + bytes.length + ' bytes) — shorten the text or lower the EC level');
    assertCapacity(version, ecl);

    /* bit stream: mode 0100, count, data, terminator, pad */
    const dcTotal = dataCodewords(version, ecl);
    const bits = [];
    const push = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    push(4, 4);
    push(bytes.length, version <= 9 ? 8 : 16);
    for (const b of bytes) push(b, 8);
    for (let i = 0; i < 4 && bits.length < dcTotal * 8; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);
    const data = new Uint8Array(dcTotal);
    let di = 0;
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      data[di++] = b;
    }
    const PAD = [0xec, 0x11];
    for (let p = 0; di < dcTotal; p ^= 1) data[di++] = PAD[p];

    /* split into blocks, RS-encode each */
    const [ecLen, groups] = TABLE[version][ecl];
    const blocks = [];
    let off = 0;
    for (const [n, dlen] of groups) {
      for (let b = 0; b < n; b++) {
        const d = data.slice(off, off + dlen);
        off += dlen;
        const ec = rsEncode(d, ecLen);
        /* RS self-check: full codeword must have zero syndromes */
        if (!rsSyndromesZero([...d, ...ec], ecLen)) throw new Error('QR internal: RS syndrome check failed');
        blocks.push({ d, ec });
      }
    }

    /* interleave */
    const out = [];
    const maxD = Math.max(...blocks.map(b => b.d.length));
    for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.d.length) out.push(b.d[i]);
    for (let i = 0; i < ecLen; i++) for (const b of blocks) out.push(b.ec[i]);

    /* try all 8 masks, keep the best */
    let best = null, bestScore = Infinity, bestMask = 0;
    for (let mp = 0; mp < 8; mp++) {
      const m = newMatrix(version);
      placeFunctionPatterns(m, version);
      placeFormatInfo(m, ecl, mp);
      placeVersionInfo(m, version);
      placeData(m, out, mp);
      const s = penalty(m);
      if (s < bestScore) { bestScore = s; best = m; bestMask = mp; }
    }

    const size = best.length;
    const modules = new Uint8Array(size * size);
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) modules[r * size + c] = best[r][c];
    return { size, version, ecl, mask: bestMask, modules, get: (x, y) => modules[y * size + x] === 1 };
  }

  /* memoized encode for render loops; returns null while text is invalid */
  const memo = new Map();
  function cached(text, ecl) {
    const key = ecl + '|' + text;
    let e = memo.get(key);
    if (e === undefined) {
      try { e = encode(text, ecl); }
      catch (err) { e = null; }
      if (memo.size > 40) memo.clear();
      memo.set(key, e);
    }
    return e;
  }

  CF.QR = { encode, cached, MAX_VERSION };
})();
