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
doc.querySelector('#drawerCuentaBtn').click();
doc.querySelector('#cuentaSyncBtn').click();
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
assert.equal(doc3.querySelector('#cuenta').classList.contains('active'), true, 'clic en Cuenta debe navegar a su página');
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
console.log('cuenta OK: página Cuenta navega, datos personales guardados en el espacio local');

// ---- 5b) Cuenta es una PÁGINA: el botón del menú navega a ella ----
const doc5b = new JSDOM(html, {
  url: 'https://gestor.local/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    try { window.crypto = webcrypto; } catch { /* jsdom ya trae crypto */ }
    window.confirm = () => true;
    window.alert = () => {};
  },
});
const errors5b = [];
doc5b.window.addEventListener('error', (e) => errors5b.push(e.message));
const docB = doc5b.window.document;
docB.querySelector('#drawerCuentaBtn').click();
assert.equal(docB.querySelector('#cuenta').classList.contains('active'), true, 'Cuenta navega a su página');
docB.querySelector('#drawerNav [data-go="basedatos"]').click();
assert.equal(docB.querySelector('#basedatos').classList.contains('active'), true, 'Base de datos navega a su página');
const navGo = [...docB.querySelectorAll('#drawerNav .mlink[data-go]')].map((b) => b.getAttribute('data-go'));
for (const go of navGo) {
  assert.ok(docB.querySelector('#' + go) || docB.querySelector('#operaciones'), 'destino existe: ' + go);
}
console.log('navegación OK: Base de datos y Cuenta son páginas; todos los botones del menú navegan');

// ---- 6) tocar «Gestor Integral» (marca) abre el modal de monedas sin red ----
const dom4 = new JSDOM(html, {
  url: 'https://gestor.local/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    try { window.crypto = webcrypto; } catch { /* jsdom ya trae crypto */ }
    window.confirm = () => true;
    window.alert = () => {};
  },
});
const errors4 = [];
dom4.window.addEventListener('error', (e) => errors4.push(e.message));
const doc4 = dom4.window.document;
assert.ok(doc4.querySelector('#brandCurrencyBtn'), 'la marca es tocable');
doc4.querySelector('#brandCurrencyBtn').click();
assert.equal(doc4.querySelector('#currencyModal').classList.contains('hidden'), false, 'toque en la marca abre «Monedas»');
assert.equal(errors4.length, 0, 'errores de ventana en boot monedas: ' + errors4.join(' | '));
console.log('monedas OK: la marca abre el modal de cotización en vivo (sin red en el test)');

// ---- 7) portada estilo Prex: saldo, ojo y acciones rápidas ----
const dom5 = new JSDOM(html, {
  url: 'https://gestor.local/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    try { window.crypto = webcrypto; } catch { /* jsdom ya trae crypto */ }
    window.confirm = () => true;
    window.alert = () => {};
  },
});
const errors5 = [];
dom5.window.addEventListener('error', (e) => errors5.push(e.message));
const doc5 = dom5.window.document;
assert.ok(doc5.querySelector('#prexHero'), 'la portada existe');
assert.equal(doc5.querySelectorAll('#quickGrid .quick-btn').length, 6, 'seis acciones rápidas');
doc5.querySelector('#togglePrivacyEye').click();
assert.equal(dom5.window.document.documentElement.classList.contains('privacy'), true, 'el ojo oculta importes');
doc5.querySelector('#togglePrivacyEye').click();
assert.equal(dom5.window.document.documentElement.classList.contains('privacy'), false, 'segundo toque muestra importes');
doc5.querySelector('#quickGrid .quick-btn[data-go="recibo"]').click();
assert.equal(doc5.querySelector('#recibo').classList.contains('active'), true, 'acción rápida navega a Recibo');
assert.equal(errors5.length, 0, 'errores de ventana en portada: ' + errors5.join(' | '));
console.log('prex OK: portada con saldo, ojo de privacidad y acciones rápidas');

// ---- 8) barra inferior Prex: existe y navega ----
const dom6 = new JSDOM(html, {
  url: 'https://gestor.local/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    try { window.crypto = webcrypto; } catch { /* jsdom ya trae crypto */ }
    window.confirm = () => true;
    window.alert = () => {};
  },
});
const errors6 = [];
dom6.window.addEventListener('error', (e) => errors6.push(e.message));
const doc6 = dom6.window.document;
assert.equal(doc6.querySelectorAll('#bottomBar .bb-item').length, 5, 'barra inferior con 5 accesos');
doc6.querySelector('#bottomBar .bb-item[data-go="cuenta"]').click();
assert.equal(doc6.querySelector('#cuenta').classList.contains('active'), true, 'barra: Cuenta navega');
assert.equal(doc6.querySelector('#bottomBar .bb-item[data-go="cuenta"]').classList.contains('active'), true, 'barra: resaltado en Cuenta');
doc6.querySelector('#bottomBar .bb-item[data-go="saldo"]').click();
assert.equal(doc6.querySelector('#saldo').classList.contains('active'), true, 'barra: Saldo navega a la tarjeta de saldo');
assert.equal(doc6.querySelector('#bottomBar .bb-item[data-go="saldo"]').classList.contains('active'), true, 'barra: resaltado en Saldo');
assert.equal(errors6.length, 0, 'errores de ventana en barra inferior: ' + errors6.join(' | '));
console.log('prex bottom OK: barra inferior presente, navega y resalta');
// El importador Ale desvincula las finanzas de clientes
assert.equal((get('gestor_finanzas') || [])[0].clientId, '', 'las finanzas importadas no vinculan clientes');
assert.equal((get('gestor_historial') || []).some((h) => h && h.module === 'Finanzas'), false, 'el histórico importado no contiene finanzas');
console.log('desacople OK: importación sin relación finanzas ↔ clientes/recibos/transferencias');

