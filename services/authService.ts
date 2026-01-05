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
  updateDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../config/firebase'; 

  
  // --- INTERFAZ PARA EL HORARIO ---
  // Define la estructura para un rango horario
  export interface Horario {
    inicio: string; // Ej: "09:00"
    fin: string;    // Ej: "17:00"
    inicioPeriodo: 'am' | 'pm';
    finPeriodo: 'am' | 'pm';
  }
  
  // Define los días que pueden tener un horario
  type DiasDisponibles = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';
  
  // --- INTERFAZ DE REGISTRO ACTUALIZADA ---
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
  

// --- NUEVA FUNCIÓN PARA SUBIR IMAGEN ---
const subirImagenPerfil = async (uri: string, uid: string) => {
  try {
    // 1. Convertir la ruta local a un Blob (archivo binario)
    const response = await fetch(uri);
    const blob = await response.blob();

    // 2. Crear referencia en Storage: carpeta 'perfiles', nombre = uid del usuario
    const storageRef = ref(storage, `perfiles/${uid}`);

    // 3. Subir el archivo
    await uploadBytes(storageRef, blob);

    // 4. Obtener la URL pública (https://...)
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  } catch (error) {
    console.error("Error subiendo imagen:", error);
    throw new Error("No se pudo subir la imagen de perfil.");
  }
};  

/**
 * Registra un nuevo usuario en Firebase Authentication, Storage y Firestore
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

    // 3. Preparar datos para Firestore
    const userData: any = {
      uid: user.uid,
      email: data.email,
      userType: data.userType,
      nombres: data.nombres,
      cedula: data.cedula,
      fechaNacimiento: data.fechaNacimiento,
      genero: data.genero,
      telefono: data.telefono,
      intereses: data.intereses || '',
      descripcion: data.descripcion || '',
      fotoURL: fotoURLPublica,
      createdAt: Timestamp.now(),
      activo: false, 
      estadoCuenta: 'pendiente',
    };

    if (data.userType === 'alqui-amigo') {
      userData.tarifa = data.tarifa || '0';
      userData.disponibilidadHoraria = data.disponibilidadHoraria || {};
      userData.rating = 0;
      userData.totalReservas = 0;
      userData.cantidadCalificaciones = 0;
      userData.sumaCalificaciones = 0;
    } else {
      userData.reservasRealizadas = 0;
    }

    const collectionName = data.userType === 'cliente' ? 'clientes' : 'alqui-amigos';
    
    // 4. Guardar en Firestore
    await setDoc(doc(db, collectionName, user.uid), userData);

    return { success: true, userId: user.uid };

  } catch (error: any) {
    console.error('Error registro:', error);

    return { success: false, error: error.message };
  }
};
  
  /**
   * Inicia sesión con email y contraseña
   */
  export const loginUser = async (email: string, password: string, userType: 'cliente' | 'alqui-amigo') => {
    try {
      // 1. LÓGICA DE ADMIN REAL
      if (email.toLowerCase() === 'admin1236@gmail.com' && password === '111') {
        try {
          // Intentamos loguear al admin en Firebase REALMENTE
          await signInWithEmailAndPassword(auth, email, "AdminPasswordSeguro123"); 
          // Nota: Como la contraseña '111' es muy corta para Firebase (min 6 caracteres),
          // usamos una contraseña interna segura o intentamos crear la cuenta.
        } catch (e: any) {
          if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
              // Si el admin no existe en Firebase, lo creamos automáticamente la primera vez
              // Usamos una contraseña más fuerte internamente
              await createUserWithEmailAndPassword(auth, email, "AdminPasswordSeguro123");
          } else {
              // Si falla por contraseña incorrecta (porque ya existe), intentamos loguear con la password real si el usuario puso '111'
               await signInWithEmailAndPassword(auth, email, "AdminPasswordSeguro123");
          }
        }
        
        return { success: true, role: 'admin', userId: auth.currentUser?.uid };
      }
  
      // 2. Login Normal de Usuarios
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      const collectionName = userType === 'cliente' ? 'clientes' : 'alqui-amigos';
      const userDoc = await getDoc(doc(db, collectionName, user.uid));
  
      if (!userDoc.exists()) {
        await signOut(auth);
        return { success: false, error: `No existe cuenta de ${userType}.` };
      }
  
      const userData = userDoc.data();
  
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
  
      return { success: true, role: userData.userType, userId: user.uid };
  
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
   * Obtiene los datos del usuario actual desde Firestore
   */
  export const getUserData = async (userId: string, userType: 'cliente' | 'alqui-amigo') => {
    try {
      const collectionName = userType === 'cliente' ? 'clientes' : 'alqui-amigos';
      const userDoc = await getDoc(doc(db, collectionName, userId));
      
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
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

  // --- AGREGAR ESTA NUEVA FUNCIÓN AL FINAL ---
export const guardarTokenNotificacion = async (userId: string, userType: 'cliente' | 'alqui-amigo' | 'admin', token: string) => {
  try {
    // Si es admin, quizás no quieras guardar token, o sí. Asumo que alqui-amigo es lo importante.
    const collectionName = userType === 'cliente' ? 'clientes' : 'alqui-amigos';
    
    // Si es admin, no hacemos nada o lo guardas en otra colección
    if(userType === 'admin') return;

    const userRef = doc(db, collectionName, userId);
    await updateDoc(userRef, {
      pushToken: token // <--- Campo nuevo en tu BD
    });
  } catch (error) {
    console.error("Error guardando token push:", error);
  }
};