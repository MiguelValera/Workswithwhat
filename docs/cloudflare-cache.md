# Caché y bots en Cloudflare

Pasos del panel de Cloudflare que no viven en el repo. Escrito el 2026-10-14, cuando el panel marcaba un 0,46 % de peticiones servidas desde caché.

## Por qué casi nada sale de la caché

- GitHub Pages manda `Cache-Control: max-age=600` en todo y no deja cambiar cabeceras (no hay `_headers`).
- Cloudflare, por defecto, solo guarda en caché ciertas extensiones (CSS, JS, imágenes, fuentes). **No guarda HTML, JSON ni `.txt`**, que es justo lo que piden los crawlers: páginas, `/api/*.json` y `llms*.txt`.
- El resultado: casi cada petición llega a GitHub Pages. No rompe nada, pero el sitio responde más lento y cualquier pico de bots lo absorbe el origen.

Como el sitio es estático y solo cambia en cada despliegue, se puede cachear entero y vaciar la caché al desplegar. El workflow `deploy.yml` ya hace la purga (job `purge-cache`) en cuanto existan los dos secretos del paso 1.

## 1. Token para vaciar la caché al desplegar

Hazlo antes de las reglas del paso 2, o una página nueva podría tardar hasta un día en verse.

1. Cloudflare → icono de perfil → **My Profile** → **API Tokens** → **Create Token** → **Create Custom Token**.
2. Nombre: `workswithwhat purge`. Permisos: **Zone** · **Cache Purge** · **Purge**. Zone Resources: **Include** · **Specific zone** · `workswithwhat.com`. Nada más.
3. Crea el token y cópialo (solo se muestra una vez).
4. En Cloudflare, abre `workswithwhat.com` → **Overview**; en la columna derecha, copia el **Zone ID**.
5. GitHub → repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
   - `CLOUDFLARE_API_TOKEN` = el token
   - `CLOUDFLARE_ZONE_ID` = el Zone ID

Sin estos secretos el job no falla: deja un aviso y no purga.

## 2. Reglas de caché

`workswithwhat.com` → **Caching** → **Cache Rules** → **Create rule**. El orden importa: la última regla gana cuando dos chocan.

**Regla 1: «Cachear todo el sitio»**
- If incoming requests match: **Custom filter expression** → Hostname · equals · `workswithwhat.com`
- Cache eligibility: **Eligible for cache**
- Edge TTL: **Ignore cache-control header and use this TTL** → **1 day**
  (si no has hecho el paso 1, pon **2 hours** para que los cambios no tarden tanto)
- Browser TTL: **Respect origin TTL** (los navegadores siguen con los 10 minutos de GitHub)

**Regla 2: «Assets con hash, un año»**
- If: URI Path · starts with · `/_astro/`
- Cache eligibility: **Eligible for cache**
- Edge TTL: **Ignore cache-control header and use this TTL** → **1 year**
- Browser TTL: **Override origin and use this TTL** → **1 year**

Los ficheros de `/_astro/` llevan un hash en el nombre; un despliegue nuevo crea nombres nuevos, así que nunca se sirve CSS viejo.

**Comprobar:** tras guardar, lanza el workflow **Site check** en GitHub (Actions → Site check → Run workflow). La sección «Caching» debe mostrar `cf-cache-status: HIT` en `/`, `/smart-plugs/`, la API y el CSS. En el panel, **Percent Cached** debería subir en uno o dos días.

## 3. Bots

El sitio **quiere** buscadores y asistentes de IA (robots.txt los invita), así que:

- **Bot Fight Mode: apagado.** Ya respondió 403 a páginas pedidas desde centros de datos.
- **Block AI bots / AI Scrapers and Crawlers: apagado.**

Para ver qué tráfico es de personas:

- **Search Console → Rendimiento**: clics reales desde Google.
- Cloudflare → **Security → Analytics** (o **Analytics & Logs → Traffic**): filtra por *Bot score* / *Verified bot*. Los «Unique Visitors» del resumen cuentan IPs, bots incluidos.

Opcional, solo si en Security → Analytics ves muchas peticiones a rutas de WordPress o ficheros secretos (escáneres): **Security → WAF → Custom rules → Create rule**, nombre «Escáneres», acción **Block**, expresión:

```
(http.request.uri.path contains ".php") or (starts_with(http.request.uri.path, "/wp-")) or (starts_with(http.request.uri.path, "/.env")) or (starts_with(http.request.uri.path, "/.git"))
```

No toca `/.well-known/` (que el sitio usa) ni ninguna página real. Esas peticiones ya dan 404, así que la regla solo ahorra ruido en las estadísticas.
