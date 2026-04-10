// services/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  Timestamp,
  updateDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase'; 
import { sendPasswordResetEmail } from 'firebase/auth';

  
  // --- INTERFAZ PARA EL HORARIO ---
  export interface Horario {
    inicio: string;
    fin: string;
    inicioPeriodo: 'am' | 'pm';
    finPeriodo: 'am' | 'pm';
  }
  
  type DiasDisponibles = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
  
  // --- INTERFAZ DE REGISTRO ---
  export interface RegisterData {
    email: string;
    password: string;
    userType: 'cliente' | 'alqui-amigo';
    nombres: string;
    cedula: string;
    fechaNacimiento: string;
    genero: string;
    telefono: string;
    intereses?: string;
    descripcion?: string;
    tarifa?: string;
    disponibilidadHoraria?: any;
    fotoURL?: string;
  }
  
  export interface LoginResult {
    success: boolean;
    role?: 'cliente' | 'alqui-amigo';
    error?: string;
    userId?: string;
  }
  
  export interface RegisterResult {
    success: boolean;
    error?: string;
    userId?: string;
  }
  

// --- FUNCIÓN PARA SUBIR IMAGEN ---
const subirImagenPerfil = async (uri: string, uid: string) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `perfiles/${uid}`);
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error subiendo imagen:", error);
    throw new Error("No se pudo subir la imagen de perfil.");
  }
};  

/**
 * Registra un nuevo usuario en Firebase Authentication, Storage y Firestore
 * Crea documento en 'usuarios' + documento en 'clientes' o 'amigos' según tipo
 */
export const registerUser = async (data: RegisterData) => {
  try {
    // 1. Crear usuario en Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );
    const user = userCredential.user;

    // 2. Subir imagen (Si el usuario seleccionó una)
    let fotoURLPublica = '';
    if (data.fotoURL) {
      fotoURLPublica = await subirImagenPerfil(data.fotoURL, user.uid);
    }

    // 3. Crear documento en colección 'usuarios' (datos base)
    const usuarioData: any = {
      usuario_id: user.uid,
      nombres: data.nombres,
      apellidos: '',
      tipo_usuario: data.userType,
      fecha_nacimiento: data.fechaNacimiento,
      cedula_identidad: data.cedula,
      genero: data.genero,
      correo: data.email,
      contraseña: '', // No guardamos contraseña en Firestore (Firebase Auth la maneja)
      fotografia: fotoURLPublica,
      nro_telefonico: data.telefono,
      descripcion: data.descripcion || '',
      intereses: data.intereses || '',
      activo: false,
      // Campos adicionales de la app (no en el modelo pero necesarios para flujo)
      estadoCuenta: 'pendiente',
      pushToken: '',
      createdAt: Timestamp.now(),
    };

    await setDoc(doc(db, 'usuarios', user.uid), usuarioData);

    // 4. Crear documento en colección de rol específico
    if (data.userType === 'cliente') {
      await setDoc(doc(db, 'clientes', user.uid), {
        cliente_id: user.uid,
        usuario_id: user.uid,
      });
    } else {
      // alqui-amigo → colección 'amigos'
      await setDoc(doc(db, 'amigos', user.uid), {
        amigo_id: user.uid,
        tarifa_hora: data.tarifa || '0',
        horarios_trabajo: data.disponibilidadHoraria || {},
        calificacion: 0,
        nro_faltas: 0,
        usuario_id: user.uid,
        // Campos adicionales para cálculos de rating
        cantidadCalificaciones: 0,
        sumaCalificaciones: 0,
        totalReservas: 0,
      });
    }

    return { success: true, userId: user.uid };

  } catch (error: any) {
    console.error('Error registro:', error);
    return { success: false, error: error.message };
  }
};
  
  /**
   * Inicia sesión con email y contraseña
   * Ahora busca en colección 'usuarios' unificada
   */
  export const loginUser = async (email: string, password: string, userType: 'cliente' | 'alqui-amigo') => {
    try {
      // 1. LÓGICA DE ADMIN REAL
      if (email.toLowerCase() === 'admin1236@gmail.com' && password === '111') {
        try {
          await signInWithEmailAndPassword(auth, email, "AdminPasswordSeguro123"); 
        } catch (e: any) {
          if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
              await createUserWithEmailAndPassword(auth, email, "AdminPasswordSeguro123");
          } else {
               await signInWithEmailAndPassword(auth, email, "AdminPasswordSeguro123");
          }
        }
        
        return { success: true, role: 'admin', userId: auth.currentUser?.uid };
      }
  
      // 2. Login Normal de Usuarios
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Buscar en colección unificada 'usuarios'
      const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
  
      if (!userDoc.exists()) {
        await signOut(auth);
        return { success: false, error: `No existe cuenta registrada.` };
      }
  
      const userData = userDoc.data();

      // Verificar que el tipo de usuario coincide
      if (userData.tipo_usuario !== userType) {
        await signOut(auth);
        return { success: false, error: `No existe cuenta de ${userType}.` };
      }
  
      if (userData.estadoCuenta === 'pendiente' || userData.activo === false) {
        await signOut(auth);
        return { 
          success: false, 
          error: 'Tu cuenta está en proceso de revisión. Te notificaremos cuando sea aceptada.' 
        };
      }
  
      if (userData.estadoCuenta === 'rechazada') {
        await signOut(auth);
        return { 
          success: false, 
          error: 'Tu solicitud de registro ha sido rechazada por el administrador.' 
        };
      }
  
      return { success: true, role: userData.tipo_usuario, userId: user.uid };
  
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };
  
  /**
   * Cierra la sesión del usuario actual
   */
  export const logoutUser = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  };
  
  /**
   * Obtiene los datos del usuario desde Firestore
   * Combina datos de 'usuarios' + datos de rol ('clientes' o 'amigos')
   * Retorna un objeto unificado para compatibilidad con las pantallas
   */
  export const getUserData = async (userId: string, userType: 'cliente' | 'alqui-amigo') => {
    try {
      // 1. Obtener datos base de 'usuarios'
      const userDoc = await getDoc(doc(db, 'usuarios', userId));
      
      if (!userDoc.exists()) {
        return null;
      }

      const baseData = userDoc.data();

      // Mapear campos del nuevo modelo al formato esperado por las pantallas
      const mappedData: any = {
        uid: userId,
        email: baseData.correo,
        userType: baseData.tipo_usuario,
        nombres: baseData.nombres,
        cedula: baseData.cedula_identidad,
        fechaNacimiento: baseData.fecha_nacimiento,
        genero: baseData.genero,
        telefono: baseData.nro_telefonico,
        intereses: baseData.intereses || '',
        descripcion: baseData.descripcion || '',
        fotoURL: baseData.fotografia || '',
        activo: baseData.activo,
        estadoCuenta: baseData.estadoCuenta,
        pushToken: baseData.pushToken || '',
        createdAt: baseData.createdAt,
      };

      // 2. Obtener datos específicos del rol
      if (userType === 'alqui-amigo') {
        const amigoDoc = await getDoc(doc(db, 'amigos', userId));
        if (amigoDoc.exists()) {
          const amigoData = amigoDoc.data();
          mappedData.tarifa = amigoData.tarifa_hora || '0';
          mappedData.disponibilidadHoraria = amigoData.horarios_trabajo || {};
          mappedData.rating = amigoData.calificacion || 0;
          mappedData.faltas = amigoData.nro_faltas || 0;
          mappedData.cantidadCalificaciones = amigoData.cantidadCalificaciones || 0;
          mappedData.sumaCalificaciones = amigoData.sumaCalificaciones || 0;
          mappedData.totalReservas = amigoData.totalReservas || 0;
        }
      } else {
        const clienteDoc = await getDoc(doc(db, 'clientes', userId));
        if (clienteDoc.exists()) {
          const clienteData = clienteDoc.data();
          mappedData.reservasRealizadas = clienteData.reservasRealizadas || 0;
        }
      }

      return mappedData;
    } catch (error) {
      console.error('Error al obtener datos del usuario:', error);
      throw error;
    }
  };
  
  /**
   * Obtiene el usuario actualmente autenticado
   */
  export const getCurrentUser = (): User | null => {
    return auth.currentUser;
  };

  // Guardar token de notificación push en colección 'usuarios'
