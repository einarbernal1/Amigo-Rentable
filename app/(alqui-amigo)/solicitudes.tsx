import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { enviarNotificacionPush, agendarRecordatorioLocal } from '../../services/notificationService';

// --- MODAL DE CONFIRMACIÓN ACEPTAR ---
const ConfirmAceptarModal = ({ visible, nombre, onConfirm, onCancel, procesando }: any) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={[styles.modalIcon, { backgroundColor: '#28A745' }]}>
          <Feather name="check" size={30} color="#FFF" />
        </View>
        <Text style={styles.modalTitle} allowFontScaling={false}>Aceptar Solicitud</Text>
        <Text style={styles.modalText} allowFontScaling={false}>
          ¿Estás seguro de que deseas aceptar la solicitud de <Text style={{fontWeight:'bold'}}>{nombre}</Text>?
        </Text>
        {procesando ? (
          <ActivityIndicator size="small" color="#28A745" style={{marginTop: 15}} />
        ) : (
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.btnCancel} onPress={onCancel}>
              <Text style={styles.btnCancelText} allowFontScaling={false}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnConfirm, { backgroundColor: '#28A745' }]} onPress={onConfirm}>
              <Text style={styles.btnConfirmText} allowFontScaling={false}>Sí, aceptar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  </Modal>
);

// --- MODAL DE RECHAZO CON MOTIVOS ---
const RechazoModal = ({ visible, onConfirm, onCancel, procesando, motivosSeleccionados, toggleMotivo, motivoPersonalizado, setMotivoPersonalizado }: any) => {
  const opciones = [
    'El horario cruza con otra actividad',
    'La ubicación me queda muy lejana',
    'No me siento cómodo/a con el plan',
    'La actividad no va con mis intereses'
  ];

  return (
    <Modal transparent visible={visible} animationType="slide">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalRechazoContent}>
            <View style={[styles.modalIcon, { backgroundColor: '#DC3545', alignSelf: 'center' }]}>
              <Feather name="x-circle" size={30} color="#FFF" />
            </View>
            <Text style={styles.modalTitle} allowFontScaling={false}>Motivo del Rechazo</Text>
            <Text style={styles.modalText} allowFontScaling={false}>
              Elige los motivos (el cliente podrá verlos) o redacta uno:
            </Text>

            <ScrollView style={styles.opcionesContainer} showsVerticalScrollIndicator={false}>
              {opciones.map((opcion, index) => {
                const seleccionado = motivosSeleccionados.includes(opcion);
                return (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.checkboxRow, seleccionado && styles.checkboxRowSelected]} 
                    onPress={() => toggleMotivo(opcion)}
                    activeOpacity={0.7}
                  >
                    <Feather name={seleccionado ? "check-square" : "square"} size={22} color={seleccionado ? "#DC3545" : "#666"} />
                    <Text style={[styles.checkboxText, seleccionado && styles.checkboxTextSelected]} allowFontScaling={false}>{opcion}</Text>
                  </TouchableOpacity>
                );
              })}
              
              {/* Input libre */}
              <Text style={[styles.labelInput, { marginTop: 15 }]} allowFontScaling={false}>Otro motivo (Opcional):</Text>
              <TextInput
                style={styles.inputMotivo}
                placeholder="Escribe un motivo específico..."
                placeholderTextColor="#999"
                value={motivoPersonalizado}
                onChangeText={setMotivoPersonalizado}
                multiline
                maxLength={100}
              />
            </ScrollView>
            
            {procesando ? (
              <ActivityIndicator size="small" color="#DC3545" style={{marginTop: 15}} />
            ) : (
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.btnCancel} onPress={onCancel}>
                  <Text style={styles.btnCancelText} allowFontScaling={false}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btnConfirm, { backgroundColor: '#DC3545', opacity: (motivosSeleccionados.length === 0 && !motivoPersonalizado.trim()) ? 0.5 : 1 }]} 
                  onPress={onConfirm}
                  disabled={motivosSeleccionados.length === 0 && !motivoPersonalizado.trim()}
                >
                  <Text style={styles.btnConfirmText} allowFontScaling={false}>Enviar Rechazo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

