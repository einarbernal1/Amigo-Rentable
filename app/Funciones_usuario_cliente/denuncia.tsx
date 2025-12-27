import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore'; 
import { auth, db } from '../../config/firebase'; 
import { enviarDenuncia, DenunciaData } from '../../services/denunciaService';

interface ModalMensajeProps {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'exito' | 'error';
  onClose: () => void;
}

const ModalMensaje: React.FC<ModalMensajeProps> = ({ visible, titulo, mensaje, tipo, onClose }) => {
  const colorFondo = tipo === 'exito' ? '#008FD9' : '#DC3545';

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
              name={tipo === 'exito' ? 'check' : 'alert-triangle'} 
              size={32} 
              color="#FFFFFF" 
            />
          </View>
          <Text style={styles.modalTitulo}>{titulo}</Text>
          <Text style={styles.modalMensaje}>{mensaje}</Text>
          <TouchableOpacity 
            style={[styles.modalBoton, { backgroundColor: colorFondo }]} 
            onPress={onClose}
          >
            <Text style={styles.modalBotonTexto}>Aceptar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function DenunciaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Ahora recibirá estos valores correctamente desde calificar_experiencia.tsx
  const { alquiAmigoId, solicitudId } = params;

  const [datosAmigo, setDatosAmigo] = useState<any>(null); 
  const [loadingDatos, setLoadingDatos] = useState(true);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cargando, setCargando] = useState(false);

  // Estados Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDatos, setModalDatos] = useState({
    titulo: '',
    mensaje: '',
    tipo: 'exito' as 'exito' | 'error',
    accion: () => {}
  });

  // CARGAR DATOS DEL ACUSADO
  useEffect(() => {
    const cargarDatosAcusado = async () => {
      if (!alquiAmigoId) return;
      try {
        const amigoRef = doc(db, 'alqui-amigos', alquiAmigoId as string);
        const amigoSnap = await getDoc(amigoRef);
        
        if (amigoSnap.exists()) {
          setDatosAmigo(amigoSnap.data());
        }
      } catch (error) {
        console.error("Error cargando alqui-amigo denuncia:", error);
      } finally {
        setLoadingDatos(false);
      }
    };
    cargarDatosAcusado();
  }, [alquiAmigoId]);

  const mostrarModal = (titulo: string, mensaje: string, tipo: 'exito' | 'error', accion?: () => void) => {
    setModalDatos({ titulo, mensaje, tipo, accion: accion || (() => {}) });
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    if (modalDatos.accion) modalDatos.accion();
  };

  const enviarReporte = async () => {
    if (!motivoSeleccionado) {
      mostrarModal('Falta el motivo', 'Por favor selecciona un motivo para la denuncia.', 'error');
      return;
    }
    if (!descripcion.trim()) {
      mostrarModal('Falta descripción', 'Por favor detalla brevemente lo sucedido.', 'error');
      return;
    }

    setCargando(true);

    const nuevaDenuncia: DenunciaData = {
      cliente_id: auth.currentUser?.uid || '',
      alqui_amigo_id: alquiAmigoId as string,
      solicitud_id: (solicitudId as string) || '', 
      motivo: motivoSeleccionado,
      descripcion: descripcion,
      fecha_creacion: null as any, 
      estado: 'pendiente'
    };

    const resultado = await enviarDenuncia(nuevaDenuncia);
    
    setCargando(false);

    if (resultado.success) {
      mostrarModal(
        'Denuncia Enviada', 
        'Hemos recibido tu reporte. Nuestro equipo de seguridad lo revisará a la brevedad.', 
        'exito',
        () => router.push('/(tabs)/buscar')
      );
    } else {
      mostrarModal('Error', 'Hubo un problema al enviar el reporte. Intenta más tarde.', 'error');
    }
  };

  const motivos = [
    { id: 'no_presento', label: 'No se\npresentó', icon: 'user-x' },
    { id: 'comportamiento', label: 'Comportamiento\ninapropiado', icon: 'alert-circle' },
    { id: 'insegura', label: 'Situación\ninsegura', icon: 'shield-off' },
    { id: 'ofensivo', label: 'Lenguaje\nofensivo', icon: 'message-square' },
    { id: 'tarde', label: 'Llego muy\ntarde', icon: 'clock' },
    { id: 'otro', label: 'Otro...', icon: 'more-horizontal' },
  ];

  if (loadingDatos) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#008FD9" />
        <Text style={{ marginTop: 10, color: '#666' }}>Cargando datos...</Text>
      </View>
    );
  }

  if (!datosAmigo) return <View style={styles.container}><Text>No se encontró el usuario.</Text></View>;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.botonAtras}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Denuncia / Queja</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.seccionTitulo}>Información del Alqui-Amigo</Text>
        
        {/* Tarjeta de Información */}
        <View style={styles.cardInfo}>
          <View style={styles.avatarBorder}>
            {datosAmigo.fotoURL ? (
              <Image source={{ uri: datosAmigo.fotoURL }} style={styles.avatar} />
            ) : (
              <Feather name="user" size={40} color="#555" />
            )}
          </View>
          <View style={styles.textosInfo}>
            <Text style={styles.nombreInfo}>{datosAmigo.nombres}</Text>
            <View style={styles.filaIcono}>
              <Feather name="phone" size={14} color="#666" />
              <Text style={styles.detalleInfo}> {datosAmigo.telefono || '+591 No disponible'}</Text>
            </View>
            <View style={styles.filaIcono}>
              <Feather name="star" size={14} color="#FFD700" />
              <Text style={styles.detalleInfo}> {datosAmigo.rating ? Number(datosAmigo.rating).toFixed(1) : 'N/A'}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.seccionTitulo}>Motivo de la denuncia</Text>

        {/* Grid de Motivos */}
        <View style={styles.gridMotivos}>
          {motivos.map((m) => {
            const isSelected = motivoSeleccionado === m.label; 
            return (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.botonMotivo, 
                  isSelected && styles.botonMotivoSelected
                ]}
                onPress={() => setMotivoSeleccionado(m.label)}
              >
                <Feather 
                  name={m.icon as any} 
                  size={24} 
                  color={isSelected ? '#FFF' : '#008FD9'} 
                  style={{ marginBottom: 5 }}
                />
                <Text style={[
                  styles.textoMotivo,
                  isSelected && styles.textoMotivoSelected
                ]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.seccionTitulo}>Descripción</Text>
        <View style={styles.textAreaContainer}>
          <TextInput
            style={styles.textArea}
            placeholder="Ejemplo: Nos citamos en X lugar a las 18:00 y no llego..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            value={descripcion}
            onChangeText={setDescripcion}
          />
        </View>

        <TouchableOpacity 
          style={[styles.botonEnviar, cargando && styles.botonDeshabilitado]}
          onPress={enviarReporte}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.textoBotonEnviar}>Enviar Denuncia</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Modal */}
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
  // TUS ESTILOS IGUALES AL ORIGINAL
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  botonAtras: { padding: 5 },
  scrollContent: { padding: 20, paddingBottom: 50 },
  seccionTitulo: { fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 10, marginTop: 10 },
  cardInfo: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 20 },
  avatarBorder: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#000', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', overflow: 'hidden', marginRight: 15 },
  avatar: { width: '100%', height: '100%' },
  textosInfo: { flex: 1 },
  nombreInfo: { fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 5 },
  filaIcono: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  detalleInfo: { fontSize: 14, color: '#666' },
  gridMotivos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
  botonMotivo: { width: '48%', backgroundColor: '#E0F0FF', borderRadius: 10, paddingVertical: 15, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#008FD9' },
  botonMotivoSelected: { backgroundColor: '#008FD9' },
  textoMotivo: { fontSize: 13, color: '#000', textAlign: 'center', marginTop: 5, fontWeight: '500' },
  textoMotivoSelected: { color: '#FFFFFF', fontWeight: 'bold' },
  textAreaContainer: { backgroundColor: '#F0F0F0', borderRadius: 10, padding: 10, height: 120, marginBottom: 25 },
  textArea: { flex: 1, fontSize: 15, color: '#333' },
  botonEnviar: { backgroundColor: '#D50000', borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  botonDeshabilitado: { backgroundColor: '#E57373' },
  textoBotonEnviar: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 15, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalIconContainer: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { fontSize: 22, fontWeight: 'bold', color: '#333333', marginBottom: 12, textAlign: 'center' },
  modalMensaje: { fontSize: 16, color: '#666666', textAlign: 'center', lineHeight: 24, marginBottom: 25 },
  modalBoton: { width: '100%', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalBotonTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});