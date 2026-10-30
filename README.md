# Club de Running Arequipa · Inscripciones

App de inscripción a eventos y talleres con control de plazas, lista de espera y control de asistencia por QR, pensada para un club de running de 200 socios en Arequipa.

React 19 + Vite + TypeScript, persistencia en `localStorage`, despliegue en Netlify.

## Pantallas

| Ruta | Pantalla |
| --- | --- |
| `/` | Home pública: próximas actividades con "Plazas libres: X/Y" |
| `/actividad/:id` | Ficha con precio informativo + formulario de 3 campos y casilla de consentimiento de datos ("Inscribirme" o "Unirme a la lista de espera") |
| `/inscripcion/:codigo` | Confirmación con código QR y aviso de correo enviado |
| `/cancelar/:codigo` | Cancelación (enlace del correo) con paso de confirmación |
| `/plaza/:codigo` | Confirmar una plaza liberada desde la lista de espera (24 h) |
| `/encuesta/:codigo` | Encuesta corta tras la actividad (enlace del correo, solo para quienes asistieron) |
| `/puerta` | Control de asistencia (protegido con clave): escáner QR, código manual y búsqueda por nombre |
| `/organizador` | Panel (protegido con clave): crear, duplicar, ver inscritos y exportar CSV |
| `/organizador/actividad/:id` | Detalle con pestañas Inscritos / Lista de espera / Asistencia / Encuesta |
| `/correos` | Bandeja de correos simulada (demo, protegida con la clave de organizador) |

## Acceso a puerta y organizador

El control de puerta, el panel del organizador y la bandeja de correos piden una clave antes de mostrarse. La bandeja va con la clave de organizador porque contiene los datos y los enlaces de cancelación de todos los inscritos.

| Zona | Rutas | Clave por defecto | Variable para cambiarla |
| --- | --- | --- | --- |
| Control de puerta (voluntarios) | `/puerta` | `misti2026` | `VITE_CLAVE_PUERTA` |
| Organizador | `/organizador` y sus subrutas (crear, duplicar, ver inscritos, exportar) y `/correos` | `chachani2026` | `VITE_CLAVE_ORGANIZADOR` |

- La clave de organizador también abre la puerta; la de puerta no abre el panel. Así los voluntarios solo reciben la clave de puerta.
- El acceso dura mientras la pestaña esté abierta (se guarda en `sessionStorage`). El enlace "Bloquear control de puerta" / "Cerrar sesión de organizador", al pie de cada pantalla, cierra ambas zonas antes; útil si el móvil se comparte entre voluntarios.
- **Cambiar las claves** sin tocar código: define las variables de entorno (en local, en `.env.local`; en Netlify, en *Project configuration → Environment variables*) y vuelve a desplegar.

```bash
printf "VITE_CLAVE_PUERTA=otra-clave\nVITE_CLAVE_ORGANIZADOR=clave-organizador\n" > .env.local
```

> Es una barrera sencilla para que un socio no entre por error, no seguridad real: sin backend, las claves viajan dentro del JavaScript publicado y cualquiera con conocimientos técnicos podría encontrarlas. Como este repositorio es público, conviene usar en Netlify claves distintas a las de este README.

## Cómo se accede a la encuesta

La encuesta está en `/encuesta/:codigo`, donde `:codigo` es el código QR de la inscripción (p. ej. `/encuesta/CRA-LUCIA10K`). En la app no hay ningún menú ni botón que lleve a ella; se llega con un enlace personal:

1. **Se marca la asistencia.** El día de la actividad, en `/puerta` (escaneando el QR o buscando por nombre) o en la pestaña *Asistencia* del panel.
2. **El organizador envía la encuesta.** En `/organizador/actividad/<id>`, pestaña **Encuesta**, botón **"Enviar encuesta"**. Se genera un correo, con el enlace **"Responder la encuesta"**, para cada persona con asistencia marcada que aún no lo haya recibido. Pulsar otra vez solo lo envía a quienes se hayan marcado después.
3. **El participante abre su enlace** y responde: valoración de 1 a 5, "¿Volverías?" y un comentario opcional.
4. **Los resultados** aparecen en la misma pestaña *Encuesta* (respondieron, media, % que volvería y comentarios) y en el CSV exportado.

Si el enlace lo abre alguien sin asistencia marcada, ve "La encuesta es para quienes asistieron". Si ya respondió, ve el agradecimiento y no puede responder otra vez.

> **Importante en esta versión:** los correos no se envían de verdad (no hay backend; ver *Limitaciones*). El enlace de cada participante solo se ve en la bandeja simulada `/correos`, que está protegida con la clave de organizador. Hasta que haya envío real de correos, el organizador tiene que copiar el enlace de esa bandeja y hacérselo llegar al participante (WhatsApp, correo propio…). Para probarlo en la demo basta con abrir el enlace desde `/correos`.

## Reglas de negocio (`src/lib/store.ts`)

- **Plazas atómicas**: cada operación es una transacción que relee el estado, comprueba y escribe dentro de un Web Lock (`navigator.locks`) exclusivo, así que dos inscripciones simultáneas a la última plaza (aunque sea desde otra pestaña) no pueden entrar las dos: la segunda queda en lista de espera.
- **Lista de espera**: al cancelar una plaza confirmada se ofrece al primero de la lista con `fechaLimiteConfirmacion` = ahora + 24 h. La plaza queda reservada mientras dure la oferta. Si vence, se anula y se ofrece al siguiente (se comprueba al abrir la app y cada minuto).
- **QR de un solo uso**: validar marca `qrUsado` y `asistio`; una segunda lectura muestra "QR ya usado". El marcado manual también inutiliza el QR.
- **Duplicar** copia título, hora, lugar, descripción y plazas; no copia la fecha ni los inscritos.
- **CSV** con inscritos, lista de espera (con posición), asistencia, fecha del consentimiento y respuestas de la encuesta, con BOM para Excel.
- **Consentimiento de datos**: sin marcar la casilla no se puede inscribir (se valida en el formulario y en `inscribir`). Se guarda la fecha en `consentimientoEn`. Las inscripciones anteriores a la casilla quedan con `null`.
- **Precio informativo**: `precio` en soles en cada actividad (0 = "Gratis"). Solo se muestra; la app no cobra. Duplicar también lo copia. Las actividades guardadas antes de este campo se leen como gratis.
- **Encuesta tras la actividad**: desde la pestaña Encuesta, el organizador envía el enlace por correo a quienes tienen la asistencia marcada (una vez por persona). La encuesta tiene una valoración de 1 a 5, "¿Volverías?" y un comentario opcional. Se responde una sola vez, y el panel muestra respuestas, media y % que volvería.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # pruebas de los criterios de aceptación
npm run build
```

Para restablecer los datos de ejemplo: Panel → "Restablecer datos de ejemplo". En la pestaña Lista de espera, "Simular 24 h" vence una oferta al instante para probar el paso al siguiente.

## Limitaciones de esta versión

Al ser solo `localStorage`, los datos viven en cada navegador: la atomicidad está garantizada entre pestañas del mismo dispositivo, no entre teléfonos distintos, y los correos no salen de verdad (se ven en `/correos`). Para producción con varios dispositivos haría falta un backend compartido (p. ej. Netlify Functions + base de datos con una transacción o `UPDATE ... WHERE plazas_ocupadas < plazas`) y un proveedor de correo; la lógica de `store.ts` está aislada para poder moverla.
