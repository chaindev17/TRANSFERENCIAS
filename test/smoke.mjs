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

// ---- 3) la nube viene precargada (zero-config) ----
doc.querySelector('#drawerCloudSync').click();
assert.equal(doc.querySelector('#cloudUrl').value, 'https://xaumytmotnokdqbnxjgx.supabase.co', 'URL precargada');
assert.equal(doc.querySelector('#cloudKey').value, 'sb_publishable_70X6mCKv35NUxd3n8cP64A_kHb2kCC9', 'publishable key precargada');
console.log('zero-config OK: URL y publishable key precargadas en «Nube opcional»');

// ---- 4) tras desconectar (flag gestor_signed_out) la app abre el modal de entrada ----
const dom2 = new JSDOM(html, {
  url: 'https://gestor.local/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    try { window.crypto = webcrypto; } catch { /* jsdom ya trae crypto */ }
    window.confirm = () => true;
    window.alert = () => {};
    try { window.sessionStorage.setItem('gestor_signed_out', '1'); } catch { /* sin storage */ }
  },
});
const errors2 = [];
dom2.window.addEventListener('error', (e) => errors2.push(e.message));
await sleep(800);
assert.equal(dom2.window.document.querySelector('#cloudModal').classList.contains('hidden'), false, 'tras desconectar debe abrirse «Mi cuenta»');
assert.match((dom2.window.document.querySelector('#bannerText') || {}).innerHTML || '', /Sesión cerrada/, 'el banner anuncia la sesión cerrada');
assert.equal(errors2.length, 0, 'errores de ventana en boot signed-out: ' + errors2.join(' | '));
console.log('signed-out OK: sesión cerrada → aviso + modal de entrada abierto');

// ---- 5) menú Cuenta: abre el modal, guarda datos personales namespaced ----
const dom3 = new JSDOM(html, {
  url: 'https://gestor.local/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    try { window.crypto = webcrypto; } catch { /* jsdom ya trae crypto */ }
    window.confirm = () => true;
    window.alert = () => {};
  },
});
const errors3 = [];
dom3.window.addEventListener('error', (e) => errors3.push(e.message));
const doc3 = dom3.window.document;
assert.ok(doc3.querySelector('#drawerCuentaBtn'), 'el menú tiene el botón «Cuenta»');
doc3.querySelector('#drawerCuentaBtn').click();
assert.equal(doc3.querySelector('#cuentaModal').classList.contains('hidden'), false, 'clic en Cuenta debe abrir el modal');
doc3.querySelector('#personaName').value = 'Ada Prueba';
doc3.querySelector('#personaPhone').value = '+598 99 000 000';
doc3.querySelector('#personaEmail').value = 'ada@ejemplo.com';
doc3.querySelector('#personaSaveBtn').click();
const savedPersona = JSON.parse(dom3.window.localStorage.getItem('local:gestor_persona') || 'null');
assert.ok(savedPersona, 'persona guardada con espacio local:');
assert.equal(savedPersona.name, 'Ada Prueba');
assert.equal(savedPersona.phone, '+598 99 000 000');
assert.equal(savedPersona.email, 'ada@ejemplo.com');
assert.equal(doc3.querySelector('#cuentaLogoutBtn').textContent.includes('Entrar'), true, 'modo local: el botón invita a entrar');
assert.equal(errors3.length, 0, 'errores de ventana en boot cuenta: ' + errors3.join(' | '));
console.log('cuenta OK: modal abre, datos personales guardados en el espacio local');
process.exit(0);
