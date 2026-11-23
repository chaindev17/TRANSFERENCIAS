# Gestor Integral · Clientes, Finanzas y Operaciones

Aplicación web de un solo archivo (`index.html`) para gestionar **clientes, recibos,
transferencias, finanzas personales, comisiones y alertas de saldo** — pensada para el
negocio de transferencias del día a día. Sin backend propio y sin dependencias: abre y listo.

**Sitio en línea:** <https://chaindev17.github.io/TRANSFERENCIAS/>

## Qué hace

- **Clientes**: alta/edición/baja, comisión %, saldo, saldo mínimo y alertas.
- **Operaciones**: recibo (monto → comisión → neto), transferencia (banco, cuenta, tipo) y ajuste de saldo, con numeración de operación. Montos solo dígitos (coma o punto para centavos); cuenta solo números con **detección en vivo e iconos por banco** (Metropolitano / BPA / BANDEC / monedero), también visibles en las tarjetas del histórico.
- **Historial en tarjetas**: recibos y transferencias con badge por tipo, cliente, `#op`, monto grande,
  saldo restante (o comisión · neto), chip 💳 Tarjeta/👛 Monedero con el número **enmascarado**
  (toca para verlo u ocultarlo; 📋 copia el número o el resumen) y fecha + acciones ✎ 📋 🗑.
- **Cuentas sin verificación**: crea tu cuenta con solo un nombre y un PIN — cada persona ve únicamente
  su información en este dispositivo (espacio separado `p:<id>:gestor_*` + bloqueo con PIN).
  Sin correo ni contraseña. La nube (Supabase) sincroniza entre dispositivos; con
  «Confirm email» desactivado, la entrada es directa. **Cerrar sesión**: el botón 🔒 de la
  barra superior (o del menú) cierra la sesión de la nube en este dispositivo — tus datos
  locales y los de la nube quedan intactos; también desde 👤 Mi cuenta → «Desconectar».
- **Finanzas**: ingresos, egresos y ajustes con saldo base y libro mayor.
- **Compartir desde WhatsApp (Android)**: con la app instalada, comparte un mensaje
  desde WhatsApp → Gestor Integral y se abre en **Transferencia** con la tarjeta/monedero
  y el monto detectados. En iOS no existe esta integración; usa pegar, que detecta lo mismo.
- **Histórico general**: todo en un solo libro, con buscador, filtros, export CSV/JSON.
- **Base de datos**: importa/combina tu propio `.json`, detecta el formato,
  combina sin duplicados o reemplaza, respaldos automáticos locales, export/import con un clic.
- **Tema claro/oscuro**, atajos de teclado (`Alt+1…5`, `Ctrl/⌘+K`, `Alt+T`), diseño responsive.
- **Los datos viven en tu navegador** (localStorage): cada dispositivo tiene su copia hasta
  que entres a la nube. La app pública ya viene **precargada y sin configuración**:
  ☰ → 👤 Mi cuenta → ☁️ Nube opcional → **Iniciar sesión** con tu correo, y al entrar
  desde otro dispositivo te ofrece traer tu copia. Para self-host con tu propio proyecto:
  [docs/supabase-setup.md](docs/supabase-setup.md).
- **Funciona sin conexión (PWA)**: al abrirla una vez con internet, un Service Worker guarda
  la app completa en tu navegador; después abre y guarda **sin necesidad de conexión**.
  Puedes instalarla como app: en **Android/Chrome** → ⋮ → *Instalar app* (o el botón de instalar
  en la barra de direcciones); en **iPhone/iPad** → Compartir → *Añadir a pantalla de inicio*;
  en **escritorio (Chrome/Edge)** → icono de instalación en la barra de direcciones.

## Probarla en tu máquina

```bash
# cualquier servidor estático vale; uno de estas tres líneas:
python3 -m http.server 8080
npx serve .
npx http-server -p 8080 .
```

Abre <http://localhost:8080>. (También funciona abriendo el archivo directamente.)

> **Service Worker y PWA**: solo se activan sobre **HTTPS o localhost** (por diseño del navegador).
> Probando en `http://192.168.x.x` la app funciona igual, pero sin caché offline ni instalación.
> Con GitHub Pages (HTTPS) funciona todo: abre una vez con internet y queda disponible offline.

## Privacidad y seguridad — léelo si clonas o publicas

El repositorio es **público** y **no contiene datos financieros reales**: la base cifrada
que antes iba embebida en `index.html` se eliminó por completo (la app trabaja solo con lo
que guardes tú en el navegador y con los `.json` que importes). Las copias vitales:

