// Prueba de humo previa al deploy.
// 1) Sintaxis de todos los <script> inline de index.html (vm.Script).
// 2) Boot real de la app en jsdom + importación de un fixture SINTÉTICO
//    por el flujo de la UI: Importar base JSON → Reemplazar todo.
//    (Nunca uses tu base real como fixture: este archivo queda en el repo.)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';

const root = new URL('..', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8');

// ---- 1) sintaxis ----
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
assert.ok(blocks.length >= 1, 'no encontré scripts inline en index.html');
blocks.forEach((code, i) => new vm.Script(code, { filename: 'index.html#script' + i }));
console.log('sintaxis OK (' + blocks.length + ' scripts inline)');

// ---- 2) boot + importación ----
const fixture = JSON.parse(fs.readFileSync(new URL('test/fixture-ale.json', root), 'utf8'));
const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dom = new JSDOM(html, {
  url: 'https://gestor.local/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    try { window.crypto = webcrypto; } catch { /* jsdom ya trae crypto */ }
    window.confirm = () => true;
    window.alert = () => {};
  },
});
dom.window.addEventListener('error', (e) => errors.push(e.message));
await sleep(400);

const doc = dom.window.document;
const input = doc.querySelector('#dbFileInput');
assert.ok(input, 'no existe #dbFileInput');
const file = new dom.window.File([JSON.stringify(fixture)], 'fixture-ale.json', { type: 'application/json' });
Object.defineProperty(input, 'files', { value: [file], configurable: true });
input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
await sleep(300);

assert.equal(doc.querySelector('#dbModal').classList.contains('hidden'), false, 'el modal de importación no se abrió');
const summary = doc.querySelector('#dbImportSummary').textContent || '';
assert.match(summary, /Base Ale/, 'formato detectado inesperado: ' + summary.slice(0, 80));

doc.querySelector('#dbReplaceBtn').click();
await sleep(300);

const get = (k) => JSON.parse(dom.window.localStorage.getItem('local:' + k) || 'null');
assert.equal(get('gestor_clientes').length, 2, 'clientes importados');
assert.equal(get('gestor_recibos').length, 2, 'recibos importados');
assert.equal(get('gestor_transferencias').length, 2, 'transferencias importadas');
assert.equal(get('gestor_finanzas').length, 1, 'finanzas importadas');
const meta = get('gestor_meta') || {};
assert.equal(meta.db && meta.db.format, 'Base Ale / español', 'meta.db.format');
assert.equal(errors.length, 0, 'errores de ventana: ' + errors.join(' | '));

console.log('smoke OK: boot sin errores + importación (Reemplazar) con conteos verificados');
process.exit(0);
