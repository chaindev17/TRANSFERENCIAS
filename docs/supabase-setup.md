# Sincronización en la nube con Supabase (fase 2)

La app funciona 100 % en el navegador (localStorage). Esta guía activa la **copia en la nube**:
una instantánea JSON completa de tu gestor (clientes, recibos, transferencias, finanzas,
histórico y archivado) que puedes subir y bajar desde cualquier dispositivo.

> Modelo: **un snapshot por usuario**. No hay edición simultánea celda a celda;
> al traer la copia eliges **Combinar sin duplicados** o **Reemplazar todo**
> (el mismo flujo que ya conoces al importar un JSON).

## 1 · Crear el proyecto (gratis, ~3 minutos)

1. Entra en [supabase.com](https://supabase.com) → **Start your project** → crea una cuenta (la más simple: GitHub).
2. **New project** → nombre (p. ej. `gestor`), contraseña de base de datos (guárdala), región (la más cercana: `South America (São Paulo)`) → **Create new project**.
3. Espera 1–2 minutos a que se aprovisione.

## 2 · Crear la tabla y las reglas (RLS)

1. Menú lateral → **SQL Editor** → **New query**.
2. Pega todo el contenido de [`../supabase/schema.sql`](../supabase/schema.sql) → **Run**.
3. Debe decir `Success`. Esto crea `public.gestor_snapshots` con Row Level Security:
   cada cuenta solo puede leer/escribir su propia fila.

## 3 · Activar el login por correo

1. Menú lateral → **Authentication → Providers**.
2. **Email**: activado por defecto.
   - Para probar rápido: desactiva **Confirm email** (entra al instante), o
   - déjala activada y confirma la cuenta desde el correo que recibirás al registrarte.
3. (Opcional) **Authentication → URL Configuration**: añade la URL pública de la app en *Site URL*.

## 4 · Obtener las claves públicas

1. **Project Settings → API**.
2. Copia:
   - **Project URL** (`https://xxxxxxxx.supabase.co`)
   - **anon public key** (empieza por `eyJ…`)

> La `anon key` **sí puede** ir dentro del HTML del sitio público: está diseñada para ser
> pública. Lo que protege tus datos es RLS (paso 2) + tu sesión.
> ⚠️ Nunca uses ni pegues aquí la `service_role key`: esa sí es secreta.

## 5 · Crear tu cuenta y entrar

1. Abre la app (local o el sitio de GitHub Pages).
2. Menú lateral → **👤 Mi cuenta y nube**.
3. Pestaña **Crear cuenta** (primera vez):
   - Despliega **Configuración avanzada** y pega la **Project URL** y la **anon public key** (una sola vez por dispositivo/navegador).
   - Nombre (opcional), correo y contraseña (mín. 8 caracteres) → **Crear cuenta y enviar verificación**.
   - Abre el correo que te llega y confirma la cuenta (enlace de verificación). Si no lo ves, **Reenviar confirmación** (revisa el spam).
4. Vuelve a la app → pestaña **Iniciar sesión** → correo + contraseña → **Entrar**.
5. Verás tu avatar y tu nombre. Aparecen **⬆ Subir copia a la nube**, **⬇ Traer copia de la nube** y la casilla para subir automáticamente tras cada cambio.
6. En tu otro dispositivo/navegador: misma app → pestaña **Iniciar sesión** (la configuración avanzada también solo la primera vez) → **Entrar** → **⬇ Traer copia de la nube** → elige *Combinar* o *Reemplazar*.

**¿Olvidaste la contraseña?** → **Olvidé mi contraseña**: recibes un enlace de recuperación.
**Sesión caducada:** la app renueva el token automáticamente cuando puede; si no, basta con **Entrar** de nuevo.

> **Registro abierto, datos aislados:** cualquier persona puede crear cuenta, pero cada cuenta
> solo ve sus propias filas en la nube (RLS con `auth.uid()`) y sus datos locales viven en un
> espacio por cuenta dentro del navegador. La base adjunta cifrada sigue protegida por su
> propia contraseña, aparte del login.

## 6 · Qué esperar / límites honestos

- **Sin** service role, claves ni correos en el repositorio: todo viaja por HTTPS.
- El token de sesión caduca a las ~1 h; la app avisa y basta con pulsar **Conectar** de nuevo.
- Conflictos entre dispositivos: gana quien **Suba** después; la sincronización es por instantánea, no por operación.
- Si quieres edición colaborativa en tiempo real: fase 3 (tabla por entidad + `updated_at`/`op` y resolución por marca de tiempo). Pide el diseño cuando la necesites.

## Problema común y solución

| Síntoma | Causa | Solución |
|---|---|---|
| `Supabase: Invalid login credentials` | cuenta no confirmada o contraseña mal | confirma el correo o repite **Crear cuenta** |
| `Sesión caducada` | token de ~1 h vencido | pulsa **Conectar** de nuevo |
| `No se pudo subir (401)` | RLS o clave equivocada | revisa que pegaste la **anon** key, no otra |
| `No se pudo subir (404)` | falta la tabla | ejecuta `supabase/schema.sql` en el SQL Editor |
