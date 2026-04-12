import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { registerUser, RegisterData, Horario } from '../../services/authService';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';

// --- COMPONENTE MODAL MENSAJES ---
interface ModalMensajeProps {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: 'exito' | 'error';
  onClose: () => void;
}

const ModalMensaje: React.FC<ModalMensajeProps> = ({ visible, titulo, mensaje, tipo, onClose }) => {
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalIconContainer, { backgroundColor: tipo === 'exito' ? '#28a745' : '#dc3545' }]}>
            <Feather name={tipo === 'exito' ? 'check' : 'x'} size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.modalTitulo}>{titulo}</Text>
          <Text style={styles.modalMensaje}>{mensaje}</Text>
          <TouchableOpacity 
            style={[styles.modalBoton, { backgroundColor: tipo === 'exito' ? '#28a745' : '#dc3545' }]} 
            onPress={onClose}
          >
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

  // Estados Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDatos, setModalDatos] = useState({ titulo: '', mensaje: '', tipo: 'error' as 'exito' | 'error', accion: () => {} });

  // Contraseñas
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarConfirmarContrasena, setMostrarConfirmarContrasena] = useState(false);

  // Formulario Común
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [cedula, setCedula] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState(new Date());
  const [mostrarSelectorFecha, setMostrarSelectorFecha] = useState(false);
  const [genero, setGenero] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [intereses, setIntereses] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotoURI, setFotoURI] = useState('');

  // Formulario Alqui-Amigo
  const [tarifa, setTarifa] = useState('');
  const [disponibilidad, setDisponibilidad] = useState<Record<DiaKey, HorarioDetalle>>(estadoInicialDisponibilidad());

  // --- NUEVOS ESTADOS PARA EL TIME PICKER (RELOJ) ---
  const [mostrarTimePicker, setMostrarTimePicker] = useState(false);
  const [horaTemporal, setHoraTemporal] = useState(new Date());
  const [edicionActual, setEdicionActual] = useState<{dia: DiaKey, campo: 'inicio' | 'fin'} | null>(null);

  // --- FUNCIONES AUXILIARES ---
  const mostrarModal = (titulo: string, mensaje: string, tipo: 'exito' | 'error', accion?: () => void) => {
    setModalDatos({ titulo, mensaje, tipo, accion: accion || (() => {}) });
    setModalVisible(true);
  };

  const cerrarModal = () => {
    setModalVisible(false);
    if (modalDatos.accion) modalDatos.accion();
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

  const calcularEdad = (fecha: Date) => {
    const hoy = new Date();
    let edad = hoy.getFullYear() - fecha.getFullYear();
    const m = hoy.getMonth() - fecha.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) {
      edad--;
    }
    return edad;
  };

  const convertirAHora24 = (horaStr: string, periodo: 'am' | 'pm'): number => {
    const timeRegex = /^(0[1-9]|1[0-2]):([0-5][0-9])$/;
    if (!timeRegex.test(horaStr)) return -1;
    let [horas, minutos] = horaStr.split(':').map(Number);
    if (isNaN(horas) || isNaN(minutos)) return -1;
    if (periodo === 'pm' && horas !== 12) horas += 12;
    if (periodo === 'am' && horas === 12) horas = 0;
    return horas * 60 + minutos;
  };

  // --- LÓGICA DEL TIME PICKER ---
  const abrirSelectorHora = (dia: DiaKey, campo: 'inicio' | 'fin') => {
    const horario = disponibilidad[dia];
    const horaString = campo === 'inicio' ? horario.inicio : horario.fin;
    const periodo = campo === 'inicio' ? horario.inicioPeriodo : horario.finPeriodo;

    const [hStr, mStr] = horaString.split(':');
    let h = parseInt(hStr || '0', 10);
    const m = parseInt(mStr || '0', 10);

    // Convertir a formato 24h para el objeto Date del picker
    if (periodo === 'pm' && h !== 12) h += 12;
    if (periodo === 'am' && h === 12) h = 0;

    const fechaBase = new Date();
    fechaBase.setHours(h);
    fechaBase.setMinutes(m);

    setHoraTemporal(fechaBase);
    setEdicionActual({ dia, campo });
    setMostrarTimePicker(true);
  };

  const alCambiarHoraPicker = (event: any, selectedDate?: Date) => {
    setMostrarTimePicker(false);
    if (selectedDate && edicionActual) {
      let h = selectedDate.getHours();
      const m = selectedDate.getMinutes();
      
      const nuevoPeriodo = h >= 12 ? 'pm' : 'am';
      
      // Convertir a formato 12h para mostrar
      if (h > 12) h -= 12;
      if (h === 0) h = 12;

      const nuevaHoraStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const { dia, campo } = edicionActual;

      setDisponibilidad(prev => ({
        ...prev,
        [dia]: {
          ...prev[dia],
          [campo]: nuevaHoraStr,
          [campo === 'inicio' ? 'inicioPeriodo' : 'finPeriodo']: nuevoPeriodo
        }
      }));
    }
    setEdicionActual(null);
  };

  const activarDia = (dia: DiaKey, activo: boolean) => {
    setDisponibilidad(prev => ({
      ...prev,
      [dia]: { ...prev[dia], activo: activo }
    }));
  };

  // --- VALIDACIONES ---
  const validarCampos = (): boolean => {
    if (!nombres || !apellidos || !cedula || !telefono || !email || !contrasena) {
      mostrarModal('Error', 'Por favor completa todos los campos obligatorios.', 'error');
      return false;
    }
    
    // Validar Nombres y Apellidos
    const regexNombres = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{1,50}$/;
    if (!regexNombres.test(nombres)) {
      mostrarModal('Error', 'Los nombres solo deben contener letras y no exceder los 50 caracteres.', 'error');
      return false;
    }
    if (!regexNombres.test(apellidos)) {
      mostrarModal('Error', 'Los apellidos solo deben contener letras y no exceder los 50 caracteres.', 'error');
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
    
    // Validación de Edad (18+)
    const edad = calcularEdad(fechaNacimiento);
    if (edad < 18) {
      mostrarModal('Restricción de Edad', 'Lo sentimos, debes tener al menos 18 años para registrarte en Amigo Rentable.', 'error');
      return false;
    }

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
      for (const dia of DIAS_SEMANA) {
        const horario = disponibilidad[dia.key];
        if (horario.activo) {
          diaActivoEncontrado = true;
          const inicioMinutos = convertirAHora24(horario.inicio, horario.inicioPeriodo);
          const finMinutos = convertirAHora24(horario.fin, horario.finPeriodo);

          if (inicioMinutos === -1 || finMinutos === -1) {
             mostrarModal('Error', `La hora en ${dia.nombre} es inválida.`, 'error');
             return false;
          }
          if (inicioMinutos >= finMinutos) {
            mostrarModal('Error', `En ${dia.nombre}, la hora de fin debe ser mayor que la hora de inicio.`, 'error');
            return false;
          }
        }
      }
      if (!diaActivoEncontrado) {
        mostrarModal('Error', 'Debes configurar al menos un día de disponibilidad.', 'error');
        return false;
      }
    } else {
      // Cliente
      if (!descripcion || descripcion.length < 10) {
        mostrarModal('Error', 'La descripción personal debe tener al menos 10 caracteres.', 'error');
        return false;
      }
    }
    return true;
  };

  const limpiarCampos = () => {
    setNombres(''); setApellidos(''); setCedula(''); setFechaNacimiento(new Date()); setGenero('');
    setTelefono(''); setEmail(''); setContrasena(''); setConfirmarContrasena('');
    setIntereses(''); setDescripcion(''); setFotoURI(''); setTarifa('');
    setDisponibilidad(estadoInicialDisponibilidad());
  };

  const manejarRegistro = async () => {
    if (!validarCampos()) return;
    setCargando(true);
    try {
      const datosRegistro: RegisterData = {
        email: email.trim().toLowerCase(),
        password: contrasena,
        userType: tipoUsuario,
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
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
          lunes: null, martes: null, miercoles: null, jueves: null,
          viernes: null, sabado: null, domingo: null,
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
        mostrarModal('Solicitud Enviada', 'Tu cuenta ha sido registrada y está en espera de aprobación.', 'exito', () => router.replace('/Login/login'));
        limpiarCampos();
      } else {
        mostrarModal('Error', resultado.error || 'No se pudo completar el registro.', 'error');
      }
    } catch (error: any) {
      mostrarModal('Error', error.message || 'Ocurrió un problema.', 'error');
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          {/* Logo y Título */}
          <Image source={require('../../assets/images/icono AR.jpg')} style={styles.logo} resizeMode="contain" />
          <Text style={styles.title}>Amigo Rentable</Text>
          <Text style={styles.subtitle}>Tu compañero ideal, a un clic de distancia.</Text>

          {/* Selector Tipo Usuario */}
          <View style={styles.userTypeContainer}>
            <TouchableOpacity style={[styles.userTypeButton, tipoUsuario === 'cliente' && styles.activeUserType]} onPress={() => setTipoUsuario('cliente')} disabled={cargando}>
              <Text style={[styles.userTypeText, tipoUsuario === 'cliente' && styles.activeUserTypeText]}>Cliente</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.userTypeButton, tipoUsuario === 'alqui-amigo' && styles.activeUserType]} onPress={() => setTipoUsuario('alqui-amigo')} disabled={cargando}>
              <Text style={[styles.userTypeText, tipoUsuario === 'alqui-amigo' && styles.activeUserTypeText]}>Alqui - Amigo</Text>
            </TouchableOpacity>
          </View>

          {/* Campos Generales */}
          <TextInput style={styles.input} placeholder="Nombres *" placeholderTextColor="#888" value={nombres} onChangeText={setNombres} editable={!cargando} maxLength={50} />
          <TextInput style={styles.input} placeholder="Apellidos *" placeholderTextColor="#888" value={apellidos} onChangeText={setApellidos} editable={!cargando} maxLength={50} />
          <TextInput style={styles.input} placeholder="Cédula de Identidad *" placeholderTextColor="#888" value={cedula} onChangeText={setCedula} keyboardType="numeric" editable={!cargando} />
          
          <TouchableOpacity style={styles.input} onPress={() => setMostrarSelectorFecha(true)} disabled={cargando}>
            <Text style={{ color: '#333' }}>{fechaNacimiento.toLocaleDateString('es-ES')}</Text>
          </TouchableOpacity>
          {mostrarSelectorFecha && (
            <DateTimePicker value={fechaNacimiento} mode="date" display="default" onChange={(e, d) => { setMostrarSelectorFecha(false); if(d) setFechaNacimiento(d); }} maximumDate={new Date()} />
          )}

          <View style={styles.pickerContainer}>
            <Picker selectedValue={genero} onValueChange={setGenero} enabled={!cargando} style={[styles.picker, { color: '#000' }]} dropdownIconColor="#000" mode="dropdown">
              <Picker.Item label="Género" value="" color="#888" />
              <Picker.Item label="Masculino" value="masculino" color="#000" />
              <Picker.Item label="Femenino" value="femenino" color="#000" />
            </Picker>
          </View>

          <TextInput style={styles.input} placeholder="Número de teléfono *" placeholderTextColor="#888" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" editable={!cargando} />
          <TextInput style={styles.input} placeholder="Intereses y hobbies" placeholderTextColor="#888" value={intereses} onChangeText={setIntereses} editable={!cargando} />
          <TextInput style={styles.input} placeholder="Correo Electrónico *" placeholderTextColor="#888" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" editable={!cargando} />
          
          <View style={styles.passwordContainer}>
            <TextInput style={styles.passwordInput} placeholder="Contraseña *" placeholderTextColor="#888" value={contrasena} onChangeText={setContrasena} secureTextEntry={!mostrarContrasena} editable={!cargando} />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setMostrarContrasena(!mostrarContrasena)}>
              <Feather name={mostrarContrasena ? 'eye' : 'eye-off'} size={20} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.passwordContainer}>
            <TextInput style={styles.passwordInput} placeholder="Confirmar contraseña *" placeholderTextColor="#888" value={confirmarContrasena} onChangeText={setConfirmarContrasena} secureTextEntry={!mostrarConfirmarContrasena} editable={!cargando} />
            <TouchableOpacity style={styles.eyeIcon} onPress={() => setMostrarConfirmarContrasena(!mostrarConfirmarContrasena)}>
              <Feather name={mostrarConfirmarContrasena ? 'eye' : 'eye-off'} size={20} color="#666" />
            </TouchableOpacity>
          </View>

          <TextInput style={[styles.input, styles.textArea]} placeholder={`Descripción personal... * ${tipoUsuario === 'alqui-amigo' ? '(mínimo 20 caracteres)' : '(mínimo 10 caracteres)'}`} placeholderTextColor="#888" value={descripcion} onChangeText={setDescripcion} multiline numberOfLines={4} textAlignVertical="top" editable={!cargando} />

          {/* --- SECCIÓN ALQUI-AMIGO --- */}
          {tipoUsuario === 'alqui-amigo' && (
            <>
              <TextInput style={styles.input} placeholder="Tarifa por hora en Bs. *" placeholderTextColor="#888" value={tarifa} onChangeText={setTarifa} keyboardType="numeric" editable={!cargando} />

              <View style={styles.disponibilidadContainer}>
                <Text style={styles.disponibilidadTitulo}>Disponibilidad Horaria</Text>
                
                {DIAS_SEMANA.map((dia) => {
                  const horario = disponibilidad[dia.key];
                  const estaActivo = horario.activo;
                  
                  // Estilos Dinámicos
                  const inputTouchStyle = [styles.timeInputTouch, !estaActivo && styles.inputDisabled];
                  const textTouchStyle = [styles.timeInputText, !estaActivo && styles.textoDeshabilitado];
                  const amPmBoxStyle = [styles.amPmBox, !estaActivo && styles.inputDisabled];
                  const amPmTextStyle = [styles.amPmText, !estaActivo && styles.textoDeshabilitado];

                  return (
                    <View key={dia.key} style={styles.diaContainer}>
                      <TouchableOpacity style={styles.checkboxNombreContainer} onPress={() => activarDia(dia.key, !horario.activo)} disabled={cargando}>
                        <View style={styles.checkbox}>
                          {estaActivo && <View style={styles.checkboxMarcado} />}
                        </View>
                        <Text style={styles.diaNombre}>{dia.nombre}</Text>
                      </TouchableOpacity>
                      
                      <View style={styles.horarioInputsContainer}>
                        {/* Selector Hora Inicio */}
                        <TouchableOpacity style={inputTouchStyle} onPress={() => abrirSelectorHora(dia.key, 'inicio')} disabled={!estaActivo || cargando}>
                          <Text style={textTouchStyle}>{horario.inicio}</Text>
                          <View style={amPmBoxStyle}>
                            <Text style={amPmTextStyle}>{horario.inicioPeriodo.toUpperCase()}</Text>
                          </View>
                        </TouchableOpacity>
                        
                        <Text style={styles.horaSeparador}>a</Text>
                        
                        {/* Selector Hora Fin */}
                        <TouchableOpacity style={inputTouchStyle} onPress={() => abrirSelectorHora(dia.key, 'fin')} disabled={!estaActivo || cargando}>
                          <Text style={textTouchStyle}>{horario.fin}</Text>
                          <View style={amPmBoxStyle}>
                            <Text style={amPmTextStyle}>{horario.finPeriodo.toUpperCase()}</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}

          <TouchableOpacity style={styles.photoButton} onPress={manejarSeleccionImagen} disabled={cargando}>
            <View style={styles.photoButtonContent}>
              <Feather name="camera" size={32} color="#007BFF" style={{ marginBottom: 8 }} />
              <Text style={styles.photoButtonText}>{fotoURI ? 'Fotografía seleccionada ✓' : 'Subir Fotografía *'}</Text>
            </View>
          </TouchableOpacity>
          {fotoURI && <Image source={{ uri: fotoURI }} style={styles.previewImage} />}

          <TouchableOpacity style={[styles.registerButton, cargando && styles.registerButtonDisabled]} onPress={manejarRegistro} disabled={cargando}>
            {cargando ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.registerButtonText}>Registrarse</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/Login/login')} disabled={cargando}>
            <Text style={styles.loginLink}>¿Ya tienes cuenta? <Text style={styles.loginText}>Iniciar Sesión</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Selector de Hora (Reloj) */}
      {mostrarTimePicker && (
        <DateTimePicker
          value={horaTemporal}
          mode="time"
          display="default"
          is24Hour={false}
          onChange={alCambiarHoraPicker}
        />
      )}

      <ModalMensaje visible={modalVisible} titulo={modalDatos.titulo} mensaje={modalDatos.mensaje} tipo={modalDatos.tipo} onClose={cerrarModal} />
    </View>
  );
}

// --- ESTILOS ---
const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 100, alignItems: 'center' },
  logo: { width: 80, height: 80, marginBottom: 15 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#007BFF', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 30, paddingHorizontal: 20 },
  userTypeContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 25 },
  userTypeButton: { flex: 1, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 10, backgroundColor: '#E5E5E5', marginHorizontal: 5, alignItems: 'center' },
  activeUserType: { backgroundColor: '#007BFF' },
  userTypeText: { fontSize: 16, color: '#666', fontWeight: '500' },
  activeUserTypeText: { color: '#FFFFFF', fontWeight: 'bold' },
  input: { width: '100%', padding: 15, borderRadius: 10, backgroundColor: '#F5F5F5', marginBottom: 15, fontSize: 16, color: '#333', borderWidth: 1, borderColor: '#E0E0E0' },
  textArea: { minHeight: 100, paddingTop: 15 },
  pickerContainer: { width: '100%', borderRadius: 10, backgroundColor: '#F5F5F5', marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0', overflow: 'hidden' },
  picker: { width: '100%', height: 50 },
  passwordContainer: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 10, borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 15 },
  passwordInput: { flex: 1, padding: 15, fontSize: 16, color: '#333' },
  eyeIcon: { padding: 15 },
  
  // Disponibilidad
  disponibilidadContainer: { width: '100%', backgroundColor: '#F9F9F9', borderRadius: 10, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#E0E0E0' },
  disponibilidadTitulo: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  diaContainer: { flexDirection: 'column', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  checkboxNombreContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: '#007BFF', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxMarcado: { width: 14, height: 14, borderRadius: 2, backgroundColor: '#007BFF' },
  diaNombre: { fontSize: 16, color: '#333', fontWeight: '500' },
  horarioInputsContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between', paddingLeft: 36 },
  
  // NUEVOS ESTILOS PICKER TÁCTIL
  timeInputTouch: {
    flex: 0.45, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingVertical: 8, 
    paddingHorizontal: 10, 
    borderRadius: 8, 
    backgroundColor: '#FFFFFF', 
    borderWidth: 1, 
    borderColor: '#E0E0E0' 
  },
  timeInputText: { fontSize: 15, color: '#333', fontWeight: '500' },
  amPmBox: { backgroundColor: '#F0F0F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 5 },
  amPmText: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  inputDisabled: { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' },
  textoDeshabilitado: { color: '#AAAAAA' },
  horaSeparador: { fontSize: 14, color: '#888', marginHorizontal: 5 },

  photoButton: { width: '100%', paddingVertical: 20, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#007BFF', alignItems: 'center', marginBottom: 15, elevation: 3 },
  photoButtonContent: { alignItems: 'center' },
  photoButtonText: { fontSize: 16, color: '#007BFF', fontWeight: '600' },
  previewImage: { width: 120, height: 120, borderRadius: 60, marginBottom: 15, borderWidth: 3, borderColor: '#007BFF' },
  registerButton: { width: '100%', paddingVertical: 15, borderRadius: 10, backgroundColor: '#007BFF', alignItems: 'center', justifyContent: 'center', marginTop: 10, minHeight: 50 },
  registerButtonDisabled: { backgroundColor: '#80BDFF' },
  registerButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  loginLink: { marginTop: 20, marginBottom: 20, fontSize: 16, color: '#888', textAlign: 'center' },
  loginText: { color: '#007BFF', fontWeight: 'bold' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%', backgroundColor: '#FFFFFF', borderRadius: 15, padding: 25, alignItems: 'center', elevation: 8 },
  modalIconContainer: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  modalTitulo: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 12, textAlign: 'center' },
  modalMensaje: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 25 },
  modalBoton: { width: '100%', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalBotonTexto: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});