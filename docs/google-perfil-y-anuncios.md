# Mr. White Burgers — Perfil de Google, búsquedas y anuncios

Guía para sacarle el jugo a Google. Lo que hace falta hacer **desde la cuenta de Google del negocio** (yo no puedo entrar a esas cuentas) está acá, con textos listos para copiar y pegar.

> Lo que ya quedó hecho en la web (datos para Google, `llms.txt`, preguntas frecuentes, velocidad) está resumido al final.

---

## 1. Perfil de Google (Google Business Profile): lo más importante

Es lo que aparece en Google Maps y en el recuadro lateral cuando buscan "hamburguesas La Plata" desde el celular. Para un local con delivery, **pesa más que la web**.

**Primero:** buscá "Mr. White Burgers" en Google Maps.
- Si ya existe una ficha → tocá **"Reclamar este negocio"** y verificá (llamada, SMS o video).
- Si no existe → creala en <https://business.google.com> con el mismo mail con que se maneja Analytics.

### Datos para cargar (todos tienen que ser idénticos en todos lados)

| Campo | Qué poner |
|---|---|
| Nombre | `Mr. White Burgers` (solo el nombre real; agregar "La Plata" o palabras clave al nombre rompe las reglas de Google y puede suspender la ficha) |
| Categoría principal | **Restaurante de hamburguesas** |
| Categorías adicionales | Restaurante de comida rápida · Comida para llevar · Servicio de entrega de comidas (los nombres pueden variar un poco en tu pantalla) |
| Dirección | Calle 27 esq. 80, Altos de San Lorenzo, La Plata. **Mové el pin al lugar exacto** del local |
| Teléfono | +54 9 221 303-4143 |
| Horarios | Miércoles a lunes 19:30 a 22:30 · Martes cerrado |
| Sitio web | `https://mrwhiteburgers.pages.dev/?utm_source=perfil-google&utm_medium=organic&utm_campaign=ficha` (cuando esté el dominio propio, cambiar la parte inicial) |
| Link de pedidos | `https://mrwhiteburgers.pages.dev/?utm_source=perfil-google&utm_medium=organic&utm_campaign=boton-pedir#menu` |
| Atributos | Marcá solo lo que es cierto: envío a domicilio, para llevar, retiro en el local |

Con ese `utm_source=perfil-google`, en el panel (Números → "De dónde llegan") vas a ver **cuántos pedidos vienen del perfil de Google**, separados del resto.

### Descripción (máx. 750 caracteres) — copiar y pegar
> Mr. White Burgers es una hamburguesería de smash burgers premium en La Plata. Hacemos nuestras hamburguesas en pan de papa, con la carne aplastada en plancha bien caliente, cheddar, bacon y nuestras salsas, y todas vienen con papas fritas. Elegí simple, doble o triple. Armá tu pedido en nuestra web y mandalo por WhatsApp: hacemos envíos a domicilio en La Plata o retirás en Calle 27 esq. 80 (Altos de San Lorenzo). Abrimos de miércoles a lunes de 19:30 a 22:30.

### Fotos (suben mucho las visitas y los pedidos)
- Mínimo 10 al principio, y **1 o 2 nuevas por semana**.
- Subir: fachada del local (de día y de noche), interior o ventana de entrega, el equipo cocinando, las 6 burgers (ya hay fotos buenas en `public/img/`), el logo y una portada.
- Videos cortos de la plancha (smash) funcionan muy bien.

### Productos / menú
Cargá las 6 burgers como "Productos", con foto, descripción y precio. Los textos y precios están listos en `https://mrwhiteburgers.pages.dev/llms.txt`. Si cambian precios desde el panel, actualizarlos también acá.

### Publicaciones (1 o 2 por semana, duran 7 días)
Ejemplos para copiar:
1. `Smash burgers recién hechas 🍔 Pedí desde la web y mandalo por WhatsApp. Envíos en La Plata y retiro en 27 esq. 80. Abrimos hoy hasta las 22:30.` (botón: **Pedir**)
2. Promo del día: copiar el texto de la promo que esté activa en el panel (pestaña Promos). Botón: **Pedir**.
3. Producto: una burger por post (foto + descripción + "Simple / Doble / Triple").

### Preguntas y respuestas
Cargá vos mismo las preguntas más comunes con su respuesta (ya están redactadas en la sección "Preguntas frecuentes" de la web).

### Reseñas (lo que más mueve el ranking local)
- En el perfil: **"Pedir reseñas"** → copiás el link corto. Mandalo por WhatsApp a los clientes **después de entregar el pedido** ("¿Nos dejás tu opinión? Nos ayuda un montón: [link]").
- Podés imprimir un **QR** de ese link en la bolsa o el packaging.
- **Respondé todas** en 24–48 h. Modelos:
  - Positiva: `¡Gracias {nombre}! Nos alegra que hayas disfrutado la {burger}. ¡Te esperamos de nuevo!`
  - Negativa: `Gracias por contarnos, {nombre}, y perdón por la mala experiencia. Escribinos por WhatsApp al +54 9 221 303-4143 y lo resolvemos.`
- No ofrecer descuentos a cambio de reseñas ni elegir a quién pedírselas (Google lo prohíbe). No comprar reseñas.

### Mantenimiento
- **Feriados / días que cierran**: cargar "horarios especiales" en el perfil. Cuando usen "Hoy cerramos" en el panel, acordate de reflejarlo también en el perfil.
- Revisá una vez por semana: **Rendimiento** (llamadas, cómo llegar, visitas al sitio).

