import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Linking,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Modal,
  StatusBar
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// --- COMPONENTE MODAL (Reutilizable) ---
interface ModalMensajeProps {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'exito' | 'error';
  onClose: () => void;
}

const ModalMensaje: React.FC<ModalMensajeProps> = ({ visible, titulo, mensaje, tipo, onClose }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={[
            styles.modalIconContainer, 
            { backgroundColor: tipo === 'exito' ? '#28a745' : '#dc3545' }
          ]}>
            <Feather 
              name={tipo === 'exito' ? 'check' : 'x'} 
              size={32} 
              color="#FFFFFF" 
            />
          </View>
          <Text style={styles.modalTitulo}>{titulo}</Text>
          <Text style={styles.modalMensaje}>{mensaje}</Text>
          <TouchableOpacity style={[
            styles.modalBoton,
            { backgroundColor: tipo === 'exito' ? '#28a745' : '#dc3545' }
          ]} onPress={onClose}>
            <Text style={styles.modalBotonTexto}>Aceptar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function UbicacionAlquiAmigoScreen() {
  // Inicializamos router para poder navegar (si necesitas botón atrás)
  const router = useRouter(); 
  
  const [telefono, setTelefono] = useState('');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [cargando, setCargando] = useState(true);
  
  // Estados para el Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDatos, setModalDatos] = useState({
    titulo: '',
    mensaje: '',
    tipo: 'error' as 'exito' | 'error',
    accion: () => {}
  });

  const initialRegion = {
    latitude: -17.393835,
    longitude: -66.156946,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  useEffect(() => {
    obtenerUbicacion();
  }, []);

  const mostrarModal = (titulo: string, mensaje: string, tipo: 'exito' | 'error', accion?: () => void) => {
    setModalDatos({
      titulo,
      mensaje,
      tipo,
      accion: accion || (() => {})
    });
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    if (modalDatos.accion) {
      modalDatos.accion();
    }
  };

  const obtenerUbicacion = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      mostrarModal('Permiso denegado', 'Necesitamos acceso a tu ubicación para compartirla.', 'error');
      setCargando(false);
      return;
    }

    let location = await Location.getCurrentPositionAsync({});
    setLocation(location);
    setCargando(false);
  };

  const compartirWhatsApp = () => {
    if (!telefono || telefono.length < 8) {
      mostrarModal('Número inválido', 'Por favor ingresa un número de teléfono válido.', 'error');
      return;
    }

    if (!location) {
      mostrarModal('Ubicación no lista', 'Aún estamos obteniendo tu ubicación exacta. Espera un momento.', 'error');
      return;
    }

    const lat = location.coords.latitude;
    const long = location.coords.longitude;
    // Generamos enlace directo a Google Maps
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${long}`;
    
    const mensaje = `Hola, estoy compartiendo mi ubicación en tiempo real contigo: ${mapsUrl}`;
    
    // Limpiamos el número
    let numeroFinal = telefono.replace(/\s/g, ''); 
    
    const url = `whatsapp://send?phone=${numeroFinal}&text=${encodeURIComponent(mensaje)}`;

    Linking.openURL(url).catch(() => {
      mostrarModal('Error', 'No pudimos abrir WhatsApp. Verifica que esté instalado.', 'error');
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        
        {/* HEADER SIMPLE (Sin foto de perfil) */}
        <View style={styles.header}>
          {/* Si quieres botón de atrás, descomenta esto: */}
          {/* <TouchableOpacity onPress={() => router.back()} style={{position: 'absolute', left: 20, top: 60, zIndex: 10}}>
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity> */}
          
          <Text style={styles.headerTitle}>Compartir Ubicación</Text>
        </View>

        <View style={styles.content}>
          {/* Descripción */}
          <Text style={styles.description}>
            Comparte tu ubicación en tiempo real con un contacto de confianza para mayor seguridad durante tus encuentros.
          </Text>

          {/* Input Teléfono */}
          <Text style={styles.labelInput}>Número de teléfono del contacto</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej. +591 77788999"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={setTelefono}
          />

          {/* Botón Compartir */}
          <TouchableOpacity style={styles.shareButton} onPress={compartirWhatsApp}>
            <Feather name="share-2" size={20} color="#FFF" style={{ marginRight: 10 }} />
            <Text style={styles.shareButtonText}>Compartir Ubicación</Text>
          </TouchableOpacity>

          {/* Mapa */}
          <View style={styles.mapContainer}>
            {cargando ? (
              <ActivityIndicator size="large" color="#007BFF" style={{ marginTop: 50 }} />
            ) : (
              <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                initialRegion={initialRegion}
                region={location ? {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                } : undefined}
                showsUserLocation={true}
                showsMyLocationButton={true}
              >
                {location && (
                  <Marker
                    coordinate={{
                      latitude: location.coords.latitude,
                      longitude: location.coords.longitude,
                    }}
                    title="Tu ubicación"
                    description="Aquí te encuentras ahora"
                  />
                )}
              </MapView>
            )}
            
            {/* Controles Zoom (Visuales) */}
            <View style={styles.zoomControls}>
              <View style={styles.zoomButton}>
                <Feather name="plus" size={24} color="#333" />
              </View>
              <View style={[styles.zoomButton, { marginTop: 1 }]}>
                <Feather name="minus" size={24} color="#333" />
              </View>
            </View>

            {/* Botón Navegación (Visual) */}
            <View style={styles.navButton}>
              <Feather name="navigation" size={24} color="#333" />
            </View>
          </View>
        </View>

        {/* Componente Modal */}
        <ModalMensaje
          visible={modalVisible}
          titulo={modalDatos.titulo}
          mensaje={modalDatos.mensaje}
          tipo={modalDatos.tipo}
          onClose={cerrarModal}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  // --- ESTILOS DEL HEADER (SIMPLIFICADO) ---
  header: {
    height: 100, // Altura fija para el header
    justifyContent: 'flex-end', // Alinear contenido abajo (cerca del borde)
    alignItems: 'center',
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
  },
  
  description: {
    paddingHorizontal: 20,
    paddingTop: 20,
    color: '#666',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  labelInput: {
    paddingHorizontal: 20,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  input: {
    marginHorizontal: 20,
    backgroundColor: '#EEE',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#000',
    marginBottom: 20,
  },
  shareButton: {
    marginHorizontal: 20,
    backgroundColor: '#008FD9',
    borderRadius: 10,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  zoomControls: {
    position: 'absolute',
    right: 15,
    bottom: 60,
    borderRadius: 8,
    backgroundColor: '#FFF',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  zoomButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  navButton: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    width: 40,
    height: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
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