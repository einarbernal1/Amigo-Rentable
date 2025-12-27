import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
  Modal, // Importamos Modal nativo
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth } from '../../config/firebase';
import { getUserData } from '../../services/authService';
import { enviarSolicitudServicio, NuevaSolicitud } from '../../services/solicitudesService';

// --- 1. COMPONENTE MODAL PERSONALIZADO ---
interface ModalMensajeProps {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'exito' | 'error';
  onClose: () => void;
}

const ModalMensaje: React.FC<ModalMensajeProps> = ({ visible, titulo, mensaje, tipo, onClose }) => {
  // Definimos colores: Azul para éxito, Rojo para error
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
          {/* Icono superior con el color dinámico */}
          <View style={[styles.modalIconContainer, { backgroundColor: colorFondo }]}>
            <Feather 
              name={tipo === 'exito' ? 'check' : 'x'} 
              size={32} 
              color="#FFFFFF" 
            />
          </View>
          
          <Text style={styles.modalTitulo}>{titulo}</Text>
          <Text style={styles.modalMensaje}>{mensaje}</Text>
          
          {/* Botón con el color dinámico */}
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

export default function EnviarSolicitudScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const { uid } = params;
  const [alquiAmigo, setAlquiAmigo] = useState<any>(null);

  // Estados del formulario
  const [fecha, setFecha] = useState(new Date());
  const [hora, setHora] = useState(new Date());
  const [duracion, setDuracion] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  
  const [mostrarFecha, setMostrarFecha] = useState(false);
  const [mostrarHora, setMostrarHora] = useState(false);

  const [cargando, setCargando] = useState(false);
  const [clienteData, setClienteData] = useState<any>(null);

  // --- 2. ESTADOS DEL MODAL ---
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDatos, setModalDatos] = useState({
    titulo: '',
    mensaje: '',
    tipo: 'exito' as 'exito' | 'error', // Tipo por defecto
    accion: () => {} // Acción al cerrar (opcional)
  });

  useEffect(() => {
    cargarDatosCliente();
    cargarDatosAlquiAmigoDestino();
  }, []);

  // Función auxiliar para mostrar el modal
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

  const cargarDatosCliente = async () => {
    const user = auth.currentUser;
    if (user) {
      const datos = await getUserData(user.uid, 'cliente');
      setClienteData(datos);
    }
  };

  const cargarDatosAlquiAmigoDestino = async () => {
    if (uid) {
        // Descargamos datos frescos del Alqui-Amigo
        const datos = await getUserData(uid as string, 'alqui-amigo');
        setAlquiAmigo(datos);
    }
  };

  const manejarEnvio = async () => {
    // Validación de campos con Modal Rojo
    if (!ubicacion || !mensaje || !duracion) {
      mostrarModal(
        "Campos incompletos", 
        "Por favor asegúrate de llenar la ubicación, duración y mensaje para el Alqui-Amigo.", 
        'error'
      );
      return;
    }

    if (!clienteData) {
      mostrarModal("Error de Usuario", "No pudimos identificar tu sesión. Intenta reconectar.", 'error');
      return;
    }

    setCargando(true);

    const nuevaSolicitud: NuevaSolicitud = {
      cliente_id: auth.currentUser?.uid || '',
      alqui_amigo_id: alquiAmigo.uid,
      nombre_solicitante: clienteData.nombres,
      fotografia_solicitante: clienteData.fotoURL || '',
      informacion_general_solicitante: `Edad: ${calcularEdad(clienteData.fechaNacimiento)} años`,
      fecha_salida: fecha.toISOString().split('T')[0],
      hora_salida: formatoHora(hora),
      duracion: parseInt(duracion),
      lugar_asistir: ubicacion,
      detalles_de_la_salida: mensaje,
      estado_solicitud: 'pendiente',
      fecha_creacion: null as any
    };

    const resultado = await enviarSolicitudServicio(nuevaSolicitud);

    setCargando(false);

    if (resultado.success) {
      // Éxito con Modal Azul
      mostrarModal(
        "¡Solicitud Enviada!",
        "Tu solicitud ha sido registrada exitosamente. Puedes ver el estado en tu historial.",
        'exito',
        () => router.push('/(tabs)/buscar') // Al cerrar el modal, nos vamos al inicio
      );
    } else {
      // Error de servidor con Modal Rojo
      mostrarModal("Error", "Hubo un problema al conectar con el servidor. Intenta más tarde.", 'error');
    }
  };

  const calcularEdad = (fecha: string) => {
    if(!fecha) return '?';
    const hoy = new Date();
    const nacimiento = new Date(fecha);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  };

  const formatoHora = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatoFecha = (date: Date) => {
    return date.toLocaleDateString();
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setMostrarFecha(false);
    if (selectedDate) setFecha(selectedDate);
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setMostrarHora(false);
    if (selectedDate) setHora(selectedDate);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.botonAtras}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enviar Solicitud</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Tarjeta del Alqui-Amigo Destino */}
        <View style={styles.tarjetaDestino}>
          <View style={styles.avatarBorder}>
            {alquiAmigo?.fotoURL ? (
              <Image source={{ uri: alquiAmigo.fotoURL }} style={styles.avatar} />
            ) : (
              <Feather name="user" size={30} color="#555" />
            )}
          </View>
          <View style={styles.infoDestino}>
            <Text style={styles.labelDestino}>Solicitud para:</Text>
            <Text style={styles.nombreDestino}>{alquiAmigo?.nombres || 'Usuario'}</Text>
          </View>
        </View>

        {/* Formulario */}
        <Text style={styles.labelInput}>Fecha</Text>
        <TouchableOpacity style={styles.inputSelect} onPress={() => setMostrarFecha(true)}>
          <Text style={styles.textoSelect}>{formatoFecha(fecha)}</Text>
          <Feather name="calendar" size={20} color="#000" />
        </TouchableOpacity>
        {mostrarFecha && (
          <DateTimePicker
            value={fecha}
            mode="date"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}

        <Text style={styles.labelInput}>Hora</Text>
        <TouchableOpacity style={styles.inputSelect} onPress={() => setMostrarHora(true)}>
          <Text style={styles.textoSelect}>{formatoHora(hora)}</Text>
          <Feather name="clock" size={20} color="#000" />
        </TouchableOpacity>
        {mostrarHora && (
          <DateTimePicker
            value={hora}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}

        <Text style={styles.labelInput}>Duración (horas)</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ej: 2"
            keyboardType="numeric"
            value={duracion}
            onChangeText={setDuracion}
          />
        </View>

        <Text style={styles.labelInput}>Ubicación</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ej: Cine Center, Plaza Principal..."
            value={ubicacion}
            onChangeText={setUbicacion}
          />
        </View>

        <Text style={styles.labelInput}>Mensaje / Propósito</Text>
        <View style={[styles.inputContainer, styles.textAreaContainer]}>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe brevemente los detalles o propósito de la solicitud..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={mensaje}
            onChangeText={setMensaje}
          />
        </View>

        <TouchableOpacity 
          style={[styles.botonConfirmar, cargando && styles.botonDeshabilitado]} 
          onPress={manejarEnvio}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.textoBotonConfirmar}>Confirmar Solicitud</Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* --- 3. MODAL DE MENSAJES INTEGRADO --- */}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  botonAtras: {
    padding: 5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  tarjetaDestino: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    marginTop: 10,
  },
  avatarBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    overflow: 'hidden',
    marginRight: 15,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  infoDestino: {
    flex: 1,
  },
  labelDestino: {
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },
  nombreDestino: {
    fontSize: 16,
    color: '#333',
  },
  labelInput: {
    fontSize: 15,
    color: '#888',
    marginBottom: 8,
    marginTop: 10,
  },
  inputSelect: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginBottom: 5,
  },
  textoSelect: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginBottom: 5,
  },
  input: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    color: '#000',
  },
  textAreaContainer: {
    height: 120,
  },
  textArea: {
    height: '100%',
  },
  botonConfirmar: {
    backgroundColor: '#008FD9',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  botonDeshabilitado: {
    backgroundColor: '#80BDFF',
  },
  textoBotonConfirmar: {
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