### Dónde más tiene que coincidir el nombre, la dirección y el teléfono
Instagram (bio: dirección + link con `?utm_source=instagram&utm_medium=bio`), Facebook, PedidosYa/Rappi si están, y cualquier directorio. **Idéntico en todos.**

---

## 2. Search Console (cómo ve Google la web)

Esperá a tener el **dominio definitivo** (así no se parten las señales entre dos direcciones). Cuando esté:
1. <https://search.google.com/search-console> → agregar propiedad "Dominio" (se verifica con un registro DNS en Cloudflare).
2. Enviar el sitemap: `https://TU-DOMINIO/sitemap.xml`.
3. En **Inspección de URL**, pegar la home y tocar **"Solicitar indexación"**.
4. Vincularlo con Analytics: Admin → Vinculaciones de Search Console.
5. Revisar cada tanto **Rendimiento**: con qué búsquedas aparecen y cuántos clics.

Cuando llegue el dominio, avisame: cambio **una línea** (`url` en `src/lib/negocio.js`) y se actualizan solos canonical, sitemap, robots y datos de Google; además dejo una redirección permanente desde la dirección `pages.dev`.

---

## 3. Analytics (GA4): preparar la medición para anunciar

1. Admin → **Eventos** → buscar `purchase` → activar **"Marcar como evento clave"**. (Es el pedido enviado por WhatsApp.)
2. Revisar **Informes → Monetización → Compras de comercio electrónico** (ahí ves productos y recaudación).
3. Revisar **Explorar → Exploración de embudo** con los pasos: `view_item_list` → `add_to_cart` → `view_cart` → `begin_checkout` → `add_shipping_info` → `purchase`.
4. **Clarity**: filtrar grabaciones por el evento `pedido_whatsapp` para ver cómo piden los que compran y dónde se traba el resto.

### Etiquetas de campaña (UTM) — usar siempre las mismas
| Dónde | Parámetros |
|---|---|
| Bio de Instagram | `?utm_source=instagram&utm_medium=bio` |
| Historias de Instagram | `?utm_source=instagram&utm_medium=story` |
| Anuncio de Meta | `?utm_source=meta&utm_medium=cpc&utm_campaign=NOMBRE` |
| Anuncio de Google | `?utm_source=google&utm_medium=cpc&utm_campaign=NOMBRE` |
| Perfil de Google | `?utm_source=perfil-google&utm_medium=organic&utm_campaign=ficha` |

El panel muestra de dónde llegó cada pedido usando `utm_source`.

### Cuando arranquen los anuncios (resumen)
- Con pocos pedidos por mes conviene **empezar simple**: Meta (Instagram) o Google Búsqueda con radio de 5–7 km alrededor del local y **horario de anuncios solo de 19:00 a 22:30**.
- Necesito que me pases los IDs para dejar listo el seguimiento: **Pixel de Meta** y/o **ID de conversión de Google Ads**. Yo los conecto.

---

## 4. Qué buscan y cómo estamos preparados

Búsquedas objetivo (una sola página por ahora): *hamburguesas La Plata*, *smash burger La Plata*, *delivery hamburguesas La Plata*, *hamburguesas Altos de San Lorenzo*.

Sinceridad: con una sola página es difícil ganarle a marcas grandes en búsquedas generales. Lo más rentable es **el perfil de Google + reseñas + Instagram**, y la web los respalda. Para crecer en búsquedas orgánicas, el siguiente paso es sumar páginas con contenido real (por ejemplo **"Delivery de hamburguesas en La Plata: zonas, precios y tiempos"**), pero necesito que Joaco **confirme los precios de las zonas de envío** antes de publicarlos.

### Para que las IA (ChatGPT, Gemini, Perplexity) te mencionen
Los asistentes recomiendan lo que ven repetido y consistente en varios lugares. Además de la web:
- Reseñas de Google que mencionen lo que vendés de forma natural (no guionadas).
- Menciones en Instagram, grupos de Facebook de La Plata, blogs/guías gastronómicas locales.
- Cuando tengan dominio propio con Cloudflare, revisar que **"Block AI bots / AI Crawl Control" esté desactivado** (si no, las IA no pueden leer la web).

---

## 5. Lo que ya está hecho en la web

- Título, descripción y dirección canónica correctos (antes apuntaban a una dirección vieja de Vercel).
- Datos para Google (`JSON-LD`): negocio, dirección, coordenadas, horarios, carta con precios y preguntas frecuentes. Se generan solos desde la carta y los horarios reales.
- `robots.txt`, `sitemap.xml` y `llms.txt` (resumen para IA) generados en cada publicación.
- Resumen del negocio en texto plano para robots que no ejecutan JavaScript.
- Preguntas frecuentes visibles y botón "Cómo llegar en Google Maps".
- Fotos en WebP aparte y con caché: la página pasó de **3,5 MB a 0,7 MB** (más rápida en el celular = mejor posición y menos rebote).
- Se quitó Vercel Analytics (ya no existe en Cloudflare y generaba errores).
- Pendiente de datos reales: cuando el perfil de Google esté verificado, pegar su link en `perfilGoogle` (`src/lib/negocio.js`) para que "Cómo llegar" abra la ficha. **No se inventaron reseñas ni puntuaciones.**
