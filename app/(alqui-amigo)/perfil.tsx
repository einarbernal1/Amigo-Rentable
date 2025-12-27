import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  ActivityIndicator
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather, FontAwesome } from '@expo/vector-icons';
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

// Orden para mostrar los días
const ORDEN_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export default function PerfilAlquiAmigoScreen() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  
  // Estado para el modal
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      cargarPerfil();
    }, [])
  );

  const cargarPerfil = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const data = await getUserData(user.uid, 'alqui-amigo');
        setPerfil(data);
      }
    } catch (error) {
      console.error('Error al cargar perfil:', error);
    } finally {
      setCargando(false);
    }
  };

  // Abrir el modal en lugar del Alert
  const manejarCerrarSesion = () => {
    setModalVisible(true);
  };

  // Confirmar salida
  const confirmarSalida = async () => {
    setModalVisible(false);
    await logoutUser();
    router.replace('/Login/login');
  };

  const manejarEditar = () => {
    router.push('/(alqui-amigo)/editar_perfil');
  };

  const renderEstrellas = (rating: number) => {
    const estrellas = [];
    for (let i = 1; i <= 5; i++) {
      estrellas.push(
        <FontAwesome 
          key={i} 
          name={rating >= i ? "star" : (rating >= i - 0.5 ? "star-half-empty" : "star-o")} 
          size={24} 
          color="#FFD700" 
          style={{ marginHorizontal: 2 }}
        />
      );
    }
    return estrellas;
  };

  const renderHorarios = () => {
    if (!perfil?.disponibilidadHoraria) return <Text style={styles.textoNormal}>No hay horarios configurados.</Text>;

    return ORDEN_DIAS.map((dia) => {
      const horario = perfil.disponibilidadHoraria[dia];
      if (!horario) return null;

      const nombreDia = dia.charAt(0).toUpperCase() + dia.slice(1);

      return (
        <View key={dia} style={styles.filaHorario}>
          <Text style={styles.textoDia}>{nombreDia}</Text>
          <Text style={styles.textoHora}>
            {horario.inicio} - {horario.fin}
          </Text>
        </View>
      );
    });
  };

  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#008FD9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Simple */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil de Alqui - Amigo</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* AVATAR */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarBorder}>
            {perfil?.fotoURL ? (
              <Image source={{ uri: perfil.fotoURL }} style={styles.avatar} />
            ) : (
              <Feather name="user" size={60} color="#555" />
            )}
          </View>
        </View>

        {/* NOMBRE Y ROL */}
        <Text style={styles.nombreUsuario}>{perfil?.nombres || 'Usuario'}</Text>
        <Text style={styles.rolUsuario}>Usuario: Alqui-Amigo</Text>

        {/* ACERCA DE MI */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Acerca de mi:</Text>
          <Text style={styles.descripcionTexto}>
            {perfil?.descripcion || "Sin descripción."}
          </Text>
        </View>

        {/* VALORACIÓN */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Valoración:</Text>
          <View style={styles.ratingContainer}>
            {renderEstrellas(perfil?.rating || 0)}
            <Text style={styles.ratingNumero}> {perfil?.rating ? Number(perfil.rating).toFixed(1) : '0.0'}</Text>
          </View>
        </View>

        {/* HORARIOS */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Mis Horarios:</Text>
          <View style={styles.tablaHorarios}>
            {renderHorarios()}
          </View>
        </View>

        {/* BOTONES DE ACCIÓN */}
        <View style={styles.botonesContainer}>
          <TouchableOpacity style={styles.botonEditar} onPress={manejarEditar}>
            <Text style={styles.textoBotonEditar}>Editar Perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.botonCerrar} onPress={manejarCerrarSesion}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Feather name="log-out" size={20} color="#FFF" style={{marginRight: 8}} />
              <Text style={styles.textoBotonCerrar}>Cerrar Sesión</Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollContent: {
    padding: 25,
    paddingBottom: 50,
  },
  
  // AVATAR
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarBorder: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 4,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  nombreUsuario: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 5,
  },
  rolUsuario: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 30,
  },

  // SECCIONES
  seccion: {
    marginBottom: 25,
  },
  tituloSeccion: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  descripcionTexto: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
    textAlign: 'justify',
  },
  textoNormal: {
    fontSize: 15,
    color: '#666',
  },

  // RATING
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700', // Dorado
    marginLeft: 10,
  },

  // HORARIOS
  tablaHorarios: {
    marginTop: 5,
  },
  filaHorario: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: 5,
  },
  textoDia: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  textoHora: {
    fontSize: 16,
    color: '#666',
  },

  // BOTONES
  botonesContainer: {
    marginTop: 20,
    gap: 15,
  },
  botonEditar: {
    backgroundColor: '#008FD9', // Azul
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  textoBotonEditar: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botonCerrar: {
    backgroundColor: '#D50000', // Rojo
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  textoBotonCerrar: {
    color: '#FFF',
    fontSize: 16,
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