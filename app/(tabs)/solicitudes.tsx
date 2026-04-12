import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Modal
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { getUserData } from '../../services/authService';

// --- MODAL PARA MOSTRAR MOTIVOS AL CLIENTE ---
const VerMotivosModal = ({ visible, motivos, onClose }: any) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.modalContentMotivos}>
        <View style={[styles.modalIcon, { backgroundColor: '#DC3545' }]}>
          <Feather name="info" size={30} color="#FFF" />
        </View>
        <Text style={styles.modalTitle} allowFontScaling={false}>Motivos del Rechazo</Text>
        
        {(!motivos || motivos.length === 0) ? (
          <Text style={styles.modalText} allowFontScaling={false}>
            El Alqui-Amigo no especificó un motivo en particular.
          </Text>
        ) : (
          <View style={{ width: '100%', marginBottom: 15 }}>
            {motivos.map((motivo: string, index: number) => (
              <View key={index} style={styles.motivoItemRow}>
                <Feather name="minus" size={16} color="#DC3545" style={{ marginTop: 3, marginRight: 8 }} />
                <Text style={styles.motivoItemText} allowFontScaling={false}>{motivo}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={[styles.btnConfirm, { backgroundColor: '#DC3545', width: '100%' }]} onPress={onClose}>
          <Text style={styles.btnConfirmText} allowFontScaling={false}>Entendido</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

interface SolicitudVisual {
  id: string;
  alqui_amigo_id: string;
  nombreAmigo: string;
  fotoAmigo: string;
  telefonoAmigo: string; 
  ratingAmigo: number;
  lugar: string;
  fecha: string;
  hora: string;
  duracion: number;
  estado: 'pendiente' | 'aceptada' | 'rechazada' | 'concluida';
  yaCalificada: boolean; 
  motivosRechazo?: string[]; // NUEVO CAMPO
}

export default function SolicitudesScreen() {
  const router = useRouter();
  
  const [solicitudes, setSolicitudes] = useState<SolicitudVisual[]>([]);
  const [cargando, setCargando] = useState(true);
  const [clienteData, setClienteData] = useState<{ nombres: string; fotoURL: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Estados Modal
  const [modalMotivosVisible, setModalMotivosVisible] = useState(false);
  const [motivosSeleccionados, setMotivosSeleccionados] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const cargarDatos = async () => {
    await Promise.all([cargarPerfilCliente(), cargarSolicitudes()]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  const cargarPerfilCliente = async () => {
    const user = auth.currentUser;
    if (user) {
      const datos = await getUserData(user.uid, 'cliente');
      if (datos) {
        setClienteData({
          nombres: datos.nombres || 'Usuario',
          fotoURL: datos.fotoURL || '',
        });
      }
    }
  };

  const cargarSolicitudes = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, 'solicitudes'),
        where('cliente_id', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);

      const listaProcesada: SolicitudVisual[] = [];

      await Promise.all(
        querySnapshot.docs.map(async (document) => {
          const data = document.data();
          const solicitudId = document.id;
          
          let nombreAmigo = 'Usuario Desconocido';
          let fotoAmigo = '';
          let telefonoAmigo = '';
          let ratingAmigo = 0;    

          // Compatibilidad: usa amigo_id o alqui_amigo_id
          const amigoId = data.amigo_id || data.alqui_amigo_id;

          try {
            // Obtener datos base del usuario
            const usuarioDoc = await getDoc(doc(db, 'usuarios', amigoId));
            if (usuarioDoc.exists()) {
              const uData = usuarioDoc.data();
              nombreAmigo = `${uData.nombres} ${uData.apellidos || ''}`.trim();
              fotoAmigo = uData.fotografia || '';
              telefonoAmigo = uData.nro_telefonico || '';
            }
            // Obtener rating de amigos
            const amigoDoc = await getDoc(doc(db, 'amigos', amigoId));
            if (amigoDoc.exists()) {
              const amigoData = amigoDoc.data();
              ratingAmigo = amigoData.calificacion || 0;
            }
          } catch (e) {
            console.error("Error buscando amigo", e);
          }

          let estadoFinal = data.estado_solicitud; 

          if (estadoFinal === 'aceptada') {
            const esConcluida = verificarSiConcluyo(data.fecha_salida, data.hora_salida, data.duracion);
            if (esConcluida) {
              estadoFinal = 'concluida';
            }
          }

          listaProcesada.push({
            id: solicitudId,
            alqui_amigo_id: amigoId,
            nombreAmigo,
            fotoAmigo,
            telefonoAmigo, 
            ratingAmigo,   
            lugar: data.lugar_asistir,
            fecha: data.fecha_salida, 
            hora: data.hora_salida,   
            duracion: data.duracion,
            estado: estadoFinal,
            yaCalificada: data.estado_calificacion || false,
            motivosRechazo: data.motivos_rechazo || []
          });
        })
      );

      listaProcesada.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setSolicitudes(listaProcesada);
    } catch (error) {
      console.error("Error cargando solicitudes:", error);
    } finally {
      setCargando(false);
    }
  };

  const verificarSiConcluyo = (fechaStr: string, horaStr: string, duracionHoras: number) => {
    try {
      let [time, modifier] = horaStr.split(' ');
      let [hours, minutes] = time.split(':');
      let hoursNum = parseInt(hours, 10);
      if (hoursNum === 12) hoursNum = 0;
      if (modifier === 'PM' || modifier === 'pm' || modifier === 'p.m.') hoursNum += 12;
      
      const fechaInicio = new Date(fechaStr);
      const [year, month, day] = fechaStr.split('-').map(Number);
      fechaInicio.setFullYear(year, month - 1, day);
      fechaInicio.setHours(hoursNum, parseInt(minutes, 10), 0);

      const fechaFin = new Date(fechaInicio);
      fechaFin.setHours(fechaInicio.getHours() + duracionHoras);

      const ahora = new Date();
      return ahora > fechaFin;
    } catch (e) {
      return false; 
    }
  };

  const irAPerfil = () => router.push('/Perfil_usuario/perfil');
  const irACalificar = (solicitud: SolicitudVisual) => {
    router.push({ pathname: '/Funciones_usuario_cliente/calificar_experiencia', params: { solicitudId: solicitud.id } });
  };

  const abrirMotivos = (motivos: string[]) => {
    setMotivosSeleccionados(motivos);
    setModalMotivosVisible(true);
  };

  const renderBadgeEstado = (estado: string) => {
    let colorFondo = '#EEE', colorTexto = '#555', texto = estado.charAt(0).toUpperCase() + estado.slice(1);
    switch (estado) {
      case 'pendiente': colorFondo = '#FF9800'; colorTexto = '#FFF'; break;
      case 'aceptada': colorFondo = '#25D366'; colorTexto = '#FFF'; break;
      case 'rechazada': colorFondo = '#DC3545'; colorTexto = '#FFF'; break;
      case 'concluida': colorFondo = '#E0E0E0'; colorTexto = '#777'; break;
    }
    return <View style={[styles.badge, { backgroundColor: colorFondo }]}><Text style={[styles.badgeText, { color: colorTexto }]} allowFontScaling={false}>{texto}</Text></View>;
  };

  const renderItem = ({ item }: { item: SolicitudVisual }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarBorder}>
            {item.fotoAmigo ? <Image source={{ uri: item.fotoAmigo }} style={styles.avatar} /> : <Feather name="user" size={24} color="#555" />}
          </View>
          <Text style={styles.userName} numberOfLines={1} allowFontScaling={false}>{item.nombreAmigo}</Text>
        </View>
        {renderBadgeEstado(item.estado)}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.rowDetail}>
          <Feather name="activity" size={16} color="#666" style={styles.iconDetail} />
          <Text style={styles.textDetail} numberOfLines={1} allowFontScaling={false}>{item.lugar}</Text>
        </View>
        <View style={styles.rowDetail}>
          <Feather name="calendar" size={16} color="#666" style={styles.iconDetail} />
          <Text style={styles.textDetail} allowFontScaling={false}>{item.fecha}, {item.hora}</Text>
        </View>
      </View>

      {/* BOTONES INFERIORES */}
      <View style={styles.footerContainer}>
        {item.estado === 'concluida' && !item.yaCalificada && (
          <TouchableOpacity style={styles.botonCalificar} onPress={() => irACalificar(item)}>
            <Text style={styles.textoBotonCalificar} allowFontScaling={false}>Calificar</Text>
          </TouchableOpacity>
        )}
        
        {item.estado === 'concluida' && item.yaCalificada && (
          <Text style={styles.textoCalificada} allowFontScaling={false}>✓ Experiencia calificada</Text>
        )}

        {/* NUEVO BOTON PARA VER MOTIVOS (Solo si es rechazada) */}
        {item.estado === 'rechazada' && (
          <TouchableOpacity style={styles.btnVerMotivo} onPress={() => abrirMotivos(item.motivosRechazo || [])}>
            <Feather name="info" size={16} color="#DC3545" style={{marginRight: 5}}/>
            <Text style={styles.txtVerMotivo} allowFontScaling={false}>Ver motivo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <Text style={styles.headerTitle} allowFontScaling={false}>Solicitudes</Text>
        <TouchableOpacity style={styles.botonPerfil} onPress={irAPerfil}>
          {clienteData?.fotoURL ? (
            <Image source={{ uri: clienteData.fotoURL }} style={styles.fotoPerfilCliente} />
          ) : (
            <View style={styles.iconoPerfilContainer}>
              <View style={styles.iconoPerfilUsuario}>
                <View style={styles.cabezaPerfil} />
                <View style={styles.cuerpoPerfil} />
              </View>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {cargando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007BFF" />
        </View>
      ) : solicitudes.length === 0 ? (
        <View style={styles.center}>
          <Feather name="inbox" size={50} color="#CCC" />
          <Text style={styles.emptyText} allowFontScaling={false}>No tienes solicitudes realizadas.</Text>
        </View>
      ) : (
        <FlatList
          data={solicitudes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007BFF']} />}
        />
      )}

      {/* Modal de Motivos */}
      <VerMotivosModal 
        visible={modalMotivosVisible} 
        motivos={motivosSeleccionados} 
        onClose={() => setModalMotivosVisible(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { marginTop: 10, color: '#999', fontSize: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#000000' },
  botonPerfil: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#000000', overflow: 'hidden' },
  fotoPerfilCliente: { width: 45, height: 45, borderRadius: 22.5 },
  iconoPerfilContainer: { justifyContent: 'center', alignItems: 'center' },
  iconoPerfilUsuario: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  cabezaPerfil: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#000000', marginBottom: 2 },
  cuerpoPerfil: { width: 18, height: 12, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: '#000000' },
  listContent: { padding: 15, paddingBottom: 80 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 15, marginBottom: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  avatarBorder: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#000', justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF', overflow: 'hidden', marginRight: 10 },
  avatar: { width: '100%', height: '100%' },
  userName: { fontSize: 17, fontWeight: 'bold', color: '#000', flex: 1, flexShrink: 1 },
  badge: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, flexShrink: 0 },
  badgeText: { fontSize: 13, fontWeight: 'bold' },
  cardBody: { marginLeft: 60 },
  rowDetail: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  iconDetail: { marginRight: 8, width: 20 },
  textDetail: { fontSize: 14, color: '#666', flex: 1 },
  
  footerContainer: { marginLeft: 60, marginTop: 10 },
  botonCalificar: { backgroundColor: '#008FD9', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, alignSelf: 'flex-start' },
  textoBotonCalificar: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  textoCalificada: { color: '#008FD9', fontStyle: 'italic', fontSize: 13, marginTop: 5 },
  
  // Boton Ver Motivo
  btnVerMotivo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F5', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#DC3545', alignSelf: 'flex-start' },
  txtVerMotivo: { color: '#DC3545', fontSize: 13, fontWeight: 'bold' },

  // Estilos Modales
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContentMotivos: { width: '85%', backgroundColor: '#FFF', borderRadius: 15, padding: 25, alignItems: 'center' },
  modalIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  modalText: { textAlign: 'center', color: '#666', marginBottom: 20 },
  motivoItemRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  motivoItemText: { flex: 1, fontSize: 15, color: '#444' },
  btnConfirm: { padding: 12, borderRadius: 10, alignItems: 'center' },
  btnConfirmText: { fontWeight: 'bold', color: '#FFF' },
});