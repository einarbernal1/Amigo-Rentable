import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  getCountFromServer, 
  getDoc,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const obtenerSolicitudesRegistro = async () => {
  try {
    // 1. Buscar en Clientes pendientes
    const qClientes = query(collection(db, 'clientes'), where('estadoCuenta', '==', 'pendiente'));
    const snapClientes = await getDocs(qClientes);
    
    // 2. Buscar en Alqui-Amigos pendientes
    const qAmigos = query(collection(db, 'alqui-amigos'), where('estadoCuenta', '==', 'pendiente'));
    const snapAmigos = await getDocs(qAmigos);

    const lista: any[] = [];

    snapClientes.forEach(doc => lista.push({ ...doc.data(), id: doc.id, coleccion: 'clientes' }));
    snapAmigos.forEach(doc => lista.push({ ...doc.data(), id: doc.id, coleccion: 'alqui-amigos' }));

    return lista;
  } catch (error) {
    console.error("Error obteniendo registros:", error);
    return [];
  }
};

export const gestionarUsuario = async (id: string, coleccion: string, accion: 'aceptar' | 'rechazar') => {
  try {
    const userRef = doc(db, coleccion, id);
    
    await updateDoc(userRef, {
      activo: accion === 'aceptar',
      estadoCuenta: accion === 'aceptar' ? 'aceptada' : 'rechazada'
    });
    
    // AQUÍ PODRÍAS AGREGAR LÓGICA PARA ENVIAR EMAIL (Requiere Cloud Functions o servicio externo)
    
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

export const obtenerResumen = async () => {
  try {
    // Contar Alqui-Amigos Activos
    const qAmigos = query(collection(db, 'alqui-amigos'), where('activo', '==', true));
    const snapAmigos = await getCountFromServer(qAmigos);

    // Contar Clientes Activos
    const qClientes = query(collection(db, 'clientes'), where('activo', '==', true));
    const snapClientes = await getCountFromServer(qClientes);

    return {
      alquiAmigos: snapAmigos.data().count,
      clientes: snapClientes.data().count
    };
  } catch (error) {
    return { alquiAmigos: 0, clientes: 0 };
  }
};

export const obtenerDenunciasPendientes = async () => {
  try {
    // 1. Traer solo denuncias pendientes
    const q = query(collection(db, 'denuncias'), where('estado', '==', 'pendiente'));
    const snapshot = await getDocs(q);
    
    const listaReportes: any[] = [];

    // 2. Por cada denuncia, buscar los datos del Alqui-Amigo acusado
    await Promise.all(
      snapshot.docs.map(async (document) => {
        const dataDenuncia = document.data();
        let alquiAmigoData = {
          nombres: 'Usuario Eliminado',
          fotoURL: '',
          faltas: 0 // Campo nuevo que asumimos existirá
        };

        try {
          const amigoRef = doc(db, 'alqui-amigos', dataDenuncia.alqui_amigo_id);
          const amigoSnap = await getDoc(amigoRef);
          if (amigoSnap.exists()) {
            const d = amigoSnap.data();
            alquiAmigoData = {
              nombres: d.nombres,
              fotoURL: d.fotoURL,
              faltas: d.faltas || 0 // Si no tiene faltas, es 0
            };
          }
        } catch (e) {
          console.error("Error buscando alqui-amigo denunciado", e);
        }

        listaReportes.push({
          id: document.id, // ID de la denuncia
          ...dataDenuncia,
          datosAcusado: alquiAmigoData
        });
      })
    );

    return listaReportes;
  } catch (error) {
    console.error("Error obteniendo denuncias:", error);
    return [];
  }
};

export const resolverDenuncia = async (
  denunciaId: string, 
  alquiAmigoId: string, 
  accion: 'strike' | 'ban'
) => {
  try {
    const denunciaRef = doc(db, 'denuncias', denunciaId);
    const alquiAmigoRef = doc(db, 'alqui-amigos', alquiAmigoId);

    // 1. Marcar la denuncia como "revisada" para que salga de la lista
    await updateDoc(denunciaRef, {
      estado: 'revisada',
      accionTomada: accion
    });

    // 2. Aplicar el castigo al usuario
    if (accion === 'strike') {
      // Sumar 1 a las faltas
      await updateDoc(alquiAmigoRef, {
        faltas: increment(1)
      });
    } else if (accion === 'ban') {
      // Desactivar la cuenta
      await updateDoc(alquiAmigoRef, {
        activo: false,
        estadoCuenta: 'bloqueada' // O 'rechazada' según tu lógica
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error resolviendo denuncia:", error);
    return { success: false, error };
  }
};
