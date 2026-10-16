# Migración a Cloudflare Pages

Escrito el 2026-10-16. El sitio pasa de GitHub Pages a Cloudflare Pages (plan gratuito: peticiones y tráfico ilimitados, 20.000 ficheros por despliegue, 25 MiB por fichero; hoy el sitio genera unos 6.100 ficheros, el mayor de 1 MB).

## Qué cambia en el repo

- `public/_headers`: cabeceras de seguridad y un año de caché para `/_astro/*` (ficheros con hash). El HTML se queda con lo que pone Pages por defecto: el borde lo sirve de caché hasta el siguiente despliegue y los navegadores revalidan con ETag. No hacen falta reglas de caché ni purgas.
- `.github/workflows/deploy.yml`: el job `deploy-cloudflare` publica el mismo `dist/` en Cloudflare Pages (proyecto `workswithwhat`) y prueba el despliegue en su URL `*.pages.dev`: páginas clave, `/.well-known/security.txt`, el 404 y las cabeceras. Sin los secretos del paso 1, se salta sin fallar.
- GitHub Pages sigue desplegando como respaldo hasta que el DNS apunte a Cloudflare y el chequeo del sitio pase.

## Pasos en el panel

### 1. Token y secretos (antes de fusionar el PR)

1. Cloudflare → icono de perfil → **My Profile** → **API Tokens** → **Create Token** → **Create Custom Token**.
2. Nombre: `workswithwhat pages`. Permissions: **Account** · **Cloudflare Pages** · **Edit**. Account Resources: **Include** · tu cuenta. Nada más.
3. **Continue to summary** → **Create Token**. Copia el token (solo se muestra una vez).
4. Copia el **Account ID**: en Cloudflare abre `workswithwhat.com` → **Overview**; está en la columna derecha, bloque «API».
5. GitHub → repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**, dos veces:
   - `CLOUDFLARE_API_TOKEN` = el token
   - `CLOUDFLARE_ACCOUNT_ID` = el Account ID

Tras fusionar, el workflow crea el proyecto y lo publica. Cuando el job `deploy-cloudflare` sale en verde, el sitio ya funciona en `workswithwhat.pages.dev`, aunque el dominio siga en GitHub.

### 2. Apuntar el dominio a Cloudflare Pages

1. Cloudflare → **Workers & Pages** → proyecto `workswithwhat` → **Custom domains** → **Set up a custom domain**.
2. Escribe `workswithwhat.com` → **Continue** → **Activate domain**. Cloudflare cambia el registro DNS solo.
3. Si dice que ya existe un registro: **DNS** → **Records**, borra los registros **A** de `workswithwhat.com` que apuntan a GitHub (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`) y los **AAAA** (`2606:50c0:…`), y vuelve al punto 2. Entre borrar y activar, el sitio puede no responder un minuto.
4. No toques los registros **MX** ni **TXT**: son del correo (Email Routing, SPF, DMARC).

### 3. Redirigir www

GitHub Pages hacía la redirección de `www` al dominio sin `www`; Cloudflare Pages no.

1. `workswithwhat.com` → **Rules** → **Redirect Rules** → **Create rule** → plantilla **Redirect from WWW to root**.
2. Comprueba que el código es **301** y que «Preserve query string» está marcado → **Deploy**.
3. El registro DNS `www` debe seguir **proxied** (nube naranja).

### 4. Comprobar

Lanza **Actions → Live site check → Run workflow** en GitHub (o pídeselo a Claude). Debe pasar entero: DNS, redirecciones, cabeceras, páginas y crawlers.

### Volver atrás

Si algo falla: **Custom domains** → quita `workswithwhat.com` del proyecto y vuelve a crear los cuatro registros A de GitHub (`185.199.108.153` a `185.199.111.153`, proxied). GitHub Pages sigue desplegando, así que vuelve a servir al momento.

## Después de la migración (otro PR)

- La política de privacidad (5 idiomas) nombra a GitHub Pages como quien aloja los ficheros: pasará a decir Cloudflare Pages.
- Se quita el despliegue a GitHub Pages del workflow y se desactiva Pages en el repo.
- La Transform Rule de cabeceras de Cloudflare sobra (las pone `_headers`); se puede borrar o dejar.

## Bots

El sitio quiere buscadores y asistentes de IA, así que **Bot Fight Mode** y **Block AI bots** siguen apagados. Para ver personas reales: **Search Console → Rendimiento**. Los «Unique Visitors» del resumen de Cloudflare cuentan IPs, bots incluidos.
