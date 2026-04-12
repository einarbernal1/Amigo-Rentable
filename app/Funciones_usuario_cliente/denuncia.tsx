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
          <Text style={styles.modalTitulo} allowFontScaling={false}>{titulo}</Text>
          <Text style={styles.modalMensaje} allowFontScaling={false}>{mensaje}</Text>
          <TouchableOpacity 
            style={[styles.modalBoton, { backgroundColor: colorFondo }]} 
            onPress={onClose}
          >
            <Text style={styles.modalBotonTexto} allowFontScaling={false}>Aceptar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function DenunciaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const { alquiAmigoId, solicitudId } = params;

  const [datosAmigo, setDatosAmigo] = useState<any>(null); 
  const [loadingDatos, setLoadingDatos] = useState(true);
  
  // CAMBIO 1: El estado ahora es un arreglo vacío
  const [motivosSeleccionados, setMotivosSeleccionados] = useState<string[]>([]);
  
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
        // Obtener datos base de 'usuarios'
        const usuarioRef = doc(db, 'usuarios', alquiAmigoId as string);
        const usuarioSnap = await getDoc(usuarioRef);
        
        if (usuarioSnap.exists()) {
          const uData = usuarioSnap.data();
          // Obtener rating de 'amigos'
          const amigoRef = doc(db, 'amigos', alquiAmigoId as string);
          const amigoSnap = await getDoc(amigoRef);
          const aData = amigoSnap.exists() ? amigoSnap.data() : {};
          
          setDatosAmigo({
            nombres: `${uData.nombres} ${uData.apellidos || ''}`.trim(),
            fotoURL: uData.fotografia || '',
            telefono: uData.nro_telefonico || '',
            rating: aData.calificacion || 0
          });
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

  // CAMBIO 2: Función para seleccionar/deseleccionar motivos
  const toggleMotivo = (motivoLabel: string) => {
    if (motivosSeleccionados.includes(motivoLabel)) {
      // Si ya está, lo quitamos
      setMotivosSeleccionados(motivosSeleccionados.filter(m => m !== motivoLabel));
    } else {
      // Si no está, lo agregamos
      setMotivosSeleccionados([...motivosSeleccionados, motivoLabel]);
    }
  };

  const enviarReporte = async () => {
    // CAMBIO 3: Validar que el arreglo no esté vacío
    if (motivosSeleccionados.length === 0) {
      mostrarModal('Falta el motivo', 'Por favor selecciona al menos un motivo para la denuncia.', 'error');
      return;
    }
    if (!descripcion.trim()) {
      mostrarModal('Falta descripción', 'Por favor detalla brevemente lo sucedido.', 'error');
      return;
    }

    setCargando(true);

    const nuevaDenuncia: DenunciaData = {
      cliente_id: auth.currentUser?.uid || '',
      amigo_id: alquiAmigoId as string,
      solicitud_id: (solicitudId as string) || '', 
      motivo: motivosSeleccionados,
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
        <Text style={{ marginTop: 10, color: '#666' }} allowFontScaling={false}>Cargando datos...</Text>
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
        <Text style={styles.headerTitle} allowFontScaling={false}>Denuncia / Queja</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.seccionTitulo} allowFontScaling={false}>Información del Alqui-Amigo</Text>
        
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
            <Text style={styles.nombreInfo} allowFontScaling={false}>{datosAmigo.nombres}</Text>
            <View style={styles.filaIcono}>
              <Feather name="phone" size={14} color="#666" />
              <Text style={styles.detalleInfo} allowFontScaling={false}> {datosAmigo.telefono || '+591 No disponible'}</Text>
            </View>
            <View style={styles.filaIcono}>
              <Feather name="star" size={14} color="#FFD700" />
              <Text style={styles.detalleInfo} allowFontScaling={false}> {datosAmigo.rating ? Number(datosAmigo.rating).toFixed(1) : 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* CAMBIO VISUAL: Texto indicando que puede seleccionar varios */}
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
           <Text style={styles.seccionTitulo} allowFontScaling={false}>Motivo de la denuncia</Text>
           <Text style={{color: '#999', fontSize: 12, marginTop: 5}} allowFontScaling={false}>(Selecciona uno o más)</Text>
        </View>

        {/* Grid de Motivos */}
        <View style={styles.gridMotivos}>
          {motivos.map((m) => {
            // CAMBIO 4: Verificamos si la lista incluye este motivo
            const isSelected = motivosSeleccionados.includes(m.label); 
            return (
              <TouchableOpacity
                key={m.id}
                style={[
                  styles.botonMotivo, 
                  isSelected && styles.botonMotivoSelected
                ]}
                onPress={() => toggleMotivo(m.label)} // Llama a la función toggle
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
                ]} allowFontScaling={false}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.seccionTitulo} allowFontScaling={false}>Descripción</Text>
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
            <Text style={styles.textoBotonEnviar} allowFontScaling={false}>Enviar Denuncia</Text>
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
  gridMotivos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  botonMotivo: { width: '48%', backgroundColor: '#E0F0FF', borderRadius: 10, paddingVertical: 11, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 7, borderWidth: 1, borderColor: '#008FD9' },
  botonMotivoSelected: { backgroundColor: '#008FD9' },
  textoMotivo: { fontSize: 13, color: '#000', textAlign: 'center', marginTop: 5, fontWeight: '500' },
  textoMotivoSelected: { color: '#FFFFFF', fontWeight: 'bold' },
  textAreaContainer: { backgroundColor: '#F0F0F0', borderRadius: 10, padding: 10, height: 100, marginBottom: 20 },
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