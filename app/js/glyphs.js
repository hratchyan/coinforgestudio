/* ============================================================
   CoinForge Studio — glyphs.js
   Curated Unicode glyph palette. Rendered with monochrome
   symbol fonts (Segoe UI Symbol). ︎ forces text
   presentation on characters that would otherwise render as
   color emoji.
   Author: Hratch Simonyan · License: MIT
   ============================================================ */
'use strict';
(function () {
  const V = '︎'; /* variation selector-15: force monochrome text presentation */
  const mono = s => Array.from(s).filter(c => c !== V).map(c => c + V);

  CF.Glyphs = {
    font: '"Segoe UI Symbol","Segoe UI",serif',
    categories: [
      { id: 'gstars', label: 'Stars', glyphs: mono('★☆✦✧✩✪✫✬✭✮✯✰✶✴✳❇⁕٭✱✲✵✷✸✹✺❂⍟') },
      { id: 'gornament', label: 'Ornaments', glyphs: mono('❦❧☙❡⁂※❖◈✿❀❁❃❋✽✾❄❅❆❈❉❊⚜') },
      { id: 'gcross', label: 'Crosses', glyphs: mono('✚✛✜✝✞✟✠☨☩☦☥♱♰') },
      { id: 'gmusic', label: 'Music', glyphs: mono('♩♪♫♬♭♮♯') },
      { id: 'gcards', label: 'Cards & Chess', glyphs: mono('♠♥♦♣♤♡♢♧♔♕♖♗♘♙♚♛♜♝♞♟') },
      { id: 'gzodiac', label: 'Zodiac', glyphs: mono('♈♉♊♋♌♍♎♏♐♑♒♓') },
      { id: 'gplanet', label: 'Astro', glyphs: mono('☉☽☾☿♀♁♂♃♄♅♆♇☄') },
      { id: 'garrow', label: 'Arrows', glyphs: mono('←↑→↓↔↕⇐⇑⇒⇓➔➜➤➢➣➛➙➞↞↠↟↡') },
      { id: 'ggeo', label: 'Geometric', glyphs: mono('●○◉◎◐◑◒◓◖◗■□▪▫▲△▼▽◆◇⬟⬢⬡◄►◤◥⯃⯂') },
      { id: 'gsymbol', label: 'Symbols', glyphs: mono('⚓⚔⚖⚙⚛⚑⚐☘☠☢☣☮☯☸✈⚡♻♾⚕☤⚚☫☬☪') },
      { id: 'ghands', label: 'Hands & Figures', glyphs: mono('☚☛☜☝☞☟✌✍♨☕') },
      { id: 'gweather', label: 'Weather & Nature', glyphs: mono('☀☁☂☃☄☾☽⛰⛵⚘❀') },
      { id: 'gpunct', label: 'Separators', glyphs: mono('•·∙◦‣⁃–—†‡§¶⁋∗∘⋆') },
    ]
  };
})();