- `private/` (con la base en claro y la contraseña) está en `.gitignore`: **nunca se sube**.
- **Multi-cuenta**: los datos viven en un espacio por cuenta (`p:<id>:gestor_*` para perfiles locales,
  `u:<id>:gestor_*` para cuentas de nube). El PIN protege el acceso casual en este dispositivo
  (privacidad casual, no cifrado fuerte); los datos en claro siguen visibles fuera de la app.
  Los perfiles nuevos **no** copian datos en silencio: si hay datos guardados en el navegador,
  el aviso ofrece **«Adoptar datos de este dispositivo»** explícitamente. En **modo local** sin
  cuenta la app funciona igual, separada de cualquier perfil.

## Estructura

```
index.html                  La app completa (HTML+CSS+JS, sin build)
private/                    SOLO local y gitignored: base en claro + contraseña (si existe)
supabase/schema.sql         Tabla gestor_snapshots + políticas RLS (para la nube)
docs/supabase-setup.md      Paso a paso para activar la sincronización en la nube
.github/workflows/deploy.yml  Despliegue automático a GitHub Pages (con verificación previa)
test/smoke.mjs              Prueba de humo (boot + importación de un fixture sintético)
test/fixture-ale.json       Datos SINTÉTICOS para esa prueba (nunca tu base real)
package.json                Solo para `npm test` (jsdom); la app no tiene dependencias
```

## Verificación previa al deploy

El workflow ejecuta `npm test` **antes** de publicar: levanta la app en jsdom,
revisa la sintaxis de los scripts inline e importa un fixture sintético por el
flujo real (Importar → Reemplazar) comprobando los conteos. Si algo se rompe,
el deploy no llega a Pages. Para correrlo en tu máquina (Node ≥ 18):

```bash
npm install
npm test
```

## Despliegue (GitHub Pages)

Cada push a la rama configurada dispara `.github/workflows/deploy.yml`, que publica el
contenido estático del repo en GitHub Pages. No hay build: lo que está en el repo es lo
que se sirve.

**Paso único previo (una vez por repositorio):** en GitHub ve a
*Settings → Pages → Build and deployment → Source* y elige **GitHub Actions** → Save.
Hasta que eso esté activo, el workflow falla en «Configurar Pages» con
`Get Pages site failed` (el token del workflow no puede habilitar Pages por sí mismo
en este repositorio). Después de guardarlo, vuelve a ejecutar el workflow:
`gh run rerun <id>` o simplemente haz otro push. La URL quedará en
<https://chaindev17.github.io/TRANSFERENCIAS/>.

**Fallo conocido e intermitente al final del deploy** («No artifacts named
github-pages were found» en el paso *Desplegar*, con «Subir artefacto» en verde):
es un problema de metadatos del lado de GitHub, no del contenido. Receta: borrar el
artifact del run y reejecutar solo el job fallido — se re-sube un único artifact y
cuaja:

```bash
gh api repos/<owner>/<repo>/actions/runs/<run-id>/artifacts --jq '.artifacts[].id'
gh api -X DELETE repos/<owner>/<repo>/actions/artifacts/<artifact-id>
gh run rerun <run-id> --failed
```

## Importar una base (.json)

La app reconoce tres formatos y avisa «Formato detectado» antes de aplicar:

- **Base Ale / español**: `clientes`, `recibos`, `transferencias`, `finanzas` en
  español (`nombre`, `monto`, `neto`, `numeroOp`…) — el formato histórico de las
  exportaciones de Ale.
- **Formato interno del gestor**: las claves que usa la app internamente
  (`clients`, `receipts`, `transfers`, `fin`…).
- **Gestor Integral v2** (`formato: "gestor_integral"`): lo que exporta esta
  misma pantalla — incluye precios de Toque/Abitab/Red Pagos y el objeto `interno`.

Siempre podés elegir **Combinar sin duplicados** (agrega solo lo nuevo, por ID y
por contenido) o **Reemplazar todo** (borra lo actual y usa el archivo).

**Si la importación falla**: la app muestra un aviso tipo
`No pude leer la base: …` — copiá ese mensaje exacto (y el nombre del archivo) en
una issue o en la conversación con el mantenedor. Los datos de tu navegador no se
tocan cuando falla la importación.

Recordá: el `.json` con tus datos **nunca** se commitea; `private/` y `*.local`
están gitignoreados a propósito.

## Respaldos

La app guarda **las últimas 3 copias automáticas locales** (panel Base de datos) y permite
**Exportar base JSON** en cualquier momento. Para llevarte los datos a otro dispositivo:
Exporta → copia el `.json` → en el otro dispositivo *Importar base JSON* → *Combinar sin
duplicados*. Si activaste la nube, usa «☁️ Sincronizar con la nube» en su lugar.
