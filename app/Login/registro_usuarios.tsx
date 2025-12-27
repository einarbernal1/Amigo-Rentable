// RegisterScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView, // Usamos ScrollView directamente
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
// Importamos la nueva interfaz Horario
import { registerUser, RegisterData, Horario } from '../../services/authService';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';

// Componente Modal Personalizado (sin cambios)
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

// --- TIPOS Y CONSTANTES ---
type DiaKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

interface HorarioDetalle {
  activo: boolean;
  inicio: string;
  inicioPeriodo: 'am' | 'pm';
  fin: string;
  finPeriodo: 'am' | 'pm';
}

const DIAS_SEMANA: { key: DiaKey, nombre: string }[] = [
  { key: 'lunes', nombre: 'Lunes' },
  { key: 'martes', nombre: 'Martes' },
  { key: 'miercoles', nombre: 'Miércoles' },
  { key: 'jueves', nombre: 'Jueves' },
  { key: 'viernes', nombre: 'Viernes' },
  { key: 'sabado', nombre: 'Sábado' },
  { key: 'domingo', nombre: 'Domingo' },
];

// Estado inicial para la disponibilidad (CORREGIDO A FORMATO 12H)
const estadoInicialDisponibilidad = (): Record<DiaKey, HorarioDetalle> => ({
  lunes: { activo: false, inicio: '09:00', inicioPeriodo: 'am', fin: '05:00', finPeriodo: 'pm' }, 
  martes: { activo: false, inicio: '09:00', inicioPeriodo: 'am', fin: '05:00', finPeriodo: 'pm' }, 
  miercoles: { activo: false, inicio: '09:00', inicioPeriodo: 'am', fin: '05:00', finPeriodo: 'pm' }, 
  jueves: { activo: false, inicio: '09:00', inicioPeriodo: 'am', fin: '05:00', finPeriodo: 'pm' }, 
  viernes: { activo: false, inicio: '09:00', inicioPeriodo: 'am', fin: '05:00', finPeriodo: 'pm' }, 
  sabado: { activo: false, inicio: '09:00', inicioPeriodo: 'am', fin: '05:00', finPeriodo: 'pm' }, 
  domingo: { activo: false, inicio: '09:00', inicioPeriodo: 'am', fin: '05:00', finPeriodo: 'pm' }, 
});


