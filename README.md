# Gestor Integral · Clientes, Finanzas y Operaciones

Aplicación web de un solo archivo (`index.html`) para gestionar **clientes, recibos,
transferencias, finanzas personales, comisiones y alertas de saldo** — pensada para el
negocio de transferencias del día a día. Sin backend propio y sin dependencias: abre y listo.

**Sitio en línea:** <https://chaindev17.github.io/TRANSFERENCIAS/>

## Qué hace

- **Clientes**: alta/edición/baja, comisión %, saldo, saldo mínimo y alertas.
- **Operaciones**: recibo (monto → comisión → neto), transferencia (banco, cuenta, tipo) y ajuste de saldo, con numeración de operación.
- **Historial en tarjetas**: recibos y transferencias con badge por tipo, cliente, `#op`, monto grande,
  saldo restante (o comisión · neto), chip 💳 Tarjeta/👛 Monedero con el número **enmascarado**
  (toca para verlo u ocultarlo; 📋 copia el número o el resumen) y fecha + acciones ✎ 📋 🗑.
- **Cuentas con verificación por correo**: registro abierto vía Supabase Auth; cada usuario ve
  únicamente sus datos (RLS + espacio local separado por cuenta). Modo local disponible sin cuenta,
  con opción de **adoptar** los datos ya guardados en el navegador.
- **Finanzas**: ingresos, egresos y ajustes con saldo base y libro mayor.
- **Histórico general**: todo en un solo libro, con buscador, filtros, export CSV/JSON.
- **Base de datos**: importa/combina la base adjunta o tu propio `.json`, detecta el formato,
  combina sin duplicados o reemplaza, respaldos automáticos locales, export/import con un clic.
- **Tema claro/oscuro**, atajos de teclado (`Alt+1…5`, `Ctrl/⌘+K`, `Alt+T`), diseño responsive.
- **Los datos viven en tu navegador** (localStorage): cada dispositivo tiene su copia hasta
  que actives la [sincronización opcional con Supabase](docs/supabase-setup.md).

## Probarla en tu máquina

```bash
# cualquier servidor estático vale; uno de estas tres líneas:
python3 -m http.server 8080
npx serve .
npx http-server -p 8080 .
```

Abre <http://localhost:8080>. (También funciona abriendo el archivo directamente,
aunque `crypto.subtle` de la base cifrada requiere HTTPS o `localhost`.)

## Privacidad y seguridad — léelo si clonas o publicas

El repositorio es **público** y la base adjunta contiene información financiera real,
por eso viaja **cifrada**:

- `index.html` incluye la base adjunta como **AES-256-GCM** con KDF **PBKDF2-SHA-256**
  (250 000 iteraciones, sal e IV aleatorios). Sin la contraseña es ruido.
- El descifrado ocurre **en el navegador** (WebCrypto) al pulsar
  *«Desbloquear base adjunta»*. La contraseña nunca se envía a ningún servidor ni se guarda.
- `private/` (con la base en claro y la contraseña) está en `.gitignore`: **nunca se sube**.
- El identificador `97cc5e…` en `ATTACHED_META.sha256` es solo una firma para no
  re-importar dos veces la misma base; no es una clave ni un secreto.
- **Multi-cuenta**: los datos locales viven en un espacio por cuenta (`u:<id>:gestor_*`).
  Al iniciar sesión por primera vez en un navegador que tenía la versión anterior,
  los datos se **copian** automáticamente a tu cuenta (el original se conserva).
  En **modo local** (sin sesión) la app no toca los datos de ninguna cuenta; si detecta
  datos previos, ofrece **«Adoptar datos de este dispositivo»** explícitamente.

## Estructura

```
index.html                  La app completa (HTML+CSS+JS, sin build)
private/                    SOLO local y gitignored: base en claro + contraseña
supabase/schema.sql         Tabla gestor_snapshots + políticas RLS (para la nube)
docs/supabase-setup.md      Paso a paso para activar la sincronización en la nube
.github/workflows/deploy.yml  Despliegue automático a GitHub Pages
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

## Respaldos

La app guarda **copias automáticas locales** (panel Base de datos) y permite
**Exportar base JSON** en cualquier momento. Para llevarte los datos a otro dispositivo:
Exporta → copia el `.json` → en el otro dispositivo *Importar base JSON* → *Combinar sin
duplicados*. Si activaste la nube, usa «☁️ Sincronizar con la nube» en su lugar.
