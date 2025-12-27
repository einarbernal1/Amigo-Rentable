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
        
        // --- PASO 1: LECTURAS (READS) ---
        // REGLA DE ORO: Todo 'get' debe ir antes de cualquier 'set' o 'update'
        
        const alquiAmigoRef = doc(db, 'alqui-amigos', datos.alqui_amigo_id);
        const alquiAmigoDoc = await transaction.get(alquiAmigoRef);
        
        if (!alquiAmigoDoc.exists()) {
          throw new Error("El Alqui-Amigo no existe");
        }
  
        // --- PASO 2: CÁLCULOS EN MEMORIA ---
        
        const dataAmigo = alquiAmigoDoc.data();
        
        // Obtenemos valores actuales o inicializamos en 0 si es la primera vez
        const cantidadActual = dataAmigo.cantidadCalificaciones || 0;
        const sumaActual = dataAmigo.sumaCalificaciones || 0;
  
        // Calculamos nuevos valores
        const nuevaCantidad = cantidadActual + 1;
        const nuevaSuma = sumaActual + datos.estrellas;
        
        // Promedio simple: Suma Total / Cantidad Votos
        // Usamos toFixed(1) para no tener decimales infinitos, pero guardamos como número
        const nuevoPromedio = Number((nuevaSuma / nuevaCantidad).toFixed(1));
  
        // --- PASO 3: ESCRITURAS (WRITES) ---
        
        // A) Guardar la nueva calificación individual
        const nuevaCalificacionRef = doc(collection(db, 'calificaciones'));
        transaction.set(nuevaCalificacionRef, {
          ...datos,
          fecha_calificacion: Timestamp.now()
        });
  
        // B) Marcar la solicitud como 'calificada' para que no pueda volver a votar
        const solicitudRef = doc(db, 'solicitudes', datos.solicitud_id);
        transaction.update(solicitudRef, { estado_calificacion: true });
  
        // C) Actualizar el promedio y contadores en el perfil del Alqui-Amigo
        transaction.update(alquiAmigoRef, {
          rating: nuevoPromedio,
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