export default function RegisterScreen() {
  const router = useRouter();
  const [tipoUsuario, setTipoUsuario] = useState<'cliente' | 'alqui-amigo'>('cliente');
  const [cargando, setCargando] = useState(false);

  // Estado del modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDatos, setModalDatos] = useState({
    titulo: '',
    mensaje: '',
    tipo: 'error' as 'exito' | 'error',
    accion: () => {}
  });

  // Estados para mostrar/ocultar contraseñas
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmarContrasena, setMostrarConfirmarContrasena] = useState(false);

  // Campos comunes
  const [nombres, setNombres] = useState('');
  const [cedula, setCedula] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState(new Date());
  const [mostrarSelectorFecha, setMostrarSelectorFecha] = useState(false);
  const [genero, setGenero] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');

  // Campos comunes adicionales
  const [intereses, setIntereses] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotoURI, setFotoURI] = useState('');

  // Campos específicos para Alqui-Amigo
  const [tarifa, setTarifa] = useState('');
  const [disponibilidad, setDisponibilidad] = useState<Record<DiaKey, HorarioDetalle>>(estadoInicialDisponibilidad());

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

  const manejarSeleccionImagen = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      mostrarModal('Permiso denegado', 'Necesitamos acceso a tu galería para subir una foto.', 'error');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFotoURI(result.assets[0].uri);
    }
  };

  const convertirAHora24 = (horaStr: string, periodo: 'am' | 'pm'): number => {
    const timeRegex = /^(0[1-9]|1[0-2]):([0-5][0-9])$/;
    if (!timeRegex.test(horaStr)) {
      return -1; // Formato inválido
    }

    let [horas, minutos] = horaStr.split(':').map(Number);

    if (isNaN(horas) || isNaN(minutos)) {
      return -1; // Valor no numérico
    }

    // Lógica AM/PM
    if (periodo === 'pm' && horas !== 12) {
      horas += 12;
    }
    if (periodo === 'am' && horas === 12) {
      horas = 0; // Medianoche (12:XX am)
    }
    
    return horas * 60 + minutos; // Devolvemos total de minutos para comparar
  };


  const validarCampos = (): boolean => {
    if (!nombres || !cedula || !telefono || !email || !contrasena) {
      mostrarModal('Error', 'Por favor completa todos los campos obligatorios.', 'error');
      return false;
    }
    
    if (contrasena !== confirmarContrasena) {
      mostrarModal('Error', 'Las contraseñas no coinciden.', 'error');
      return false;
    }

    if (!fotoURI) {
      mostrarModal('Error', 'Debes subir una fotografía de perfil.', 'error');
      return false;
    }

    // --- VALIDACIONES DE HORARIO ---
    if (tipoUsuario === 'alqui-amigo') {
      if (!descripcion || descripcion.length < 20) {
        mostrarModal('Error', 'La descripción personal debe tener al menos 20 caracteres.', 'error');
        return false;
      }

      if (!tarifa || isNaN(Number(tarifa)) || Number(tarifa) <= 0) {
        mostrarModal('Error', 'Ingresa una tarifa válida.', 'error');
        return false;
      }
      
      let diaActivoEncontrado = false;
      const timeFormatRegex = /^(0[1-9]|1[0-2]):([0-5][0-9])$/; // Formato 12h (01:00 - 12:59)

      for (const dia of DIAS_SEMANA) {
        const horario = disponibilidad[dia.key];
        
        if (horario.activo) {
          diaActivoEncontrado = true;
          
          if (!timeFormatRegex.test(horario.inicio) || !timeFormatRegex.test(horario.fin)) {
            mostrarModal('Error', `El formato de hora para ${dia.nombre} es inválido. Usa HH:MM (ej: 09:00).`, 'error');
            return false;
          }

          const inicioMinutos = convertirAHora24(horario.inicio, horario.inicioPeriodo); 
          const finMinutos = convertirAHora24(horario.fin, horario.finPeriodo); 

          if (inicioMinutos === -1 || finMinutos === -1) {
             mostrarModal('Error', `La hora ingresada para ${dia.nombre} es inválida. Usa un formato de 12 horas (01:00 a 12:59).`, 'error');
             return false;
          }

          if (inicioMinutos >= finMinutos) { 
            mostrarModal('Error', `En ${dia.nombre}, la hora de fin debe ser mayor que la hora de inicio.`, 'error');
            return false;
          }
        }
      }

      if (!diaActivoEncontrado) {
        mostrarModal('Error', 'Debes seleccionar y configurar al menos un día de disponibilidad.', 'error');
        return false;
      }
    }

    if (tipoUsuario === 'cliente') {
      if (!descripcion || descripcion.length < 10) {
        mostrarModal('Error', 'La descripción personal debe tener al menos 10 caracteres.', 'error');
        return false;
      }
    }

    return true;
  };

  const limpiarCampos = () => {
    setNombres('');
    setCedula('');
    setFechaNacimiento(new Date());
    setGenero('');
    setTelefono('');
    setEmail('');
    setContrasena('');
    setConfirmarContrasena('');
    setIntereses('');
    setDescripcion('');
    setFotoURI('');
    setTarifa('');
    setDisponibilidad(estadoInicialDisponibilidad());
  }

  const manejarRegistro = async () => {
    if (!validarCampos()) return;

    setCargando(true);

    try {
      const datosRegistro: RegisterData = {
        email: email.trim().toLowerCase(),
        password: contrasena,
        userType: tipoUsuario,
        nombres: nombres.trim(),
        cedula: cedula.trim(),
        fechaNacimiento: fechaNacimiento.toISOString().split('T')[0],
        genero,
        telefono: telefono.trim(),
        intereses: intereses.trim(),
        descripcion: descripcion.trim(),
        fotoURL: fotoURI,
      };

      if (tipoUsuario === 'alqui-amigo') {
        datosRegistro.tarifa = tarifa.trim();
        
        const disponibilidadParaFirestore: Record<DiaKey, Horario | null> = {
          lunes: null,
          martes: null,
          miercoles: null,
          jueves: null,
          viernes: null,
          sabado: null,
          domingo: null,
        };

        for (const dia of DIAS_SEMANA) {
          const horario = disponibilidad[dia.key];
          if (horario.activo) {
            disponibilidadParaFirestore[dia.key] = {
              inicio: horario.inicio,
              inicioPeriodo: horario.inicioPeriodo,
              fin: horario.fin,
              finPeriodo: horario.finPeriodo,
            };
          }
        }
        
        datosRegistro.disponibilidadHoraria = disponibilidadParaFirestore;
      }

      const resultado = await registerUser(datosRegistro);

      if (resultado.success) {
        // CAMBIO DE MENSAJE
        mostrarModal(
          'Solicitud Enviada',
          'Tu cuenta ha sido registrada y está en fase de aceptación. Recibirás una notificación cuando el administrador la apruebe.',
          'exito',
          () => router.replace('/Login/login')
        );
        limpiarCampos();
      } else {
        mostrarModal('Error', resultado.error || 'No se pudo completar el registro.', 'error');
      }
    } catch (error: any) {
      mostrarModal('Error', error.message || 'Ocurrió un problema al registrar la cuenta.', 'error');
    } finally {
      setCargando(false);
    }
  };

  const irALogin = () => {
    router.push('/Login/login');
  };

  const manejarCambioDisponibilidad = (
    dia: DiaKey,
    campo: keyof HorarioDetalle,
    valor: string | boolean | 'am' | 'pm'
  ) => {
    
    if ((campo === 'inicio' || campo === 'fin') && typeof valor === 'string') {
      const valorLimpio = valor.replace(':', '');
      if (valorLimpio.length > 4) return;
      if (valorLimpio.length >= 3) {
        valor = `${valorLimpio.slice(0, 2)}:${valorLimpio.slice(2)}`;
      } else {
        valor = valorLimpio;
      }
    }

    setDisponibilidad(prev => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        [campo]: valor
      }
    }));
  };
  
  const manejarBlurHora = (dia: DiaKey, campo: 'inicio' | 'fin') => {
    setDisponibilidad(prev => {
      const horario = { ...prev[dia] };
      const valorActual = horario[campo];
      let periodoActual = horario[campo === 'inicio' ? 'inicioPeriodo' : 'finPeriodo'];

      const partes = valorActual.split(':');
      let horas = parseInt(partes[0], 10);
      let minutos = parseInt(partes[1], 10);

      if (isNaN(horas) || isNaN(minutos) || minutos > 59) {
        return prev; // Formato inválido, no hacer nada
      }

      // Auto-corrección 24h
      if (horas > 12) {
        horas = horas - 12; 
        periodoActual = 'pm';
      } else if (horas === 12) {
        periodoActual = 'pm';
      } else if (horas === 0) {
        horas = 12;
        periodoActual = 'am';
      }
      
      const nuevoValor = String(horas).padStart(2, '0') + ':' + String(minutos).padStart(2, '0');

      const newState = { ...prev };
      newState[dia] = {
        ...horario,
        [campo]: nuevoValor,
        [campo === 'inicio' ? 'inicioPeriodo' : 'finPeriodo']: periodoActual
      };
      return newState;
    });
  };

  return (
    // CAMBIO IMPORTANTE: Eliminamos KeyboardAvoidingView y usamos un View simple
    // Esto evita el conflicto con el teclado nativo de Android que causaba el crash
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          {/* Logo, Título, Subtítulo, Selector de Usuario */}
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

          {/* Campos comunes */}
          <TextInput
            style={styles.input}
            placeholder="Nombres y Apellidos *"
            placeholderTextColor="#888888"
            value={nombres}
            onChangeText={setNombres}
            editable={!cargando}
          />
          <TextInput
            style={styles.input}
            placeholder="Cédula de Identidad *"
            placeholderTextColor="#888888"
            value={cedula}
            onChangeText={setCedula}
            keyboardType="numeric"
            editable={!cargando}
          />
          <TouchableOpacity
            style={styles.input}
            onPress={() => setMostrarSelectorFecha(true)}
            disabled={cargando}
          >
            <Text style={{ color: '#333333' }}>
              {fechaNacimiento.toLocaleDateString('es-ES')}
            </Text>
          </TouchableOpacity>
          {mostrarSelectorFecha && (
            <DateTimePicker
              value={fechaNacimiento}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setMostrarSelectorFecha(false);
                if (selectedDate) setFechaNacimiento(selectedDate);
              }}
              maximumDate={new Date()}
            />
          )}
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={genero}
              onValueChange={setGenero}
              enabled={!cargando}
              style={styles.picker}
            >
              <Picker.Item label="Género" value="" />
              <Picker.Item label="Masculino" value="masculino" />
              <Picker.Item label="Femenino" value="femenino" />
              <Picker.Item label="Otro" value="otro" />
            </Picker>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Número de teléfono *"
            placeholderTextColor="#888888"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
            editable={!cargando}
          />
          <TextInput
            style={styles.input}
            placeholder="Intereses y hobbies"
            placeholderTextColor="#888888"
            value={intereses}
            onChangeText={setIntereses}
            editable={!cargando}
          />
          <TextInput
            style={styles.input}
            placeholder="Correo Electrónico *"
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
              placeholder="Contraseña *"
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
              <Feather 
                name={mostrarContrasena ? 'eye' : 'eye-off'} 
                size={20} 
                color="#666666" 
              />
            </TouchableOpacity>
          </View>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirmar contraseña *"
              placeholderTextColor="#888888"
              value={confirmarContrasena}
              onChangeText={setConfirmarContrasena}
              secureTextEntry={!mostrarConfirmarContrasena}
              editable={!cargando}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setMostrarConfirmarContrasena(!mostrarConfirmarContrasena)}
            >
              <Feather 
                name={mostrarConfirmarContrasena ? 'eye' : 'eye-off'} 
                size={20} 
                color="#666666" 
              />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={`Descripción personal... * ${tipoUsuario === 'alqui-amigo' ? '(mínimo 20 caracteres)' : '(mínimo 10 caracteres)'}`}
            placeholderTextColor="#888888"
            value={descripcion}
            onChangeText={setDescripcion}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!cargando}
          />

          {/* --- SECCIÓN ALQUI-AMIGO (CON BOTÓN AM/PM) --- */}
          {tipoUsuario === 'alqui-amigo' && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Tarifa por hora en Bs. *"
                placeholderTextColor="#888888"
                value={tarifa}
                onChangeText={setTarifa}
                keyboardType="numeric"
                editable={!cargando}
              />

              <View style={styles.disponibilidadContainer}>
                <Text style={styles.disponibilidadTitulo}>Disponibilidad Horaria</Text>
                
                {DIAS_SEMANA.map((dia) => {
                  const horario = disponibilidad[dia.key];
                  const estaActivo = horario.activo;
                  const inputStyle = [
                    styles.timeInput,
                    !estaActivo && styles.inputDisabled
                  ];
                   const pickerToggleStyle = [
                    styles.pickerToggle,
                    !estaActivo && styles.inputDisabled
                  ];
                  const pickerToggleTextStyle = [
                    styles.pickerToggleText,
                    !estaActivo && styles.pickerDisabled
                  ];

                  return (
                    <View key={dia.key} style={styles.diaContainer}>
                      <TouchableOpacity
                        style={styles.checkboxNombreContainer}
                        onPress={() => manejarCambioDisponibilidad(dia.key, 'activo', !horario.activo)}
                        disabled={cargando}
                      >
                        <View style={styles.checkbox}>
                          {estaActivo && <View style={styles.checkboxMarcado} />}
                        </View>
                        <Text style={styles.diaNombre}>
                          {dia.nombre}
                        </Text>
                      </TouchableOpacity>
                      
                      <View style={styles.horarioInputsContainer}>
                        <TextInput
                          style={inputStyle}
                          placeholder="09:00"
                          placeholderTextColor="#AAAAAA"
                          value={horario.inicio}
                          onChangeText={(val) => manejarCambioDisponibilidad(dia.key, 'inicio', val)}
                          onBlur={() => manejarBlurHora(dia.key, 'inicio')}
                          editable={estaActivo && !cargando}
                          keyboardType="numeric"
                          maxLength={5}
                        />
                        
                        {/* --- BOTÓN AM/PM PARA ANDROID --- */}
                        <TouchableOpacity
                          style={pickerToggleStyle}
                          onPress={() => {
                            const nuevoPeriodo = horario.inicioPeriodo === 'am' ? 'pm' : 'am';
                            manejarCambioDisponibilidad(dia.key, 'inicioPeriodo', nuevoPeriodo);
                          }}
                          disabled={!estaActivo || cargando}
                        >
                          <Text style={pickerToggleTextStyle}>
                            {horario.inicioPeriodo.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                        
                        <Text style={styles.horaSeparador}>a</Text>
                        
                        <TextInput
                          style={inputStyle}
                          placeholder="05:00" 
                          placeholderTextColor="#AAAAAA"
                          value={horario.fin}
                          onChangeText={(val) => manejarCambioDisponibilidad(dia.key, 'fin', val)}
                          onBlur={() => manejarBlurHora(dia.key, 'fin')}
                          editable={estaActivo && !cargando}
                          keyboardType="numeric"
                          maxLength={5}
                        />
                        
                        {/* --- BOTÓN AM/PM PARA ANDROID --- */}
                        <TouchableOpacity
                          style={pickerToggleStyle}
                          onPress={() => {
                            const nuevoPeriodo = horario.finPeriodo === 'am' ? 'pm' : 'am';
                            manejarCambioDisponibilidad(dia.key, 'finPeriodo', nuevoPeriodo);
                          }}
                          disabled={!estaActivo || cargando}
                        >
                          <Text style={pickerToggleTextStyle}>
                            {horario.finPeriodo.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          {/* Botón de subir fotografía */}
          <TouchableOpacity
            style={styles.photoButton}
            onPress={manejarSeleccionImagen}
            disabled={cargando}
          >
            <View style={styles.photoButtonContent}>
              <Feather 
                name="camera" 
                size={32} 
                color="#007BFF" 
                style={{ marginBottom: 8 }}
              />
              <Text style={styles.photoButtonText}>
                {fotoURI ? 'Fotografía seleccionada ✓' : 'Subir Fotografía *'}
              </Text>
            </View>
          </TouchableOpacity>
          {fotoURI && (
            <Image source={{ uri: fotoURI }} style={styles.previewImage} />
          )}

          {/* Botón de registro */}
          <TouchableOpacity
            style={[styles.registerButton, cargando && styles.registerButtonDisabled]}
            onPress={manejarRegistro}
            disabled={cargando}
          >
            {cargando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.registerButtonText}>Registrarse</Text>
            )}
          </TouchableOpacity>

          {/* Enlace al login */}
          <TouchableOpacity onPress={irALogin} disabled={cargando}>
            <Text style={styles.loginLink}>
              ¿Ya tienes cuenta?{' '} 
              <Text style={styles.loginText}>Iniciar Sesión</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Modal de mensajes */}
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

// --- ESTILOS ---
const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007BFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  userTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 25,
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
  textArea: {
    minHeight: 100,
    paddingTop: 15,
  },
  pickerContainer: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 50,
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
  
  disponibilidadContainer: {
    width: '100%',
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  disponibilidadTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 15,
  },
  diaContainer: {
    flexDirection: 'column', 
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  checkboxNombreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, 
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#007BFF',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxMarcado: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: '#007BFF',
  },
  diaNombre: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  horarioInputsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    paddingLeft: 36, // Indentación
  },
  timeInput: {
    flex: 0.3,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    color: '#AAAAAA',
  },
  pickerToggle: {
    flex: 0.25,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerToggleText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: 'bold',
  },
  pickerDisabled: {
    color: '#AAAAAA',
  },
  horaSeparador: {
    fontSize: 14,
    color: '#888888',
    marginHorizontal: 5,
  },
  
  photoButton: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#007BFF',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photoButtonContent: {
    alignItems: 'center',
  },
  photoButtonText: {
    fontSize: 16,
    color: '#007BFF',
    fontWeight: '600',
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
    borderWidth: 3,
    borderColor: '#007BFF',
  },
  registerButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#007BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    minHeight: 50,
  },
  registerButtonDisabled: {
    backgroundColor: '#80BDFF',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginLink: {
    marginTop: 20,
    marginBottom: 20,
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
  },
  loginText: {
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