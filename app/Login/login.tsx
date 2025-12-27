import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { loginUser,guardarTokenNotificacion } from '../../services/authService';
import { Feather } from '@expo/vector-icons';
import { registrarParaPushNotificationsAsync } from '../../services/notificationService';


// Componente Modal Personalizado
interface ModalMensajeProps {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'exito' | 'error';
  onClose: () => void;
}

const ModalMensaje: React.FC<ModalMensajeProps> = ({ visible, titulo, mensaje, tipo, onClose }) => {
  const colorFondo = tipo === 'exito' ? '#007BFF' : '#DC3545';
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalIconContainer, { backgroundColor: colorFondo }]}>
            <Feather 
              name={tipo === 'exito' ? 'check' : 'x'} 
              size={32} 
              color="#FFFFFF" 
            />
          </View>
          <Text style={styles.modalTitulo}>{titulo}</Text>
          <Text style={styles.modalMensaje}>{mensaje}</Text>
          <TouchableOpacity style={[styles.modalBoton, { backgroundColor: colorFondo }]} onPress={onClose}>
            <Text style={styles.modalBotonTexto}>Aceptar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function LoginScreen() {
  const router = useRouter();
  const [tipoUsuario, setTipoUsuario] = useState<'cliente' | 'alqui-amigo'>('cliente');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  // Estado del modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDatos, setModalDatos] = useState({
    titulo: '',
    mensaje: '',
    tipo: 'error' as 'exito' | 'error',
    accion: () => {}
  });

  const mostrarModal = (titulo: string, mensaje: string, tipo: 'exito' | 'error', accion?: () => void) => {
    setModalDatos({ titulo, mensaje, tipo, accion: accion || (() => {}) });
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    if (modalDatos.accion) modalDatos.accion();
  };

  const manejarLogin = async () => {
    if (!email || !contrasena) {
      mostrarModal('Error', 'Por favor completa todos los campos.', 'error');
      return;
    }

    setCargando(true);

    try {
      const resultado = await loginUser(email.trim().toLowerCase(), contrasena, tipoUsuario);

      if (resultado.success && resultado.role) {
        try {
          const token = await registrarParaPushNotificationsAsync();
          if (token && resultado.userId) {
              // 2. Guardar en Firestore
              await guardarTokenNotificacion(resultado.userId, resultado.role, token);
          }
      } catch (e) {
          console.log("Error silencioso en notificaciones:", e);
      } 
        // --- REDIRECCIÓN ---
        if (resultado.role === 'admin') {
           // Redirigir al panel de administrador
           router.replace('/(admin)/solicitudes');
        } else if (resultado.role === 'cliente') {
           // Mensaje de éxito normal para cliente activo
           router.replace('/(tabs)/buscar');
        } else {
           // Alqui-amigo activo
           router.replace('/(alqui-amigo)/solicitudes');
        }
        
      } else {
        mostrarModal('Acceso Denegado', resultado.error || 'Credenciales incorrectas.', 'error');
      }
    } catch (error: any) {
      mostrarModal('Error', error.message || 'Ocurrió un problema.', 'error');
    } finally {
      setCargando(false);
    }
  };

  const irARegistro = () => {
    router.push('/Login/registro_usuarios');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={styles.container}>
        <Image
          source={require('../../assets/images/icono AR.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.title}>Amigo Rentable</Text>
        <Text style={styles.subtitle}>Tu compañero ideal, a un clic de distancia.</Text>

        <View style={styles.userTypeContainer}>
          <TouchableOpacity
            style={[styles.userTypeButton, tipoUsuario === 'cliente' && styles.activeUserType]}
            onPress={() => setTipoUsuario('cliente')}
            disabled={cargando}
          >
            <Text style={[styles.userTypeText, tipoUsuario === 'cliente' && styles.activeUserTypeText]}>
              Cliente
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.userTypeButton, tipoUsuario === 'alqui-amigo' && styles.activeUserType]}
            onPress={() => setTipoUsuario('alqui-amigo')}
            disabled={cargando}
          >
            <Text style={[styles.userTypeText, tipoUsuario === 'alqui-amigo' && styles.activeUserTypeText]}>
              Alqui - Amigo
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          placeholderTextColor="#888888"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!cargando}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Contraseña"
            placeholderTextColor="#888888"
            value={contrasena}
            onChangeText={setContrasena}
            secureTextEntry={!mostrarContrasena}
            editable={!cargando}
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setMostrarContrasena(!mostrarContrasena)}
          >
            <Feather name={mostrarContrasena ? 'eye' : 'eye-off'} size={20} color="#666666" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.loginButton, cargando && styles.loginButtonDisabled]}
          onPress={manejarLogin}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={irARegistro} disabled={cargando}>
          <Text style={styles.registerLink}>
            ¿No tienes cuenta?{' '}
            <Text style={styles.registerText}>Regístrate</Text>
          </Text>
        </TouchableOpacity>
      </View>

      <ModalMensaje
        visible={modalVisible}
        titulo={modalDatos.titulo}
        mensaje={modalDatos.mensaje}
        tipo={modalDatos.tipo}
        onClose={cerrarModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007BFF',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 40,
  },
  userTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    backgroundColor: '#E5E5E5',
    marginHorizontal: 5,
    alignItems: 'center',
  },
  activeUserType: {
    backgroundColor: '#007BFF',
  },
  userTypeText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  activeUserTypeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    marginBottom: 15,
    fontSize: 16,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  passwordContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333333',
  },
  eyeIcon: {
    padding: 15,
  },
  loginButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#007BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 50,
  },
  loginButtonDisabled: {
    backgroundColor: '#80BDFF',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerLink: {
    marginTop: 20,
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
  },
  registerText: {
    color: '#007BFF',
    fontWeight: 'bold',
  },
  // Estilos del Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMensaje: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 25,
  },
  modalBoton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBotonTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});