import { 
    collection, 
    addDoc, 
    Timestamp 
  } from 'firebase/firestore';
  import { db } from '../config/firebase';
  
  // Interfaz basada en tu diseño de BD
  export interface DenunciaData {
    cliente_id: string;
    alqui_amigo_id: string; // Agregamos esto para saber a quién se denuncia
    solicitud_id?: string;  // Opcional: para vincularlo a una cita específica
    motivo: string;
    descripcion: string;
    fecha_creacion: Timestamp;
    estado: 'pendiente' | 'revisada' | 'resuelta'; // Para gestión interna
  }
  
  export const enviarDenuncia = async (datos: DenunciaData) => {
    try {
      const docRef = await addDoc(collection(db, 'denuncias'), {
        ...datos,
        fecha_creacion: Timestamp.now(),
        estado: 'pendiente'
      });
  
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("Error al enviar denuncia:", error);
      return { success: false, error };
    }
  };