# Club de Running Arequipa · Inscripciones

App de inscripción a eventos y talleres con control de plazas, lista de espera y control de asistencia por QR, pensada para un club de running de 200 socios en Arequipa.

React 19 + Vite + TypeScript, persistencia en `localStorage`, despliegue en Netlify.

## Pantallas

| Ruta | Pantalla |
| --- | --- |
| `/` | Home pública: próximas actividades con "Plazas libres: X/Y" |
| `/actividad/:id` | Ficha + formulario de 3 campos ("Inscribirme" o "Unirme a la lista de espera") |
| `/inscripcion/:codigo` | Confirmación con código QR y aviso de correo enviado |
| `/cancelar/:codigo` | Cancelación (enlace del correo) con paso de confirmación |
| `/plaza/:codigo` | Confirmar una plaza liberada desde la lista de espera (24 h) |
| `/puerta` | Control de asistencia (protegido con clave): escáner QR, código manual y búsqueda por nombre |
| `/organizador` | Panel (protegido con clave): crear, duplicar, ver inscritos y exportar CSV |
| `/organizador/actividad/:id` | Detalle con pestañas Inscritos / Lista de espera / Asistencia |
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

## Reglas de negocio (`src/lib/store.ts`)

- **Plazas atómicas**: cada operación es una transacción que relee el estado, comprueba y escribe dentro de un Web Lock (`navigator.locks`) exclusivo, así que dos inscripciones simultáneas a la última plaza (aunque sea desde otra pestaña) no pueden entrar las dos: la segunda queda en lista de espera.
- **Lista de espera**: al cancelar una plaza confirmada se ofrece al primero de la lista con `fechaLimiteConfirmacion` = ahora + 24 h. La plaza queda reservada mientras dure la oferta. Si vence, se anula y se ofrece al siguiente (se comprueba al abrir la app y cada minuto).
- **QR de un solo uso**: validar marca `qrUsado` y `asistio`; una segunda lectura muestra "QR ya usado". El marcado manual también inutiliza el QR.
- **Duplicar** copia título, hora, lugar, descripción y plazas; no copia la fecha ni los inscritos.
- **CSV** con inscritos, lista de espera (con posición) y asistencia, con BOM para Excel.

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
