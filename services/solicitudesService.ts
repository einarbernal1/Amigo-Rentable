import { 
  collection, 
  addDoc, 
  Timestamp, 
  doc, 
  getDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { enviarNotificacionPush } from './notificationService';

// Interfaz actualizada: amigo_id en lugar de alqui_amigo_id
export interface NuevaSolicitud {
  cliente_id: string;
  amigo_id: string;
  nombre_solicitante: string;
  fotografia_solicitante: string;
  informacion_general_solicitante: string;
  fecha_salida: string;   // formato "YYYY-MM-DD"
  hora_salida: string;    // formato "HH:MM" en 24h
  duracion: number;       // en horas (ej: 2 = 2 horas)
  lugar_asistir: string;
  detalles_de_la_salida: string;
  estado_solicitud: 'pendiente' | 'aceptada' | 'rechazada';
  fecha_creacion: Timestamp;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE TIEMPO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convierte "HH:MM" en minutos desde medianoche.
 * Ejemplo: "13:30" → 810
 */
const horaAMinutos = (hora: string): number => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Convierte hora en formato "HH:MM AM/PM" o "H:MM am/pm"
 * al formato de 24h "HH:MM" para normalizar antes de comparar.
 * Si ya viene en 24h sin AM/PM, la devuelve tal cual.
 */
const normalizar24h = (hora: string): string => {
  const match = hora.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!match) return hora.trim(); // ya está en 24h

  let h = parseInt(match[1], 10);
  const m = match[2];
  const periodo = match[3].toLowerCase();

  if (periodo === 'am' && h === 12) h = 0;
  if (periodo === 'pm' && h !== 12) h += 12;

  return `${String(h).padStart(2, '0')}:${m}`;
};

/**
 * Mapea el día de la semana (Date.getDay()) al key usado en horarios_trabajo.
 * getDay(): 0=domingo, 1=lunes … 6=sábado
 */
const DIA_MAP: Record<number, string> = {
  0: 'domingo',
  1: 'lunes',
  2: 'martes',
  3: 'miercoles',
  4: 'jueves',
  5: 'viernes',
  6: 'sabado',
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. VERIFICAR DISPONIBILIDAD HORARIA DEL ALQUI-AMIGO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica que la solicitud caiga dentro de los días y horario configurados
 * por el alqui-amigo en su perfil (horarios_trabajo en colección 'amigos').
 *
 * @param amigoId  UID del alqui-amigo
 * @param fecha    Fecha de la solicitud en formato "YYYY-MM-DD"
 * @param horaSalida  Hora de inicio en formato "HH:MM" (24h)
 * @param duracion Duración en horas
 * @returns { disponible: boolean, motivo?: string }
 */
export const verificarDisponibilidadHorario = async (
  amigoId: string,
  fecha: string,
  horaSalida: string,
  duracion: number
): Promise<{ disponible: boolean; motivo?: string }> => {
  try {
    const amigoRef = doc(db, 'amigos', amigoId);
    const amigoSnap = await getDoc(amigoRef);

    if (!amigoSnap.exists()) {
      return { disponible: false, motivo: 'No se encontró el perfil del Alqui-Amigo.' };
    }

    // Horario guardado con la interfaz Horario del authService:
    // { inicio: "9:00", fin: "5:00", inicioPeriodo: "am", finPeriodo: "pm" }
    // El AM/PM está en campos SEPARADOS — hay que unirlos antes de normalizar.
    const horariosTrabajo: Record<string, {
      inicio: string;
      fin: string;
      inicioPeriodo?: string;
      finPeriodo?: string;
    }> = amigoSnap.data().horarios_trabajo || {};

    // Parsear "YYYY-MM-DD" con valores locales para evitar desfase UTC en Bolivia.
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const fechaDate = new Date(anio, mes - 1, dia);
    const diaSemana = DIA_MAP[fechaDate.getDay()];

    // ¿Trabaja ese día?
    const horarioDia = horariosTrabajo[diaSemana];
    if (!horarioDia) {
      return {
        disponible: false,
        motivo: `El Alqui-Amigo no trabaja los ${diaSemana}.`,
      };
    }

    // Unir hora + periodo: "9:00" + "am" → "9:00 am", luego normalizar a 24h
    const horaInicioStr = horarioDia.inicioPeriodo
      ? `${horarioDia.inicio} ${horarioDia.inicioPeriodo}`
      : horarioDia.inicio;
    const horaFinStr = horarioDia.finPeriodo
      ? `${horarioDia.fin} ${horarioDia.finPeriodo}`
      : horarioDia.fin;

    const inicioDisp = horaAMinutos(normalizar24h(horaInicioStr));
    const finDisp    = horaAMinutos(normalizar24h(horaFinStr));
    const inicioSol  = horaAMinutos(normalizar24h(horaSalida));
    const finSol     = inicioSol + Math.round(duracion * 60);

    if (inicioSol < inicioDisp || finSol > finDisp) {
      // Formatear horas para mostrar en el mensaje
      const fmt = (min: number) => {
        const horas = Math.floor(min / 60);
        const minutos = min % 60;
        const periodo = horas < 12 ? 'AM' : 'PM';
        const h12 = horas === 0 ? 12 : horas > 12 ? horas - 12 : horas;
        return `${h12}:${String(minutos).padStart(2, '0')} ${periodo}`;
      };

      return {
        disponible: false,
        motivo:
          `El horario solicitado (${fmt(inicioSol)} – ${fmt(finSol)}) está fuera del ` +
          `horario disponible del Alqui-Amigo los ${diaSemana}` +
          `(${fmt(inicioDisp)} – ${fmt(finDisp)}).`,
      };
    }

    return { disponible: true };
  } catch (error) {
    console.error('Error verificando disponibilidad horaria:', error);
    return { disponible: false, motivo: 'Error al verificar la disponibilidad. Intenta de nuevo.' };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. VERIFICAR SOLAPAMIENTO CON SOLICITUDES EXISTENTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica que la nueva solicitud no se solape con ninguna solicitud
 * pendiente o aceptada que ya exista para ese alqui-amigo en esa fecha.
 *
 * Lógica de solapamiento:
 *   Dos rangos [A_inicio, A_fin) y [B_inicio, B_fin) se solapan si:
 *   A_inicio < B_fin  &&  B_inicio < A_fin
 *
 * @param amigoId    UID del alqui-amigo
 * @param fecha      Fecha en formato "YYYY-MM-DD"
 * @param horaSalida Hora de inicio en formato "HH:MM" (24h)
 * @param duracion   Duración en horas
 * @returns { solapamiento: boolean, motivo?: string }
 */
export const verificarSolapamientoSolicitudes = async (
  amigoId: string,
  fecha: string,
  horaSalida: string,
  duracion: number
): Promise<{ solapamiento: boolean; motivo?: string }> => {
  try {
    // Traer solicitudes activas (pendiente o aceptada) del amigo en esa fecha
    const q = query(
      collection(db, 'solicitudes'),
      where('amigo_id', '==', amigoId),
      where('fecha_salida', '==', fecha)
    );
    const snapshot = await getDocs(q);

    const solicitudesActivas = snapshot.docs.filter(d => {
      const estado = d.data().estado_solicitud;
      return estado === 'pendiente' || estado === 'aceptada';
    });

    if (solicitudesActivas.length === 0) {
      return { solapamiento: false };
    }

    const inicioNueva = horaAMinutos(normalizar24h(horaSalida));
    const finNueva    = inicioNueva + Math.round(duracion * 60);

    for (const solicDoc of solicitudesActivas) {
      const sol = solicDoc.data();
      const inicioExist = horaAMinutos(normalizar24h(sol.hora_salida));
      const finExist    = inicioExist + Math.round((sol.duracion || 0) * 60);

      // Algoritmo estándar de solapamiento de intervalos
      if (inicioNueva < finExist && inicioExist < finNueva) {
        const fmt = (min: number) => {
          const horas = Math.floor(min / 60);
          const minutos = min % 60;
          const periodo = horas < 12 ? 'AM' : 'PM';
          const h12 = horas === 0 ? 12 : horas > 12 ? horas - 12 : horas;
          return `${h12}:${String(minutos).padStart(2, '0')} ${periodo}`;
        };

        return {
          solapamiento: true,
          motivo:
            `Ya tienes una solicitud para ese Alqui-Amigo el ${fecha} ` +
            `de ${fmt(inicioExist)} a ${fmt(finExist)}. ` +
            `El horario que seleccionaste se superpone con esa reserva.`,
        };
      }
    }

    return { solapamiento: false };
  } catch (error) {
    console.error('Error verificando solapamiento:', error);
    return { solapamiento: false, motivo: 'Error al verificar disponibilidad. Intenta de nuevo.' };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. VERIFICAR SOLICITUD DUPLICADA EXACTA (original, sin cambios)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica si ya existe una solicitud con los mismos datos
 * (mismo cliente, amigo, fecha y hora) que no fue rechazada.
 */
export const verificarSolicitudDuplicada = async (
  clienteId: string, 
  amigoId: string, 
  fecha: string, 
  hora: string
): Promise<{ duplicada: boolean }> => {
  try {
    const q = query(
      collection(db, 'solicitudes'),
      where('cliente_id', '==', clienteId),
      where('amigo_id', '==', amigoId),
      where('fecha_salida', '==', fecha),
      where('hora_salida', '==', hora)
    );
    const snapshot = await getDocs(q);

    const activas = snapshot.docs.filter(d => {
      const estado = d.data().estado_solicitud;
      return estado !== 'rechazada';
    });

    return { duplicada: activas.length > 0 };
  } catch (error) {
    console.error("Error verificando duplicados:", error);
    return { duplicada: false };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. ENVIAR SOLICITUD (con todas las validaciones integradas)
// ─────────────────────────────────────────────────────────────────────────────

export const enviarSolicitudServicio = async (datos: NuevaSolicitud) => {
  try {
    // Guardar solicitud en BD
    const docRef = await addDoc(collection(db, 'solicitudes'), {
      ...datos,
      fecha_creacion: Timestamp.now(),
    });

    // Enviar notificación push al amigo
    try {
      const usuarioRef = doc(db, 'usuarios', datos.amigo_id);
      const usuarioSnap = await getDoc(usuarioRef);

      if (usuarioSnap.exists()) {
        const usuarioData = usuarioSnap.data();
        const tokenDestino = usuarioData.pushToken;

        if (tokenDestino) {
          await enviarNotificacionPush(
            tokenDestino,
            "¡Nueva Oportunidad! 💸",
            `${datos.nombre_solicitante} quiere alquilar tu amistad para el ${datos.fecha_salida}.`,
            { solicitudId: docRef.id }
          );
        }
      }
    } catch (notifError) {
      console.error("Error enviando push (no crítico):", notifError);
    }

    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error al crear solicitud:", error);
    return { success: false, error };
  }
};