// ---- 9) Finanzas es 100% manual: sin clientes ni aparición en el Histórico ----
const dom7 = new JSDOM(html, {
  url: 'https://gestor.local/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    try { window.crypto = webcrypto; } catch { /* jsdom ya trae crypto */ }
    window.confirm = () => true;
    window.alert = () => {};
  },
});
const errors7 = [];
dom7.window.addEventListener('error', (e) => errors7.push(e.message));
const doc7 = dom7.window.document;
assert.equal(doc7.querySelector('#financeClient'), null, 'el formulario de finanzas no vincula clientes');
assert.equal([...doc7.querySelectorAll('#historyModule option')].some((o) => o.textContent === 'Finanzas'), false, 'Finanzas no es un módulo filtrable del Histórico');
assert.equal(doc7.querySelector('#historyFinance'), null, 'el Histórico ya no cuenta finanzas');
doc7.querySelector('#drawerNav [data-go="finanzas"]').click();
doc7.querySelector('#financeKind').value = 'ingreso';
doc7.querySelector('#financeAmount').value = '1234.5';
doc7.querySelector('#financeConcept').value = 'Prueba desacople';
doc7.querySelector('#financeDate').value = '2026-11-20T10:00';
doc7.querySelector('#financeForm').dispatchEvent(new dom7.window.Event('submit', { bubbles: true, cancelable: true }));
await sleep(100);
assert.match(doc7.querySelector('#financeHistoryBody').textContent || '', /Prueba desacople/, 'el movimiento queda en el Libro de finanzas');
doc7.querySelector('#drawerNav [data-go="historico"]').click();
assert.doesNotMatch(doc7.querySelector('#historyBody').textContent || '', /Prueba desacople/, 'la finanzas no aparece en el Histórico');
assert.equal(errors7.length, 0, 'errores de ventana en el desacople finanzas: ' + errors7.join(' | '));
console.log('finanzas OK: libro manual sin clientes, sin rastro en el Histórico');

// ---- 10) acceso estilo KeyCard: Google / Apple / correo + retorno OAuth ----
const dom8 = new JSDOM(html, {
  url: 'https://gestor.local/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    try { window.crypto = webcrypto; } catch { /* jsdom ya trae crypto */ }
    window.confirm = () => true;
    window.alert = () => {};
  },
});
const errors8 = [];
dom8.window.addEventListener('error', (e) => errors8.push(e.message));
const doc8 = dom8.window.document;
assert.ok(doc8.querySelector('#lockOAuthGoogleBtn'), 'pantalla de entrada: botón Google');
assert.ok(doc8.querySelector('#lockOAuthAppleBtn'), 'pantalla de entrada: botón Apple');
assert.ok(doc8.querySelector('#lockEmailBtn'), 'pantalla de entrada: acceso por correo');
doc8.querySelector('#drawerCuentaBtn').click();
doc8.querySelector('#cuentaSyncBtn').click();
assert.ok(doc8.querySelector('#cloudOAuthGoogleBtn'), '«Mi cuenta»: botón Google');
assert.ok(doc8.querySelector('#cloudOAuthAppleBtn'), '«Mi cuenta»: botón Apple');
assert.ok(doc8.querySelector('#cloudMagicBtn'), '«Mi cuenta»: enlace mágico para cualquier correo');
doc8.querySelector('#cloudOAuthGoogleBtn').click();
assert.match(doc8.querySelector('#cloudStatus').textContent || '', /Google/, 'el botón Google redirige vía Supabase');
assert.equal(errors8.length, 0, 'errores de ventana en el acceso OAuth: ' + errors8.join(' | '));
console.log('oauth OK: acceso con Google/Apple/correo presente y cableado');

// ---- 11) retorno OAuth: #access_token en la URL guarda la sesión y limpia el hash ----
const dom9 = new JSDOM(html, {
  url: 'https://gestor.local/#access_token=tok123abc&refresh_token=ref456def&expires_in=3600&token_type=bearer&type=signup',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    try { window.crypto = webcrypto; } catch { /* jsdom ya trae crypto */ }
    window.confirm = () => true;
    window.alert = () => {};
    window.fetch = async (url) => {
      if (String(url).includes('/auth/v1/user')) {
        return { ok: true, status: 200, json: async () => ({ id: 'u-oauth', email: 'oauth@ejemplo.com', user_metadata: { full_name: 'Ana Prueba' } }) };
      }
      return { ok: false, status: 400, json: async () => ({ message: 'no hay red en el test' }) };
    };
  },
});
const errors9 = [];
dom9.window.addEventListener('error', (e) => errors9.push(e.message));
await sleep(500);
const nube = dom9.window.localStorage.getItem('gestor_nube') || '';
assert.ok(nube.includes('tok123abc'), 'el retorno de OAuth guarda la sesión en gestor_nube');
assert.equal(dom9.window.location.hash, '', 'el hash OAuth se limpia tras procesarlo');
assert.equal(errors9.length, 0, 'errores de ventana en el retorno OAuth: ' + errors9.join(' | '));
console.log('oauth callback OK: sesión guardada, hash limpio');
process.exit(0);
