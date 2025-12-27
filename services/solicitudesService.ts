import { 
    collection, 
    addDoc, 
    Timestamp, 
    doc, 
    getDoc 
  } from 'firebase/firestore';
  import { db } from '../config/firebase';
  import { enviarNotificacionPush } from './notificationService';
  
  // Interfaz basada en tu imagen de BD (image_bf2921.png)
  export interface NuevaSolicitud {
    cliente_id: string;
    alqui_amigo_id: string;
    nombre_solicitante: string;
    fotografia_solicitante: string;
    informacion_general_solicitante: string; // Ej: Edad, intereses breves
    fecha_salida: string; // Formato YYYY-MM-DD
    hora_salida: string;  // Formato HH:MM
    duracion: number;     // Horas
    lugar_asistir: string;
    detalles_de_la_salida: string; // Mensaje/Propósito
    // Campos automáticos
    estado_solicitud: 'pendiente' | 'aceptada' | 'rechazada';
    fecha_creacion: Timestamp;
  }
  
  export const enviarSolicitudServicio = async (datos: NuevaSolicitud) => {
    try {
      // 1. Guardar solicitud en BD (Tu código original)
      const docRef = await addDoc(collection(db, 'solicitudes'), {
        ...datos,
        fecha_creacion: Timestamp.now(),
      });
  
      // --- 2. CÓDIGO NUEVO: NOTIFICAR AL ALQUI-AMIGO ---
      try {
        // A) Buscar datos del Alqui-Amigo para obtener su pushToken
        const amigoRef = doc(db, 'alqui-amigos', datos.alqui_amigo_id);
        const amigoSnap = await getDoc(amigoRef);
  
        if (amigoSnap.exists()) {
          const amigoData = amigoSnap.data();
          const tokenDestino = amigoData.pushToken; // El campo que guardamos en el Login
  
          if (tokenDestino) {
            // B) Enviar Push
            await enviarNotificacionPush(
              tokenDestino, // Token del alqui-amigo
              "¡Nueva Oportunidad! 💸", // Título
              `${datos.nombre_solicitante} quiere alquilar tu amistad para el ${datos.fecha_salida}.`, // Cuerpo
              { solicitudId: docRef.id } // Datos extra (útil para redirigir al tocar la notif)
            );
          }
        }
      } catch (notifError) {
        console.error("Error enviando push (no crítico):", notifError);
        // No hacemos return false aquí porque la solicitud sí se guardó en BD
      }
      // ------------------------------------------------
  
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("Error al crear solicitud:", error);
      return { success: false, error };
    }
  };