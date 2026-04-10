import { 
    collection, 
    addDoc, 
    Timestamp, 
    doc, 
    getDoc 
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
    fecha_salida: string;
    hora_salida: string;
    duracion: number;
    lugar_asistir: string;
    detalles_de_la_salida: string;
    estado_solicitud: 'pendiente' | 'aceptada' | 'rechazada';
    fecha_creacion: Timestamp;
  }
  
  export const enviarSolicitudServicio = async (datos: NuevaSolicitud) => {
    try {
      // Guardar solicitud en BD
      const docRef = await addDoc(collection(db, 'solicitudes'), {
        ...datos,
        fecha_creacion: Timestamp.now(),
      });
  
      // Enviar notificación push al amigo
      try {
        // Leer pushToken de la colección 'usuarios'
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