import type { DB } from './types'
import { aISODate } from './fechas'

/** Datos de ejemplo. Las fechas son relativas al día de carga para que siempre haya actividades próximas. */
export function crearSemilla(hoy: Date): DB {
  const enDias = (n: number) => aISODate(new Date(hoy.getTime() + n * 86400_000))
  const creada = hoy.toISOString()

  return {
    version: 1,
    actividades: [
      {
        id: 'act-10k-yanahuara',
        titulo: 'Quedada 10K Yanahuara',
        fecha: enDias(9),
        hora: '06:30',
        lugar: 'Mirador de Yanahuara',
        descripcion:
          'Salimos del mirador, bajamos por Cayma y volvemos por el malecón del Chili. Ritmo conversacional, nadie se queda atrás: habrá grupos de 5:30, 6:00 y 6:30 min/km. Trae agua y gorra, el sol de Arequipa no perdona.',
        plazas: 20,
      },
      {
        id: 'act-taller-tecnica',
        titulo: 'Taller de técnica de carrera',
        fecha: enDias(15),
        hora: '09:00',
        lugar: 'Estadio de la UNSA',
        descripcion:
          'Dos horas en pista para trabajar postura, cadencia y apoyo. Grabamos un video corto de cada participante y lo comentamos en grupo. Grupo reducido para poder corregir a cada uno.',
        plazas: 12,
      },
    ],
    inscripciones: [
      {
        id: 'ins-1',
        actividadId: 'act-10k-yanahuara',
        nombre: 'Lucía Paredes Zevallos',
        correo: 'lucia.paredes@example.com',
        telefono: '959 123 456',
        estado: 'confirmada',
        codigoQR: 'CRA-LUCIA10K',
        qrUsado: false,
        asistio: false,
        posicionEspera: 0,
        fechaLimiteConfirmacion: null,
        creadaEn: creada,
      },
      {
        id: 'ins-2',
        actividadId: 'act-10k-yanahuara',
        nombre: 'Diego Chávez Núñez',
        correo: 'diego.chavez@example.com',
        telefono: '974 555 210',
        estado: 'confirmada',
        codigoQR: 'CRA-DIEGO10K',
        qrUsado: false,
        asistio: false,
        posicionEspera: 0,
        fechaLimiteConfirmacion: null,
        creadaEn: creada,
      },
      {
        id: 'ins-3',
        actividadId: 'act-taller-tecnica',
        nombre: 'Rosa Quispe Mamani',
        correo: 'rosa.quispe@example.com',
        telefono: '951 880 734',
        estado: 'confirmada',
        codigoQR: 'CRA-ROSATECN',
        qrUsado: false,
        asistio: false,
        posicionEspera: 0,
        fechaLimiteConfirmacion: null,
        creadaEn: creada,
      },
    ],
    correos: [],
  }
}
