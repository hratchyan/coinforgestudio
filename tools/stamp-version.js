/* Syncs the version from package.json into the app:
   - CF.VERSION in app/js/util.js
   - ?v= cache-busting suffix on every local script/style URL in app/index.html
   Run before deploying a release:  node tools/stamp-version.js            */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;

/* util.js */
const utilPath = path.join(root, 'app', 'js', 'util.js');
let util = fs.readFileSync(utilPath, 'utf8');
util = util.replace(/CF\.VERSION = '[^']*'/, `CF.VERSION = '${version}'`);
fs.writeFileSync(utilPath, util);

/* index.html — stamp ?v= on local js/css/vendor references */
const htmlPath = path.join(root, 'app', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
let count = 0;
html = html.replace(/(src|href)="((?:js|css|vendor)\/[^"?]+)(?:\?v=[^"]*)?"/g, (m, attr, url) => {
  count++;
  return `${attr}="${url}?v=${version}"`;
});
fs.writeFileSync(htmlPath, html);
console.log(`Stamped v${version}: util.js + ${count} asset URLs in index.html`);