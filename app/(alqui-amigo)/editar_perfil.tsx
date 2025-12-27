import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../config/firebase';

// --- TIPOS ---
type DiaKey = 'lunes' | 'martes' | 'miercoles' | 'jueves' | 'viernes' | 'sabado' | 'domingo';

interface HorarioData {
  inicio: string;
  inicioPeriodo: 'am' | 'pm';
  fin: string;
  finPeriodo: 'am' | 'pm';
  activo?: boolean;
}

// Etiquetas cortas
const LABEL_DIAS: Record<DiaKey, string> = {
  lunes: 'LU', martes: 'MA', miercoles: 'MI', jueves: 'JU', viernes: 'VI', sabado: 'SA', domingo: 'DO'
};

const ORDEN_DIAS: DiaKey[] = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

// --- COMPONENTE MODAL ---
const ModalMensaje = ({ visible, titulo, mensaje, tipo, onClose }: any) => {
  const colorFondo = tipo === 'exito' ? '#008FD9' : '#DC3545';
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={[styles.modalIcon, { backgroundColor: colorFondo }]}>
            <Feather name={tipo === 'exito' ? 'check' : 'alert-triangle'} size={32} color="#FFF" />
          </View>
          <Text style={styles.modalTitle}>{titulo}</Text>
          <Text style={styles.modalText}>{mensaje}</Text>
          <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colorFondo }]} onPress={onClose}>
            <Text style={styles.modalBtnText}>Aceptar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default function EditarPerfilScreen() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Datos Usuario
  const [nombre, setNombre] = useState('');
  const [fotoURL, setFotoURL] = useState('');
  const [nuevaFotoURI, setNuevaFotoURI] = useState('');

  // Lógica Horarios
  const [mapaHorarios, setMapaHorarios] = useState<Record<DiaKey, HorarioData | null>>({
    lunes: null, martes: null, miercoles: null, jueves: null, viernes: null, sabado: null, domingo: null
  });

  const [diasRegistrados, setDiasRegistrados] = useState<DiaKey[]>([]); // Días que existen en BD
  const [diasSeleccionados, setDiasSeleccionados] = useState<DiaKey[]>([]); // Días seleccionados para editar (Azul Oscuro)

  // Inputs visuales
  const [inputInicio, setInputInicio] = useState('09:00');
  const [periodoInicio, setPeriodoInicio] = useState<'am' | 'pm'>('am');
  const [inputFin, setInputFin] = useState('05:00');
  const [periodoFin, setPeriodoFin] = useState<'am' | 'pm'>('pm');

  // Time Picker
  const [mostrarPicker, setMostrarPicker] = useState(false);
  const [tipoPicker, setTipoPicker] = useState<'inicio' | 'fin'>('inicio');
  const [horaTemp, setHoraTemp] = useState(new Date());

  // Modal Info
  const [modalVisible, setModalVisible] = useState(false);
  const [modalInfo, setModalInfo] = useState({ title: '', msg: '', type: 'error' });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const docRef = doc(db, 'alqui-amigos', user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setNombre(data.nombres || 'Usuario');
        setFotoURL(data.fotoURL || '');
        
        if (data.disponibilidadHoraria) {
          const horariosDB = data.disponibilidadHoraria;
          setMapaHorarios(horariosDB);

          const diasEncontrados = ORDEN_DIAS.filter(dia => {
            const h = horariosDB[dia];
            return h && h.activo !== false; 
          });
          
          setDiasRegistrados(diasEncontrados as DiaKey[]);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Se necesita permiso para acceder a la galería.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setNuevaFotoURI(result.assets[0].uri);
    }
  };

  const subirImagenStorage = async (uri: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, `perfiles/${auth.currentUser?.uid}`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  // --- SELECCIÓN DE DÍAS ---
  const toggleDiaSeleccion = (dia: DiaKey) => {
    if (diasSeleccionados.includes(dia)) {
      const nuevos = diasSeleccionados.filter(d => d !== dia);
      setDiasSeleccionados(nuevos);
    } else {
      const nuevos = [...diasSeleccionados, dia];
      setDiasSeleccionados(nuevos);

      // Cargar en inputs el horario del día seleccionado
      const dataDia = mapaHorarios[dia];
      if (dataDia) {
        setInputInicio(dataDia.inicio);
        setPeriodoInicio(dataDia.inicioPeriodo);
        setInputFin(dataDia.fin);
        setPeriodoFin(dataDia.finPeriodo);
      }
    }
  };

  // --- ACTUALIZACIÓN MASIVA ---
  const aplicarCambioASeleccionados = (campo: keyof HorarioData, valor: string) => {
    if (campo === 'inicio') setInputInicio(valor);
    if (campo === 'fin') setInputFin(valor);
    if (campo === 'inicioPeriodo') setPeriodoInicio(valor as 'am'|'pm');
    if (campo === 'finPeriodo') setPeriodoFin(valor as 'am'|'pm');

    if (diasSeleccionados.length === 0) return;

    setMapaHorarios(prev => {
      const nuevoMapa = { ...prev };
      diasSeleccionados.forEach(dia => {
        if (nuevoMapa[dia]) {
          nuevoMapa[dia] = { ...nuevoMapa[dia]!, [campo]: valor };
        }
      });
      return nuevoMapa;
    });
  };

  // --- PICKER ---
  const abrirPicker = (tipo: 'inicio' | 'fin') => {
    // Si no hay días seleccionados, no abrimos el picker
    if (diasSeleccionados.length === 0) return;

    setTipoPicker(tipo);
    const horaString = tipo === 'inicio' ? inputInicio : inputFin;
    const periodo = tipo === 'inicio' ? periodoInicio : periodoFin;
    
    const [hStr, mStr] = horaString.split(':');
    let h = parseInt(hStr || '0', 10);
    const m = parseInt(mStr || '0', 10);

    if (periodo === 'pm' && h !== 12) h += 12;
    if (periodo === 'am' && h === 12) h = 0;

    const fechaBase = new Date();
    fechaBase.setHours(h);
    fechaBase.setMinutes(m);
    
    setHoraTemp(fechaBase);
    setMostrarPicker(true);
  };

  const onPickerChange = (event: any, selectedDate?: Date) => {
    setMostrarPicker(Platform.OS === 'ios'); 
    if (!selectedDate) return; 

    setHoraTemp(selectedDate); 

    let h = selectedDate.getHours();
    const m = selectedDate.getMinutes();
    const nuevoPeriodo = h >= 12 ? 'pm' : 'am';
    
    if (h > 12) h -= 12;
    if (h === 0) h = 12;

    const nuevaHoraStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

    if (tipoPicker === 'inicio') {
        aplicarCambioASeleccionados('inicio', nuevaHoraStr);
        aplicarCambioASeleccionados('inicioPeriodo', nuevoPeriodo);
    } else {
        aplicarCambioASeleccionados('fin', nuevaHoraStr);
        aplicarCambioASeleccionados('finPeriodo', nuevoPeriodo);
    }

    if (Platform.OS === 'android') setMostrarPicker(false);
  };

  // --- GUARDAR ---
  const guardarCambios = async () => {
    
    // VALIDACIÓN 1: Verificar si se seleccionó al menos un día O si se cambió la foto
    // Si no se hizo ninguna de las dos cosas, mostramos el modal de error.
    if (diasSeleccionados.length === 0 && !nuevaFotoURI) {
        setModalInfo({ 
            title: 'Atención', 
            msg: 'Debes seleccionar al menos un día (azul oscuro) para aplicar cambios en el horario, o cambiar tu foto de perfil.', 
            type: 'error' 
        });
        setModalVisible(true);
        return;
    }

    setGuardando(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No usuario");

      // 1. Subir foto
      let finalFotoURL = fotoURL;
      if (nuevaFotoURI) {
        finalFotoURL = await subirImagenStorage(nuevaFotoURI);
      }

      // 2. Guardar en Firestore
      const userRef = doc(db, 'alqui-amigos', user.uid);
      await updateDoc(userRef, {
        fotoURL: finalFotoURL,
        disponibilidadHoraria: mapaHorarios
      });

      setModalInfo({ title: '¡Éxito!', msg: 'Perfil actualizado correctamente.', type: 'exito' });
      setModalVisible(true);

    } catch (error) {
      setModalInfo({ title: 'Error', msg: 'No se pudieron guardar los cambios.', type: 'error' });
      setModalVisible(true);
    } finally {
      setGuardando(false);
    }
  };

  const cerrarModalYSalir = () => {
    setModalVisible(false);
    if (modalInfo.type === 'exito') {
      router.push('/(alqui-amigo)/perfil');
    }
  };

  if (cargando) return <View style={styles.center}><ActivityIndicator size="large" color="#008FD9" /></View>;

  const inputsHabilitados = diasSeleccionados.length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(alqui-amigo)/perfil')}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* FOTO */}
        <Text style={styles.labelTitulo}>Foto de perfil</Text>
        <View style={styles.cardFoto}>
          <View style={styles.rowFoto}>
            <View style={styles.avatarContainer}>
              {(nuevaFotoURI || fotoURL) ? (
                <Image source={{ uri: nuevaFotoURI || fotoURL }} style={styles.avatar} />
              ) : (
                <Feather name="user" size={50} color="#555" />
              )}
            </View>
            <View style={styles.infoUsuario}>
              <Text style={styles.nombreUsuario}>{nombre}</Text>
              <Text style={styles.subrol}>Alqui-Amigo</Text>
              <TouchableOpacity style={styles.btnCambiarFoto} onPress={seleccionarFoto}>
                <Feather name="camera" size={16} color="#000" style={{marginRight: 5}} />
                <Text style={styles.txtCambiarFoto}>Cambiar foto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* DISPONIBILIDAD */}
        <Text style={styles.labelTitulo}>Disponibilidad horaria</Text>
        <Text style={styles.subtituloDesc}>
          Seleccione los días (azul oscuro) para modificar su horario.
        </Text>

        <View style={styles.cardHorario}>
          <Text style={styles.labelInterno}>Días registrados</Text>
          
          <View style={styles.diasGrid}>
            {diasRegistrados.length === 0 ? (
                <Text style={{fontStyle:'italic', color:'#888', marginBottom:10}}>No tienes días registrados.</Text>
            ) : (
                diasRegistrados.map((dia) => {
                const estaSeleccionado = diasSeleccionados.includes(dia);
                return (
                    <TouchableOpacity
                    key={dia}
                    style={[
                        styles.diaBtn,
                        estaSeleccionado ? styles.diaBtnActivo : styles.diaBtnInactivo
                    ]}
                    onPress={() => toggleDiaSeleccion(dia)}
                    >
                    <Text style={[
                        styles.diaText,
                        estaSeleccionado ? styles.diaTextActivo : styles.diaTextInactivo
                    ]}>
                        {LABEL_DIAS[dia]}
                    </Text>
                    </TouchableOpacity>
                );
                })
            )}
          </View>

          <Text style={[styles.labelInterno, !inputsHabilitados && styles.textoDeshabilitado]}>
            Rango de horario
          </Text>
          
          <View style={[styles.rowHorarios, !inputsHabilitados && { opacity: 0.5 }]}>
            {/* HORA INICIO - TÁCTIL COMPLETO */}
            <View style={styles.bloqueHora}>
              <Text style={styles.labelHora}>Hora inicio</Text>
              <TouchableOpacity 
                style={styles.inputContainer} 
                onPress={() => abrirPicker('inicio')}
                disabled={!inputsHabilitados}
              >
                <Text style={styles.inputHora}>{inputInicio}</Text>
                
                <View style={styles.cajaAmPm}>
                  <Text style={styles.txtAmPm}>{periodoInicio.toUpperCase()}</Text>
                </View>

                <Feather name="clock" size={20} color={inputsHabilitados ? "#000" : "#999"} />
              </TouchableOpacity>
            </View>

            {/* HORA FIN - TÁCTIL COMPLETO */}
            <View style={styles.bloqueHora}>
              <Text style={styles.labelHora}>Hora fin</Text>
              <TouchableOpacity 
                style={styles.inputContainer}
                onPress={() => abrirPicker('fin')}
                disabled={!inputsHabilitados}
              >
                <Text style={styles.inputHora}>{inputFin}</Text>
                
                <View style={styles.cajaAmPm}>
                  <Text style={styles.txtAmPm}>{periodoFin.toUpperCase()}</Text>
                </View>

                <Feather name="clock" size={20} color={inputsHabilitados ? "#000" : "#999"} />
              </TouchableOpacity>
            </View>
          </View>
          
          {!inputsHabilitados && (
             <Text style={styles.avisoSeleccion}>* Seleccione al menos un día arriba para habilitar la edición.</Text>
          )}

        </View>

        {/* BOTONES */}
        <TouchableOpacity 
          style={[styles.btnGuardar, guardando && {backgroundColor: '#80BDFF'}]}
          onPress={guardarCambios}
          disabled={guardando}
        >
          {guardando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.txtBtnGuardar}>Guardar Cambios</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnCancelar} onPress={() => router.push('/(alqui-amigo)/perfil')} disabled={guardando}>
          <Text style={styles.txtBtnCancelar}>Cancelar</Text>
        </TouchableOpacity>

      </ScrollView>

      {mostrarPicker && (
        <DateTimePicker
          value={horaTemp}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          is24Hour={false}
          onChange={onPickerChange}
        />
      )}

      <ModalMensaje 
        visible={modalVisible}
        titulo={modalInfo.title}
        mensaje={modalInfo.msg}
        tipo={modalInfo.type}
        onClose={cerrarModalYSalir}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#F5F5F5'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  scrollContent: { padding: 20, paddingBottom: 50 },

  labelTitulo: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#000' },
  subtituloDesc: { fontSize: 14, color: '#666', marginBottom: 15 },

  // FOTO
  cardFoto: { backgroundColor: '#F0F0F0', borderRadius: 15, padding: 20, marginBottom: 25 },
  rowFoto: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#000', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  infoUsuario: { marginLeft: 15, flex: 1 },
  nombreUsuario: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  subrol: { fontSize: 14, color: '#666', marginBottom: 10 },
  btnCambiarFoto: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#000', alignSelf: 'flex-start' },
  txtCambiarFoto: { fontSize: 13, fontWeight: '600' },

  // HORARIO
  cardHorario: { backgroundColor: '#F0F0F0', borderRadius: 15, padding: 20, marginBottom: 30 },
  labelInterno: { fontSize: 15, color: '#555', marginBottom: 10, fontWeight: '600' },
  textoDeshabilitado: { color: '#AAA' },
  
  diasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  diaBtn: { width: 45, height: 35, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  
  diaBtnInactivo: { backgroundColor: '#B3E5FC' }, // Celeste claro
  diaBtnActivo: { backgroundColor: '#008FD9' },   // Azul oscuro
  
  diaText: { fontWeight: 'bold', fontSize: 13 },
  diaTextInactivo: { color: '#005F99' },
  diaTextActivo: { color: '#FFF' },

  rowHorarios: { flexDirection: 'row', justifyContent: 'space-between' },
  bloqueHora: { width: '48%' },
  labelHora: { fontSize: 14, fontWeight: 'bold', marginBottom: 5, color: '#444' },
  
  // Contenedor Input Táctil
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 10, borderWidth: 1, borderColor: '#DDD'
  },
  inputHora: { flex: 1, fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#000' },
  cajaAmPm: { backgroundColor: '#EEE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginLeft: 5, marginRight: 5 },
  txtAmPm: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  
  avisoSeleccion: { marginTop: 15, fontSize: 13, color: '#D50000', fontStyle: 'italic', textAlign:'center' },

  btnGuardar: { backgroundColor: '#008FD9', borderRadius: 10, paddingVertical: 15, alignItems: 'center', marginBottom: 15 },
  txtBtnGuardar: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  btnCancelar: { backgroundColor: '#D50000', borderRadius: 10, paddingVertical: 15, alignItems: 'center' },
  txtBtnCancelar: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%', backgroundColor: '#FFF', borderRadius: 15, padding: 25, alignItems: 'center' },
  modalIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  modalText: { textAlign: 'center', color: '#666', marginBottom: 20 },
  modalBtn: { width: '100%', padding: 12, borderRadius: 10, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontWeight: 'bold' }
});