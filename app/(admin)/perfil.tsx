import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { logoutUser } from '../../services/authService';

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

export default function AdminPerfilScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  const abrirModal = () => setModalVisible(true);
  const cerrarModal = () => setModalVisible(false);

  const confirmarSalida = async () => {
    cerrarModal();
    await logoutUser();
    router.replace('/Login/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header simple con título centrado */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Panel Administrador</Text>
      </View>

      <View style={styles.content}>
        
        {/* Icono Grande */}
        <View style={styles.iconContainer}>
          <Feather name="user" size={120} color="#000" />
        </View>

        {/* Texto Indicativo */}
        <Text style={styles.rolTexto}>Usuario: Administrador</Text>

        {/* Botón Cerrar Sesión */}
        <TouchableOpacity style={styles.botonCerrar} onPress={abrirModal}>
          <View style={styles.contenidoBoton}>
            <Feather name="log-out" size={24} color="#FFF" style={{ marginRight: 10 }} />
            <Text style={styles.textoBoton}>Cerrar Sesión</Text>
          </View>
        </TouchableOpacity>

      </View>

      {/* Modal de Confirmación */}
      <LogoutModal 
        visible={modalVisible} 
        onClose={cerrarModal} 
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
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -50,
  },
  iconContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  rolTexto: {
    fontSize: 24,
    color: '#888',
    fontWeight: '500',
    marginBottom: 80,
  },
  botonCerrar: {
    width: '100%',
    backgroundColor: '#D50000',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: "#D50000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  contenidoBoton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textoBoton: {
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
    backgroundColor: '#D50000', // Rojo para alerta de salida
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