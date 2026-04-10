import { 
    collection, 
    Timestamp, 
    doc, 
    runTransaction
  } from 'firebase/firestore';
  import { db } from '../config/firebase';
  
  export interface CalificacionData {
    solicitud_id: string;
    alqui_amigo_id: string;
    cliente_id: string;
    estrellas: number; // 1 a 5
    fecha_calificacion: Timestamp;
  }
  
  export const enviarCalificacion = async (datos: CalificacionData) => {
    try {
      await runTransaction(db, async (transaction) => {
        
        // Ahora leemos de la colección 'amigos'
        const amigoRef = doc(db, 'amigos', datos.alqui_amigo_id);
        const amigoDoc = await transaction.get(amigoRef);
        
        if (!amigoDoc.exists()) {
          throw new Error("El Alqui-Amigo no existe");
        }
        
        const dataAmigo = amigoDoc.data();
        
        const cantidadActual = dataAmigo.cantidadCalificaciones || 0;
        const sumaActual = dataAmigo.sumaCalificaciones || 0;
  
        const nuevaCantidad = cantidadActual + 1;
        const nuevaSuma = sumaActual + datos.estrellas;
        
        const nuevoPromedio = Number((nuevaSuma / nuevaCantidad).toFixed(1));
        
        // Guardar la calificación individual
        const nuevaCalificacionRef = doc(collection(db, 'calificaciones'));
        transaction.set(nuevaCalificacionRef, {
          ...datos,
          fecha_calificacion: Timestamp.now()
        });
  
        // Marcar la solicitud como 'calificada'
        const solicitudRef = doc(db, 'solicitudes', datos.solicitud_id);
        transaction.update(solicitudRef, { estado_calificacion: true });
  
        // Actualizar el promedio en 'amigos'
        transaction.update(amigoRef, {
          calificacion: nuevoPromedio,
          cantidadCalificaciones: nuevaCantidad,
          sumaCalificaciones: nuevaSuma
        });
      });
  
      return { success: true };
  
    } catch (error) {
      console.error("Error al enviar calificación:", error);
      return { success: false, error };
    }
  };