export const guardarTokenNotificacion = async (userId: string, userType: 'cliente' | 'alqui-amigo' | 'admin', token: string) => {
  try {
    if(userType === 'admin') return;

    // Guardar en colección 'usuarios' (unificada)
    const userRef = doc(db, 'usuarios', userId);
    await updateDoc(userRef, {
      pushToken: token
    });
  } catch (error) {
    console.error("Error guardando token push:", error);
  }
};

/**
 * Verifica si un correo existe en la colección 'usuarios'
 */
export const verificarCorreoExistente = async (email: string, userType: 'cliente' | 'alqui-amigo') => {
  try {
    const q = query(
      collection(db, 'usuarios'), 
      where('correo', '==', email),
      where('tipo_usuario', '==', userType)
    );
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Error verificando correo:", error);
    return false;
  }
};

/**
 * Envía el correo oficial de reseteo de Firebase
 */
export const enviarResetPasswordFirebase = async (email: string) => {
  try {
    console.log("Intentando enviar enlace a:", email);
    await sendPasswordResetEmail(auth, email);
    console.log("Enlace enviado correctamente por Firebase");
    return { success: true };
  } catch (error: any) {
    console.error("Error Firebase Reset:", error.code, error.message);
    
    if (error.code === 'auth/user-not-found') return { success: false, error: 'Este correo no está registrado en el sistema de autenticación.' };
    if (error.code === 'auth/invalid-email') return { success: false, error: 'El formato del correo es inválido.' };
    if (error.code === 'auth/too-many-requests') return { success: false, error: 'Demasiados intentos. Espera unos minutos.' };
    
    return { success: false, error: error.message };
  }
};