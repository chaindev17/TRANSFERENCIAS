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

## 3 · Activar el login por correo (opcional)

Solo si quieres sincronizar entre dispositivos. Los perfiles locales no necesitan nada de esto.

1. Menú lateral → **Authentication → Providers**.
2. **Email**: activado por defecto. Para que el alta entre **directo sin verificación**:
   desactiva **Confirm email** → **Save**.
3. (Opcional) Si prefieres confirmación por correo, déjala activada y confirma la cuenta desde el email recibido.
4. (Opcional) **Authentication → URL Configuration**: añade la URL pública de la app en *Site URL*.

## 4 · Obtener las claves públicas

1. **Project Settings → API**.
2. Copia:
   - **Project URL** (`https://xxxxxxxx.supabase.co`)
   - **anon public key** (empieza por `eyJ…`)

> La `anon key` **sí puede** ir dentro del HTML del sitio público: está diseñada para ser
> pública. Lo que protege tus datos es RLS (paso 2) + tu sesión.
> ⚠️ Nunca uses ni pegues aquí la `service_role key`: esa sí es secreta.

## 5 · Crear tu cuenta (sin verificación de correo)

**Lo habitual: perfiles locales** (no requiere Supabase ni correo):

1. Abre la app → menú lateral → **👤 Mi cuenta** → **＋ Crear una cuenta nueva**.
2. Ponle nombre y un PIN de 4–8 dígitos → **Crear cuenta y entrar**. Entras directo.
3. Cada persona del navegador crea su propia cuenta: la app **bloquea al inicio** y pide
   el PIN de cada quien. Cada cuenta ve únicamente su información.
4. Cambiar de cuenta: **👤 Mi cuenta** → **🔒 Bloquear** → elige otra cuenta.
   Borrar una cuenta: la papelera junto a su nombre (borra también sus datos del dispositivo).
5. La primera vez en un navegador con datos previos, el aviso ofrece
   **«Adoptar datos de este dispositivo»** (copia explícita; el original se conserva).

**Opcional · sincronizar entre dispositivos (Supabase):**

1. Crea el proyecto y corre `supabase/schema.sql` (pasos 1–4 de esta guía).
2. En **Authentication → Sign In / Providers → Email**: desactiva **Confirm email**
   para que el alta entre directo (recomendado). Si lo dejas activo, confirma el correo
   una sola vez tras crear la cuenta.
3. Abre la app → **👤 Mi cuenta** → **☁️ Nube opcional**: pega URL + anon key,
   **Crear cuenta y entrar** (o **Iniciar sesión**) y verás tu avatar; ahí puedes
   **⬆ Subir copia** / **⬇ Traer copia** o activar la subida automática.
4. **¿Olvidaste la contraseña?** → **Olvidé mi contraseña** (requiere que el correo
   salga del SMTP de Supabase; si no llega, restablece desde el dashboard).
5. En tu otro dispositivo: la misma app → misma nube → **⬇ Traer copia de la nube** →
   *Combinar* o *Reemplazar*.

> **Registro abierto, datos aislados:** con la nube, cada cuenta solo ve sus propias filas
> (RLS con `auth.uid()`). Con perfiles locales, la separación es por espacio de almacenamiento
> en el navegador + PIN.

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
