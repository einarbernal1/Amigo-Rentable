import { 
    collection, 
    addDoc, 
    Timestamp 
  } from 'firebase/firestore';
  import { db } from '../config/firebase';
  
  // Interfaz actualizada al nuevo modelo
  export interface DenunciaData {
    cliente_id: string;
    amigo_id: string;       // Renombrado de alqui_amigo_id
    solicitud_id?: string;
    motivo: string[];
    descripcion: string;
    fecha_creacion: Timestamp;
    estado: 'pendiente' | 'revisada' | 'resuelta';
    admin_id?: string;      // FK al administrador (se llena al resolver)
    accion_tomada?: string;  // Se llena al resolver
  }
  
  export const enviarDenuncia = async (datos: DenunciaData) => {
    try {
      const docRef = await addDoc(collection(db, 'denuncias'), {
        ...datos,
        fecha_creacion: Timestamp.now(),
        estado: 'pendiente',
        admin_id: '',
        accion_tomada: ''
      });
  
      return { success: true, id: docRef.id };
    } catch (error) {
      console.error("Error al enviar denuncia:", error);
      return { success: false, error };
    }
  };