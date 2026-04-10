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
import { enviarNotificacionPush } from './notificationService';
import { enviarCorreoSancion } from './emailService';


/**
 * Obtiene solicitudes de registro pendientes
 * Ahora busca en colección unificada 'usuarios' donde estadoCuenta === 'pendiente'
 */
export const obtenerSolicitudesRegistro = async () => {
  try {
    const q = query(collection(db, 'usuarios'), where('estadoCuenta', '==', 'pendiente'));
    const snapshot = await getDocs(q);

    const lista: any[] = [];

    snapshot.forEach(document => {
      const data = document.data();
      // Mapear campos para compatibilidad con la pantalla admin
      lista.push({
        ...data,
        id: document.id,
        // Campos mapeados para compatibilidad con UI existente
        email: data.correo,
        nombres: data.nombres,
        cedula: data.cedula_identidad,
        fechaNacimiento: data.fecha_nacimiento,
        genero: data.genero,
        telefono: data.nro_telefonico,
        fotoURL: data.fotografia,
        userType: data.tipo_usuario,
        descripcion: data.descripcion,
        intereses: data.intereses,
        // Colección para referencia interna (ya no necesaria para la lógica, pero mantiene compat)
        coleccion: 'usuarios',
      });
    });

    return lista;
  } catch (error) {
    console.error("Error obteniendo registros:", error);
    return [];
  }
};

/**
 * Acepta o rechaza un usuario
 * Ahora actualiza en colección 'usuarios'
 */
export const gestionarUsuario = async (id: string, coleccion: string, accion: 'aceptar' | 'rechazar') => {
  try {
    // Siempre actualizamos en 'usuarios' (colección unificada)
    const userRef = doc(db, 'usuarios', id);
    
    await updateDoc(userRef, {
      activo: accion === 'aceptar',
      estadoCuenta: accion === 'aceptar' ? 'aceptada' : 'rechazada'
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

/**
 * Obtiene resumen de usuarios activos
 * Ahora cuenta en 'usuarios' filtrando por tipo_usuario
 */
export const obtenerResumen = async () => {
  try {
    // Contar Alqui-Amigos Activos
    const qAmigos = query(
      collection(db, 'usuarios'), 
      where('activo', '==', true),
      where('tipo_usuario', '==', 'alqui-amigo')
    );
    const snapAmigos = await getCountFromServer(qAmigos);

    // Contar Clientes Activos
    const qClientes = query(
      collection(db, 'usuarios'), 
      where('activo', '==', true),
      where('tipo_usuario', '==', 'cliente')
    );
    const snapClientes = await getCountFromServer(qClientes);

    return {
      alquiAmigos: snapAmigos.data().count,
      clientes: snapClientes.data().count
    };
  } catch (error) {
    return { alquiAmigos: 0, clientes: 0 };
  }
};

/**
 * Obtiene denuncias pendientes
 * Ahora busca datos del acusado en 'amigos' + 'usuarios'
 */
export const obtenerDenunciasPendientes = async () => {
  try {
    const q = query(collection(db, 'denuncias'), where('estado', '==', 'pendiente'));
    const snapshot = await getDocs(q);
    
    const listaReportes: any[] = [];

    await Promise.all(
      snapshot.docs.map(async (document) => {
        const dataDenuncia = document.data();
        let alquiAmigoData = {
          nombres: 'Usuario Eliminado',
          fotoURL: '',
          faltas: 0
        };

        try {
          // Obtener faltas de 'amigos'
          const amigoRef = doc(db, 'amigos', dataDenuncia.amigo_id);
          const amigoSnap = await getDoc(amigoRef);
          
          // Obtener datos base de 'usuarios'
          const usuarioRef = doc(db, 'usuarios', dataDenuncia.amigo_id);
          const usuarioSnap = await getDoc(usuarioRef);
          
          if (usuarioSnap.exists()) {
            const uData = usuarioSnap.data();
            alquiAmigoData.nombres = uData.nombres;
            alquiAmigoData.fotoURL = uData.fotografia || '';
          }
          
          if (amigoSnap.exists()) {
            const aData = amigoSnap.data();
            alquiAmigoData.faltas = aData.nro_faltas || 0;
          }
        } catch (e) {
          console.error("Error buscando alqui-amigo denunciado", e);
        }

        listaReportes.push({
          id: document.id,
          ...dataDenuncia,
          // Compatibilidad: la pantalla usa alqui_amigo_id
          alqui_amigo_id: dataDenuncia.amigo_id,
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

/**
 * Resuelve una denuncia (strike o ban)
 * Ahora actualiza faltas en 'amigos' y lee pushToken/email de 'usuarios'
 */
export const resolverDenuncia = async (
  denunciaId: string, 
  alquiAmigoId: string, 
  accionSolicitada: 'strike' | 'ban'
) => {
  try {
    const denunciaRef = doc(db, 'denuncias', denunciaId);
    const amigoRef = doc(db, 'amigos', alquiAmigoId);
    const usuarioRef = doc(db, 'usuarios', alquiAmigoId);

    // Obtener datos del amigo (faltas)
    const amigoSnap = await getDoc(amigoRef);
    if (!amigoSnap.exists()) return { success: false, error: 'Amigo no encontrado' };
    
    const amigoData = amigoSnap.data();
    const faltasActuales = amigoData.nro_faltas || 0;

    // Obtener datos del usuario (email, pushToken, nombre)
    const usuarioSnap = await getDoc(usuarioRef);
    if (!usuarioSnap.exists()) return { success: false, error: 'Usuario no encontrado' };
    
    const usuarioData = usuarioSnap.data();
    const emailUsuario = usuarioData.correo;
    const pushToken = usuarioData.pushToken;
    const nombreUsuario = usuarioData.nombres;

    // Determinar la acción final
    let accionFinal = accionSolicitada;
    let nuevasFaltas = faltasActuales;

    if (accionSolicitada === 'strike') {
      nuevasFaltas = faltasActuales + 1;
      if (nuevasFaltas >= 3) {
        accionFinal = 'ban';
      }
    }

    // Actualizar la Denuncia
    await updateDoc(denunciaRef, {
      estado: 'revisada',
      accion_tomada: accionFinal
    });

    // Aplicar castigo
    if (accionFinal === 'ban') {
      // Baneo: actualizar en 'amigos' (faltas) y 'usuarios' (activo/estadoCuenta)
      await updateDoc(amigoRef, {
        nro_faltas: nuevasFaltas
      });
      await updateDoc(usuarioRef, {
        activo: false,
        estadoCuenta: 'bloqueada',
      });
    } else {
      // Solo sumar falta en 'amigos'
      await updateDoc(amigoRef, {
        nro_faltas: increment(1)
      });
    }

    // NOTIFICACIONES
    if (pushToken) {
      if (accionFinal === 'ban') {
        await enviarNotificacionPush(pushToken, "Cuenta Suspendida", "Has acumulado 3 faltas. Tu cuenta ha sido bloqueada permanentemente.");
      } else {
        await enviarNotificacionPush(pushToken, "Atención: Nueva Falta", `Has recibido una falta. Llevas ${nuevasFaltas}/3.`);
      }
    }

    if (emailUsuario) {
      await enviarCorreoSancion(emailUsuario, nombreUsuario, accionFinal, nuevasFaltas);
    }

    return { success: true, accionAplicada: accionFinal };

  } catch (error) {
    console.error("Error resolviendo denuncia:", error);
    return { success: false, error };
  }
};
