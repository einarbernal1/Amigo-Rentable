import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore'; 
import { auth, db } from '../../config/firebase'; 
import { enviarCalificacion, CalificacionData } from '../../services/calificacionService';

// --- COMPONENTE MODAL PERSONALIZADO ---
interface ModalMensajeProps {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'exito' | 'error';
  onClose: () => void;
}

const ModalMensaje: React.FC<ModalMensajeProps> = ({ visible, titulo, mensaje, tipo, onClose }) => {
  const colorFondo = tipo === 'exito' ? '#008FD9' : '#DC3545'; // Azul o Rojo

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

export default function CalificarExperienciaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const { solicitudId } = params;

  const [estrellas, setEstrellas] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true); 
  const [datosCompleto, setDatosCompleto] = useState<any>(null);

  // Estados del Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDatos, setModalDatos] = useState({
    titulo: '',
    mensaje: '',
    tipo: 'exito' as 'exito' | 'error',
    accion: () => {}
  });

  useEffect(() => {
    const cargarInformacion = async () => {
      if (!solicitudId) return;

      try {
        // A) Buscar la solicitud
        const solRef = doc(db, 'solicitudes', solicitudId as string);
        const solSnap = await getDoc(solRef);

        if (solSnap.exists()) {
          const solData = solSnap.data();
          const amigoId = solData.alqui_amigo_id;

          // B) Buscar al Alqui-Amigo
          const amigoRef = doc(db, 'alqui-amigos', amigoId);
          const amigoSnap = await getDoc(amigoRef);
          
          let datosAmigo = {
            nombres: 'Usuario',
            fotoURL: '',
            rating: 0,
            telefono: ''
          };

          if (amigoSnap.exists()) {
            const d = amigoSnap.data();
            datosAmigo = {
              nombres: d.nombres || 'Usuario',
              fotoURL: d.fotoURL || '', // Aquí guardamos fotoURL
              rating: d.rating || 0,
              telefono: d.telefono || ''
            };
          }

          setDatosCompleto({
            id: solSnap.id,
            alqui_amigo_id: amigoId,
            lugar: solData.lugar_asistir,
            fecha: solData.fecha_salida,
            duracion: solData.duracion,
            ...datosAmigo // Unimos nombres y fotoURL al objeto final
          });
        }
      } catch (error) {
        console.error("Error cargando datos calificar:", error);
      } finally {
        setCargandoDatos(false);
      }
    };

    cargarInformacion();
  }, [solicitudId]);

  const mostrarModal = (titulo: string, mensaje: string, tipo: 'exito' | 'error', accion?: () => void) => {
    setModalDatos({ titulo, mensaje, tipo, accion: accion || (() => {}) });
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    if (modalDatos.accion) {
      modalDatos.accion();
    }
  };

  const manejarCalificacion = async () => {
    if (estrellas === 0) {
      mostrarModal(
        "Calificación requerida", 
        "Por favor selecciona al menos una estrella para calificar la experiencia.", 
        'error'
      );
      return;
    }

    if (!datosCompleto) return;

    setCargando(true);

    const datosCalificacion: CalificacionData = {
      solicitud_id: datosCompleto.id,
      alqui_amigo_id: datosCompleto.alqui_amigo_id,
      cliente_id: auth.currentUser?.uid || '',
      estrellas: estrellas,
      fecha_calificacion: null as any
    };

    const resultado = await enviarCalificacion(datosCalificacion);

    setCargando(false);

    if (resultado.success) {
      mostrarModal(
        "¡Gracias!",
        "Tu calificación ha sido enviada correctamente.",
        'exito',
        () => router.push('/(tabs)/solicitudes')
      );
    } else {
      mostrarModal("Error", "No se pudo enviar la calificación. Intenta nuevamente.", 'error');
    }
  };

  const reportarQueja = () => {
    if (!datosCompleto) return;

    // CORRECCIÓN: Enviamos IDs limpios, no JSON
    router.push({
      pathname: '/Funciones_usuario_cliente/denuncia',
      params: { 
        alquiAmigoId: datosCompleto.alqui_amigo_id,
        solicitudId: datosCompleto.id 
      }
    });
  };

  // PANTALLA DE CARGA
  if (cargandoDatos) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#008FD9" />
        <Text style={{ marginTop: 10, color: '#666' }}>Cargando datos...</Text>
      </View>
    );
  }

  // SI FALLÓ LA CARGA
  if (!datosCompleto) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={50} color="#DC3545" />
        <Text style={{ marginTop: 10, color: '#666' }}>No se encontró la información.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
           <Text style={{ color: '#008FD9', fontWeight: 'bold' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.botonAtras}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calificar Experiencia</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Perfil - CORREGIDO: Usamos .fotoURL y .nombres */}
        <View style={styles.perfilContainer}>
          <View style={styles.avatarBorder}>
            {datosCompleto.fotoURL ? (
              <Image source={{ uri: datosCompleto.fotoURL }} style={styles.avatar} />
            ) : (
              <Feather name="user" size={50} color="#555" />
            )}
          </View>
          <Text style={styles.nombreUsuario}>{datosCompleto.nombres}</Text>
          <Text style={styles.rolUsuario}>Usuario: Alqui-Amigo</Text>
        </View>

        {/* Detalles */}
        <Text style={styles.seccionTitulo}>Detalles de la Salida</Text>
        <View style={styles.detallesCard}>
          <View style={styles.filaDetalle}>
            <Text style={styles.labelDetalle}>Lugar:</Text>
            <Text style={styles.valorDetalle}>{datosCompleto.lugar}</Text>
          </View>
          <View style={styles.filaDetalle}>
            <Text style={styles.labelDetalle}>Actividad:</Text>
            <Text style={styles.valorDetalle}>Salida Programada</Text>
          </View>
          <View style={styles.filaDetalle}>
            <Text style={styles.labelDetalle}>Fecha:</Text>
            <Text style={styles.valorDetalle}>{datosCompleto.fecha}</Text>
          </View>
          <View style={styles.filaDetalle}>
            <Text style={styles.labelDetalle}>Duración:</Text>
            <Text style={styles.valorDetalle}>{datosCompleto.duracion}h</Text>
          </View>
        </View>

        {/* Estrellas */}
        <Text style={styles.seccionTitulo}>Tu Calificación</Text>
        <View style={styles.estrellasContainer}>
          {[1, 2, 3, 4, 5].map((valor) => (
            <TouchableOpacity 
              key={valor} 
              onPress={() => setEstrellas(valor)}
              style={styles.estrellaTouch}
            >
              <FontAwesome 
                name={estrellas >= valor ? "star" : "star-o"} 
                size={45} 
                color={estrellas >= valor ? "#FFD700" : "#CCCCCC"} 
              />
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.textoCalificacion}>
          {estrellas > 0 ? `${estrellas}.0 de 5` : 'Toca las estrellas'}
        </Text>

        {/* Botones */}
        <TouchableOpacity 
          style={[styles.botonEnviar, cargando && styles.botonDeshabilitado]} 
          onPress={manejarCalificacion}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.textoBotonEnviar}>Enviar Calificación</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.botonQueja} onPress={reportarQueja}>
          <Text style={styles.textoBotonQueja}>Reportar Queja</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* MODAL INTEGRADO */}
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
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  botonAtras: { padding: 5 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50, alignItems: 'center' },
  perfilContainer: { alignItems: 'center', marginTop: 10, marginBottom: 30 },
  avatarBorder: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#000', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F0F0', overflow: 'hidden', marginBottom: 10 },
  avatar: { width: '100%', height: '100%' },
  nombreUsuario: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  rolUsuario: { fontSize: 14, color: '#888', marginTop: 2 },
  seccionTitulo: { alignSelf: 'flex-start', fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 10, marginTop: 10 },
  detallesCard: { width: '100%', backgroundColor: '#F5F5F5', borderRadius: 12, padding: 20, marginBottom: 20 },
  filaDetalle: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  labelDetalle: { fontSize: 15, color: '#888', fontWeight: '500' },
  valorDetalle: { fontSize: 15, color: '#000', fontWeight: '600' },
  estrellasContainer: { flexDirection: 'row', justifyContent: 'center', width: '100%', backgroundColor: '#F9F9F9', paddingVertical: 15, borderRadius: 12, marginBottom: 10 },
  estrellaTouch: { paddingHorizontal: 5 },
  textoCalificacion: { fontSize: 16, color: '#666', marginBottom: 30 },
  botonEnviar: { width: '100%', backgroundColor: '#008FD9', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginBottom: 15 },
  botonDeshabilitado: { backgroundColor: '#80BDFF' },
  textoBotonEnviar: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  botonQueja: { width: '100%', backgroundColor: '#D50000', borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  textoBotonQueja: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 15, padding: 25, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  modalIconContainer: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { fontSize: 22, fontWeight: 'bold', color: '#333333', marginBottom: 12, textAlign: 'center' },
  modalMensaje: { fontSize: 16, color: '#666666', textAlign: 'center', lineHeight: 24, marginBottom: 25 },
  modalBoton: { width: '100%', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalBotonTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});