import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { auth } from '../../config/firebase';
import { getUserData, logoutUser } from '../../services/authService';

// --- COMPONENTE MODAL DE CONFIRMACIÓN DE SALIDA ---
interface LogoutModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({ visible, onClose, onConfirm }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalIconContainer}>
            <Feather name="log-out" size={32} color="#FFFFFF" />
          </View>
          
          <Text style={styles.modalTitulo}>Cerrar Sesión</Text>
          <Text style={styles.modalMensaje}>¿Estás seguro que deseas salir de la aplicación?</Text>
          
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.modalBoton, styles.botonCancelar]} 
              onPress={onClose}
            >
              <Text style={styles.textoCancelar}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalBoton, styles.botonSalir]} 
              onPress={onConfirm}
            >
              <Text style={styles.textoSalir}>Sí, Salir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface UserProfile {
  nombres: string;
  fotoURL: string;
  descripcion: string;
  email: string;
}

export default function PerfilScreen() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [cargando, setCargando] = useState(true);
  
  // Estado para controlar el modal
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const data = await getUserData(user.uid, 'cliente');
        if (data) {
          setPerfil({
            nombres: data.nombres || 'Usuario',
            fotoURL: data.fotoURL || '',
            descripcion: data.descripcion || 'Sin descripción disponible.',
            email: data.email || ''
          });
        }
      }
    } catch (error) {
      console.error('Error al cargar perfil:', error);
      Alert.alert('Error', 'No se pudo cargar la información del perfil.');
    } finally {
      setCargando(false);
    }
  };

  // Función que abre el modal
  const manejarCerrarSesion = () => {
    setModalVisible(true);
  };

  // Función que ejecuta el logout real
  const confirmarSalida = async () => {
    setModalVisible(false); // Cerramos el modal primero
    try {
      await logoutUser();
      router.replace('/Login/login');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Hubo un problema al cerrar sesión.');
    }
  };

  if (cargando) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Simple con Flecha */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.botonAtras}>
          <Feather name="arrow-left" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={{ width: 28 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Foto de Perfil Grande */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarBorder}>
            {perfil?.fotoURL ? (
              <Image source={{ uri: perfil.fotoURL }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Feather name="user" size={80} color="#555" />
              </View>
            )}
          </View>
        </View>

        {/* Nombre y Tipo de Usuario */}
        <Text style={styles.nombreUsuario}>{perfil?.nombres}</Text>
        <Text style={styles.tipoUsuario}>Usuario: Cliente</Text>

        {/* Sección Acerca de mi */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Acerca de mi:</Text>
          <Text style={styles.descripcionTexto}>
            {perfil?.descripcion}
          </Text>
        </View>

      </ScrollView>

      {/* Botón Cerrar Sesión (Footer) */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.botonCerrarSesion} onPress={manejarCerrarSesion}>
          <View style={styles.contenidoBoton}>
            <Feather name="log-out" size={24} color="#FFFFFF" style={{ marginRight: 10 }} />
            <Text style={styles.textoCerrarSesion}>Cerrar Sesión</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Modal de Confirmación */}
      <LogoutModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        onConfirm={confirmarSalida} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  botonAtras: {
    padding: 5,
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingTop: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  avatarBorder: {
    width: 165,
    height: 165,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  nombreUsuario: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 5,
  },
  tipoUsuario: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '500',
  },
  infoSection: {
    width: '100%',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 10,
  },
  descripcionTexto: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
    textAlign: 'left',
  },
  footer: {
    padding: 30,
    paddingBottom: 95,
  },
  botonCerrarSesion: {
    backgroundColor: '#D50000',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: "#D50000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  contenidoBoton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoCerrarSesion: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // --- ESTILOS DEL MODAL ---
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
    backgroundColor: '#D50000', // Rojo alerta
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  modalBoton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  botonCancelar: {
    backgroundColor: '#EEEEEE',
  },
  botonSalir: {
    backgroundColor: '#D50000',
  },
  textoCancelar: {
    color: '#555555',
    fontSize: 16,
    fontWeight: 'bold',
  },
  textoSalir: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});