interface SolicitudEntrante {
  id: string;
  cliente_id: string;
  nombreCliente: string;
  fotoCliente: string;
  telefonoCliente: string;
  lugar: string;
  fecha: string;
  hora: string;
  duracion: number;
  estado: 'pendiente' | 'aceptada' | 'rechazada' | 'concluida' | 'expirada';
  datosCompletos: any;
  clientePushToken?: string;
}

export default function SolicitudesAlquiAmigoScreen() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<SolicitudEntrante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- ESTADOS PARA LOS MODALES DE ACCIÓN ---
  const [modalAceptarVisible, setModalAceptarVisible] = useState(false);
  const [modalRechazarVisible, setModalRechazarVisible] = useState(false);
  const [solicitudActiva, setSolicitudActiva] = useState<SolicitudEntrante | null>(null);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  
  // Estados para el rechazo
  const [motivosRechazo, setMotivosRechazo] = useState<string[]>([]);
  const [motivoPersonalizado, setMotivoPersonalizado] = useState('');

  useFocusEffect(
    useCallback(() => {
      cargarSolicitudesEntrantes();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarSolicitudesEntrantes();
    setRefreshing(false);
  };

  const ordenarSolicitudes = (lista: SolicitudEntrante[]) => {
    return lista.sort((a, b) => {
      const pesoEstado = { 'pendiente': 1, 'aceptada': 2, 'expirada': 3, 'rechazada': 4, 'concluida': 5 };
      const pesoA = pesoEstado[a.estado] || 99;
      const pesoB = pesoEstado[b.estado] || 99;
      if (pesoA !== pesoB) return pesoA - pesoB;
      const fechaA = new Date(a.fecha).getTime();
      const fechaB = new Date(b.fecha).getTime();
      return fechaB - fechaA;
    });
  };

  const cargarSolicitudesEntrantes = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Buscar solicitudes donde amigo_id o alqui_amigo_id coincida
      const q1 = query(collection(db, 'solicitudes'), where('amigo_id', '==', user.uid));
      const q2 = query(collection(db, 'solicitudes'), where('alqui_amigo_id', '==', user.uid));
      
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      
      // Combinar resultados sin duplicados
      const docsMap = new Map();
      snap1.docs.forEach(d => docsMap.set(d.id, d));
      snap2.docs.forEach(d => docsMap.set(d.id, d));
      const allDocs = Array.from(docsMap.values());

      const lista: SolicitudEntrante[] = [];

      await Promise.all(
        allDocs.map(async (document: any) => {
          const data = document.data();
          let clienteInfo: any = { nombres: 'Usuario Desconocido', fotoURL: '', telefono: '', email: 'No disponible', genero: 'No especificado', fechaNacimiento: '', pushToken: null };
          try {
            // Obtener datos del cliente desde 'usuarios'
            const usuarioDoc = await getDoc(doc(db, 'usuarios', data.cliente_id));
            if (usuarioDoc.exists()) {
              const uData = usuarioDoc.data();
              clienteInfo = { nombres: `${uData.nombres} ${uData.apellidos || ''}`.trim() || 'Usuario', fotoURL: uData.fotografia || '', telefono: uData.nro_telefonico || '', email: uData.correo || 'No disponible', genero: uData.genero || 'No especificado', fechaNacimiento: uData.fecha_nacimiento || '', pushToken: uData.pushToken || null };
            }
          } catch (e) { console.error(e); }

          lista.push({
            id: document.id,
            cliente_id: data.cliente_id,
            nombreCliente: clienteInfo.nombres,
            fotoCliente: clienteInfo.fotoURL,
            telefonoCliente: clienteInfo.telefono,
            clientePushToken: clienteInfo.pushToken,
            lugar: data.lugar_asistir,
            fecha: data.fecha_salida,
            hora: data.hora_salida,
            duracion: data.duracion,
            estado: data.estado_solicitud,
            datosCompletos: { 
              id: document.id,
              ...clienteInfo,
              fecha: data.fecha_salida,
              hora: data.hora_salida,
              duracion: data.duracion,
              lugar: data.lugar_asistir,
              detalles_de_la_salida: data.detalles_de_la_salida
            }
          });
        })
      );

      // Verificar y marcar solicitudes expiradas
      for (const sol of lista) {
        if (sol.estado === 'pendiente') {
          const yaExpiro = verificarSiExpiro(sol.fecha, sol.hora);
          if (yaExpiro) {
            sol.estado = 'expirada';
            try {
              await updateDoc(doc(db, 'solicitudes', sol.id), { estado_solicitud: 'expirada' });
            } catch (e) { console.error('Error actualizando expirada:', e); }
          }
        }
      }

      setSolicitudes(ordenarSolicitudes(lista));
    } catch (error) {
      console.error(error);
    } finally {
      setCargando(false);
    }
  };

  const programarRecordatorio = (fechaStr: string, horaStr: string, nombreCliente: string) => {
    try {    
      const [year, month, day] = fechaStr.split('-').map(Number);
      let [timePart, modifier] = horaStr.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);

      if (modifier) {
        modifier = modifier.toUpperCase();
        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;
      }

      const fechaEvento = new Date(year, month - 1, day, hours, minutes, 0);
      const ahora = new Date();
      const fechaRecordatorio = new Date(fechaEvento.getTime() - 30 * 60000);
      const segundosHastaRecordatorio = (fechaRecordatorio.getTime() - ahora.getTime()) / 1000;

      if (segundosHastaRecordatorio > 0) {
        agendarRecordatorioLocal("⏰ Recordatorio de Salida", `Tu encuentro con ${nombreCliente} comienza en 30 minutos. ¡Prepárate!`, segundosHastaRecordatorio);
      }
    } catch (e) { console.error(e); }
  };

  const verificarSiExpiro = (fechaStr: string, horaStr: string) => {
    try {
      let [time, modifier] = horaStr.split(' ');
      let [hours, minutes] = time.split(':');
      let hoursNum = parseInt(hours, 10);
      if (hoursNum === 12) hoursNum = 0;
      if (modifier === 'PM' || modifier === 'pm' || modifier === 'p.m.') hoursNum += 12;

      const fechaEvento = new Date();
      const [year, month, day] = fechaStr.split('-').map(Number);
      fechaEvento.setFullYear(year, month - 1, day);
      fechaEvento.setHours(hoursNum, parseInt(minutes, 10), 0);

      return new Date() > fechaEvento;
    } catch (e) {
      return false;
    }
  };

  // HANDLERS PARA ABRIR MODALES
  const confirmarAceptar = (solicitud: SolicitudEntrante) => {
    setSolicitudActiva(solicitud);
    setModalAceptarVisible(true);
  };

  const confirmarRechazar = (solicitud: SolicitudEntrante) => {
    setSolicitudActiva(solicitud);
    setMotivosRechazo([]);
    setMotivoPersonalizado('');
    setModalRechazarVisible(true);
  };

  const toggleMotivo = (motivo: string) => {
    if (motivosRechazo.includes(motivo)) setMotivosRechazo(motivosRechazo.filter(m => m !== motivo));
    else setMotivosRechazo([...motivosRechazo, motivo]);
  };

  const ejecutarAccion = async (nuevoEstado: 'aceptada' | 'rechazada') => {
    if (!solicitudActiva) return;
    setProcesandoAccion(true);

    let motivosFinales: string[] = [];
    if (nuevoEstado === 'rechazada') {
      motivosFinales = [...motivosRechazo];
      if (motivoPersonalizado.trim()) motivosFinales.push(motivoPersonalizado.trim());
    }

    try {
      const updateData: any = { estado_solicitud: nuevoEstado };
      if (nuevoEstado === 'rechazada') updateData.motivos_rechazo = motivosFinales; // Guardamos en BD

      await updateDoc(doc(db, 'solicitudes', solicitudActiva.id), updateData);

      if (nuevoEstado === 'aceptada') {
        programarRecordatorio(solicitudActiva.fecha, solicitudActiva.hora, solicitudActiva.nombreCliente);
      }

      // Notificación al Cliente
      if (solicitudActiva.clientePushToken) {
        let titulo = nuevoEstado === 'aceptada' ? '¡Solicitud Aceptada! 🎉' : 'Solicitud Rechazada';
        let cuerpo = nuevoEstado === 'aceptada' 
          ? `El AlquiAmigo ha aceptado tu solicitud. Prepara tu salida.` 
          : `El AlquiAmigo no puede aceptar tu solicitud en este momento. Revisa los motivos en tus solicitudes.`;

        await enviarNotificacionPush(solicitudActiva.clientePushToken, titulo, cuerpo, { solicitudId: solicitudActiva.id, tipo: 'cambio_estado' });
      }

      // Actualizar UI
      setSolicitudes(prev => {
        const act = prev.map(s => s.id === solicitudActiva.id ? { ...s, estado: nuevoEstado } : s);
        return ordenarSolicitudes(act);
      });

      setModalAceptarVisible(false);
      setModalRechazarVisible(false);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar la solicitud.");
    } finally {
      setProcesandoAccion(false);
    }
  };

  const renderBadge = (estado: string) => {
    let colorFondo = '#EEE', texto = estado.toUpperCase(), colorTexto = '#555';
    switch (estado) {
      case 'pendiente': colorFondo = '#FF9800'; colorTexto = '#FFF'; texto = 'Pendiente'; break;
      case 'aceptada': colorFondo = '#28A745'; colorTexto = '#FFF'; texto = 'Aceptada'; break;
      case 'rechazada': colorFondo = '#DC3545'; colorTexto = '#FFF'; texto = 'Rechazada'; break;
      case 'concluida': colorFondo = '#6C757D'; colorTexto = '#FFF'; texto = 'Concluida'; break;
      case 'expirada': colorFondo = '#795548'; colorTexto = '#FFF'; texto = 'Expirada'; break;
    }
    return <View style={[styles.badge, { backgroundColor: colorFondo }]}><Text style={[styles.badgeText, { color: colorTexto }]} allowFontScaling={false}>{texto}</Text></View>;
  };

  const renderItem = ({ item }: { item: SolicitudEntrante }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarBorder}>
            {item.fotoCliente ? <Image source={{ uri: item.fotoCliente }} style={styles.avatar} /> : <Feather name="user" size={24} color="#555" />}
          </View>
          <View style={styles.userInfoText}>
            <Text style={styles.userName} numberOfLines={2} allowFontScaling={false}>{item.nombreCliente}</Text>
            <Text style={styles.userPhone} allowFontScaling={false}>{item.telefonoCliente ? `+591 ${item.telefonoCliente}` : 'Sin teléfono'}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.btnVerDetalles} onPress={() => router.navigate({ pathname: '/(alqui-amigo)/detalle_solicitud', params: { id: item.id } })}>
          <Text style={styles.txtVerDetalles} allowFontScaling={false}>Ver Detalles</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.rowInfo}>
          <Feather name="calendar" size={16} color="#666" style={styles.iconInfo} />
          <Text style={styles.textInfo} allowFontScaling={false}>{item.fecha}, {item.hora}</Text>
        </View>
        <View style={styles.rowInfo}>
          <Feather name="map-pin" size={16} color="#666" style={styles.iconInfo} />
          <Text style={styles.textInfo} allowFontScaling={false}>{item.lugar}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        {item.estado === 'pendiente' ? (
          <View style={styles.footerPendiente}>
            {renderBadge('pendiente')}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.btnAceptar} onPress={() => confirmarAceptar(item)}>
                <Text style={styles.txtBtnAction} allowFontScaling={false}>Aceptar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnRechazar} onPress={() => confirmarRechazar(item)}>
                <Text style={styles.txtBtnAction} allowFontScaling={false}>Rechazar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.footerEstado}>
            {renderBadge(item.estado)}
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <Text style={styles.headerTitle} allowFontScaling={false}>Solicitudes Recibidas</Text>
      </View>
      {cargando ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#008FD9" /></View>
      ) : (
        <FlatList
          data={solicitudes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText} allowFontScaling={false}>No tienes solicitudes nuevas.</Text>}
        />
      )}

      {/* Modales de Acción */}
      <ConfirmAceptarModal
        visible={modalAceptarVisible}
        nombre={solicitudActiva?.nombreCliente}
        onConfirm={() => ejecutarAccion('aceptada')}
        onCancel={() => setModalAceptarVisible(false)}
        procesando={procesandoAccion}
      />

      <RechazoModal
        visible={modalRechazarVisible}
        onConfirm={() => ejecutarAccion('rechazada')}
        onCancel={() => setModalRechazarVisible(false)}
        procesando={procesandoAccion}
        motivosSeleccionados={motivosRechazo}
        toggleMotivo={toggleMotivo}
        motivoPersonalizado={motivoPersonalizado}
        setMotivoPersonalizado={setMotivoPersonalizado}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { paddingTop: 50, paddingBottom: 15, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  listContent: { padding: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { textAlign: 'center', marginTop: 20, color: '#888' },
  card: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  userInfoText: { flex: 1 },
  avatarBorder: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 1, borderColor: '#DDD', justifyContent: 'center', alignItems: 'center', marginRight: 10, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  userPhone: { fontSize: 13, color: '#666' },
  btnVerDetalles: { backgroundColor: '#E0F0FF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  txtVerDetalles: { color: '#008FD9', fontSize: 14, fontWeight: '700' },
  cardBody: { marginBottom: 15, paddingLeft: 55 },
  rowInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  iconInfo: { marginRight: 8, width: 20, textAlign: 'center' },
  textInfo: { fontSize: 14, color: '#444' },
  cardFooter: { marginTop: 5 },
  footerPendiente: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionButtons: { flexDirection: 'row', gap: 8 },
  btnAceptar: { backgroundColor: '#008FD9', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8 },
  btnRechazar: { backgroundColor: '#DC3545', paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8 },
  txtBtnAction: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  footerEstado: { alignItems: 'flex-start' },
  badge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: 'bold' },

  // --- MODALES ESTILOS ---
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 15, padding: 25, alignItems: 'center' },
  modalRechazoContent: { width: '90%', backgroundColor: '#FFF', borderRadius: 15, padding: 20, maxHeight: '85%' },
  modalIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalText: { textAlign: 'center', color: '#666', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 15, width: '100%', marginTop: 10 },
  btnCancel: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#EEE', alignItems: 'center' },
  btnConfirm: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  btnCancelText: { fontWeight: 'bold', color: '#555' },
  btnConfirmText: { fontWeight: 'bold', color: '#FFF' },

  // Opciones Rechazo
  opcionesContainer: { width: '100%', marginBottom: 10 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  checkboxRowSelected: { backgroundColor: '#FFF5F5' },
  checkboxText: { flex: 1, marginLeft: 10, fontSize: 14, color: '#444' },
  checkboxTextSelected: { color: '#DC3545', fontWeight: 'bold' },
  labelInput: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  inputMotivo: { backgroundColor: '#F5F5F5', borderRadius: 8, padding: 12, fontSize: 14, color: '#000', borderWidth: 1, borderColor: '#DDD', minHeight: 60, textAlignVertical: 'top' }
});