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
| `/puerta` | Control de asistencia: escáner QR, código manual y búsqueda por nombre |
| `/organizador` | Panel: crear, duplicar, ver inscritos y exportar CSV |
| `/organizador/actividad/:id` | Detalle con pestañas Inscritos / Lista de espera / Asistencia |
| `/correos` | Bandeja de correos simulada (demo, ver más abajo) |

## Reglas de negocio (`src/lib/store.ts`)

- **Plazas atómicas**: cada operación es una transacción que relee el estado, comprueba y escribe dentro de un Web Lock (`navigator.locks`) exclusivo, así que dos inscripciones simultáneas a la última plaza (aunque sea desde otra pestaña) no pueden entrar las dos: la segunda queda en lista de espera.
- **Lista de espera**: al cancelar una plaza confirmada se ofrece al primero de la lista con `fechaLimiteConfirmacion` = ahora + 24 h. La plaza queda reservada mientras dure la oferta. Si vence, se anula y se ofrece al siguiente (se comprueba al abrir la app y cada minuto).
- **QR de un solo uso**: validar marca `qrUsado` y `asistio`; una segunda lectura muestra "QR ya usado". El marcado manual también inutiliza el QR.
- **Duplicar** copia título, lugar, descripción y plazas; no copia fecha (ni hora) ni inscritos.
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
