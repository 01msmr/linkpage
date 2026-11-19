#!/usr/bin/env node
// Snapshot of a.msmr.co for another instance: node tools/import-a.js [url-or-file] > site.json (default source: https://a.msmr.co/links.php).
const fs = require('node:fs');
const path = require('node:path');
const L = require('../public/-/js/logic.js');

const SOURCE = 'https://a.msmr.co/links.php';
const BASE = path.join(__dirname, '..', 'public', '-', 'seeds', 'default.json');

// Sections become top folders (their title), links become link items with a dash slug (numbered only inside one folder).
function convert(sections) {
  const rows = sections
    .map(s => ({ name: String(s.title || s.id || '').trim(), links: (s.links || []).filter(l => l && String(l.name || '').trim() && String(l.url || '').trim()) }))
    .filter(s => s.name && s.links.length);
  return rows.map(s => {
    const items = [];
    s.links.forEach(l => items.push({ name: String(l.name).trim(), url: String(l.url).trim(), slug: L.slugFor(String(l.name).trim(), items) }));
    return { name: s.name, items };
  });
}

function buildSite(base, sections) {
  return Object.assign({}, base, { items: convert(sections) });
}

async function read(source) {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + source);
    return res.json();
  }
  return JSON.parse(fs.readFileSync(source, 'utf8'));
}

if (require.main === module) {
  read(process.argv[2] || SOURCE)
    .then(sections => process.stdout.write(JSON.stringify(buildSite(JSON.parse(fs.readFileSync(BASE, 'utf8')), sections), null, 2) + '\n'))
    .catch(e => { console.error(e.message); process.exit(1); });
}

module.exports = { convert, buildSite };
