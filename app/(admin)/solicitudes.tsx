import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { obtenerSolicitudesRegistro, gestionarUsuario, obtenerResumen } from '../../services/adminService';
import { enviarCorreoAutomatico } from '../../services/emailService';

// --- MODAL DE CONFIRMACIÓN (SOLO PARA ACEPTAR) ---
const ConfirmModal = ({ visible, nombre, onConfirm, onCancel, procesando }: any) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={[styles.modalIcon, { backgroundColor: '#28A745' }]}>
            <Feather name="check" size={30} color="#FFF" />
          </View>
          <Text style={styles.modalTitle} allowFontScaling={false}>Aceptar Usuario</Text>
          <Text style={styles.modalText} allowFontScaling={false}>
            ¿Confirmas que deseas aceptar a <Text style={{fontWeight:'bold'}}>{nombre}</Text>?
            {'\n'}Se enviará un correo automático de bienvenida.
          </Text>
          
          {procesando ? (
            <ActivityIndicator size="small" color="#008FD9" style={{marginTop: 15}} />
          ) : (
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={onCancel}>
                <Text style={styles.btnCancelText} allowFontScaling={false}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnConfirm, { backgroundColor: '#28A745' }]} onPress={onConfirm}>
                <Text style={styles.btnConfirmText} allowFontScaling={false}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

// --- NUEVO MODAL DE RECHAZO CON MOTIVOS ---
const RechazoModal = ({ visible, nombre, onConfirm, onCancel, procesando, motivosSeleccionados, toggleMotivo }: any) => {
  const opcionesRechazo = [
    'Foto de perfil inapropiada o irreconocible',
    'Nombre o datos personales no válidos',
    'Cédula de identidad vencida o con datos incorrectos',
    'Fecha de nacimiento no concuerda con la foto/cédula',
    'Información general sospechosa o incompleta',
    'Número de teléfono no válido',
    'El CI no coincide con los datos registrados',
    'Documento de identidad no válido',
    'Imagen del CI poco clara o ilegible',
  ];

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalRechazoContent}>
          <View style={[styles.modalIcon, { backgroundColor: '#DC3545', alignSelf: 'center' }]}>
            <Feather name="x" size={30} color="#FFF" />
          </View>
          <Text style={styles.modalTitle} allowFontScaling={false}>Rechazar Usuario</Text>
          <Text style={styles.modalText} allowFontScaling={false}>
            Selecciona los motivos por los que rechazas a <Text style={{fontWeight:'bold'}}>{nombre}</Text>:
          </Text>

          <ScrollView style={styles.opcionesContainer}>
            {opcionesRechazo.map((opcion, index) => {
              const seleccionado = motivosSeleccionados.includes(opcion);
              return (
                <TouchableOpacity 
                  key={index} 
                  style={[styles.checkboxRow, seleccionado && styles.checkboxRowSelected]} 
                  onPress={() => toggleMotivo(opcion)}
                  activeOpacity={0.7}
                >
                  <Feather 
                    name={seleccionado ? "check-square" : "square"} 
                    size={22} 
                    color={seleccionado ? "#DC3545" : "#666"} 
                  />
                  <Text style={[styles.checkboxText, seleccionado && styles.checkboxTextSelected]} allowFontScaling={false}>
                    {opcion}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          
          {procesando ? (
            <ActivityIndicator size="small" color="#DC3545" style={{marginTop: 15}} />
          ) : (
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={onCancel}>
                <Text style={styles.btnCancelText} allowFontScaling={false}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.btnConfirm, { backgroundColor: '#DC3545', opacity: motivosSeleccionados.length === 0 ? 0.5 : 1 }]} 
                onPress={onConfirm}
                disabled={motivosSeleccionados.length === 0}
              >
                <Text style={styles.btnConfirmText} allowFontScaling={false}>Enviar Rechazo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default function AdminSolicitudesScreen() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [resumen, setResumen] = useState({ pendientes: 0, alquiAmigos: 0, clientes: 0 });
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Estados de Modales
  const [modalAceptarVisible, setModalAceptarVisible] = useState(false);
  const [modalRechazarVisible, setModalRechazarVisible] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<any>(null);
  
  // Estado para los motivos de rechazo
  const [motivosRechazo, setMotivosRechazo] = useState<string[]>([]);

  const cargarDatos = async () => {
    try {
        const lista = await obtenerSolicitudesRegistro();
        const stats = await obtenerResumen();
        setSolicitudes(lista);
        setResumen({
          pendientes: lista.length,
          alquiAmigos: stats.alquiAmigos,
          clientes: stats.clientes
        });
    } catch (error) {
        console.error("Error cargando admin:", error);
    } finally {
        setCargando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarDatos();
    setRefreshing(false);
  };

  const abrirModalAceptar = (usuario: any) => {
    setUsuarioSeleccionado(usuario);
    setModalAceptarVisible(true);
  };

  const abrirModalRechazar = (usuario: any) => {
    setUsuarioSeleccionado(usuario);
    setMotivosRechazo([]); // Limpiar motivos anteriores
    setModalRechazarVisible(true);
  };

  const toggleMotivo = (motivo: string) => {
    if (motivosRechazo.includes(motivo)) {
      setMotivosRechazo(motivosRechazo.filter(m => m !== motivo));
    } else {
      setMotivosRechazo([...motivosRechazo, motivo]);
    }
  };

  const ejecutarAccion = async (accion: 'aceptar' | 'rechazar') => {
    if (!usuarioSeleccionado) return;
    
    setProcesandoAccion(true);
    
    // 1. Actualizar en Firebase
    const resultado = await gestionarUsuario(usuarioSeleccionado.id, usuarioSeleccionado.coleccion, accion);
    
    if (resultado.success) {
      // 2. Enviar Correo Automático (Pasando los motivos si es rechazo)
      enviarCorreoAutomatico(
        usuarioSeleccionado.email, 
        usuarioSeleccionado.nombres, 
        accion === 'aceptar',
        accion === 'rechazar' ? motivosRechazo : undefined
      ).then((envioExitoso) => {
          if (!envioExitoso) {
              console.log("Advertencia: El correo no se pudo enviar, pero el usuario fue actualizado.");
          }
      });
      
      setModalAceptarVisible(false);
      setModalRechazarVisible(false);
      await cargarDatos(); 
      
      Alert.alert("Éxito", `Usuario ${accion === 'aceptar' ? 'aceptado' : 'rechazado y notificado'} correctamente.`);
      
    } else {
      setModalAceptarVisible(false);
      setModalRechazarVisible(false);
      Alert.alert("Error", "No se pudo actualizar el usuario en la base de datos.");
    }
    
    setProcesandoAccion(false);
  };

  const irADetalleExtra = (usuario: any) => {
    router.push({
      pathname: '/(admin)/detalle_usuario',
      params: { 
        uid: usuario.id, 
        userType: usuario.userType 
      }
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardContentRow}>
        <View style={styles.leftSide}>
          <View style={styles.headerInfo}>
            <View style={styles.avatarContainer}>
              {item.fotoURL ? (
                <Image source={{ uri: item.fotoURL }} style={styles.avatar} />
              ) : (
                <Feather name="user" size={30} color="#555" />
              )}
            </View>
            <View style={{marginLeft: 10, flex: 1}}>
              <Text style={styles.nombre} numberOfLines={1} allowFontScaling={false}>{item.nombres}</Text>
              <View style={[styles.badge, item.userType === 'alqui-amigo' ? styles.bgAzul : styles.bgCeleste]}>
                <Text style={styles.badgeText} allowFontScaling={false}>
                  {item.userType === 'alqui-amigo' ? 'Alqui-Amigo' : 'Cliente'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.detailsContainer}>
            <View style={styles.rowDetail}>
              <Feather name="activity" size={14} color="#666" />
              <Text style={styles.detailText} allowFontScaling={false}> Nacimiento: {item.fechaNacimiento}</Text>
            </View>
            <View style={styles.rowDetail}>
              <Feather name="credit-card" size={14} color="#666" />
              <Text style={styles.detailText} allowFontScaling={false}> Cédula: {item.cedula}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.actionsContainer}>
          <View style={styles.topButtons}>
            <TouchableOpacity style={styles.btnCheck} onPress={() => abrirModalAceptar(item)}>
              <Feather name="check" size={20} color="#FFF" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.btnCross} onPress={() => abrirModalRechazar(item)}>
              <Feather name="x" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.btnEye} onPress={() => irADetalleExtra(item)}>
            <Feather name="eye" size={18} color="#000" />
            <Text style={styles.textVer} allowFontScaling={false}>Ver</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.header}>
        <Text style={styles.headerTitle} allowFontScaling={false}>Panel Administrador</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle} allowFontScaling={false}>Solicitudes de registro</Text>
        
        {cargando ? (
          <ActivityIndicator size="large" color="#008FD9" />
        ) : solicitudes.length === 0 ? (
          <Text style={styles.emptyText} allowFontScaling={false}>No hay solicitudes pendientes.</Text>
        ) : (
          solicitudes.map((item) => <View key={item.id}>{renderItem({ item })}</View>)
        )}

        <Text style={styles.sectionTitle} allowFontScaling={false}>Resumen</Text>
        
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.bgCelesteLight]}>
            <Feather name="user-plus" size={24} color="#008FD9" />
            <Text style={styles.statLabel} allowFontScaling={false}>Pendientes:</Text>
            <Text style={styles.statNumber} allowFontScaling={false}>#{resumen.pendientes}</Text>
          </View>
          <View style={[styles.statCard, styles.bgAzulLight]}>
            <Feather name="users" size={24} color="#0056b3" />
            <Text style={styles.statLabel} allowFontScaling={false}>Alqui-Amigos:</Text>
            <Text style={styles.statNumber} allowFontScaling={false}>#{resumen.alquiAmigos}</Text>
          </View>
        </View>
        
        <View style={[styles.statCard, styles.bgCelesteLight, { marginTop: 10, width: '48%' }]}>
            <Feather name="users" size={24} color="#008FD9" />
            <Text style={styles.statLabel} allowFontScaling={false}>Clientes:</Text>
            <Text style={styles.statNumber} allowFontScaling={false}>#{resumen.clientes}</Text>
        </View>
      </ScrollView>

      {/* Modal para Aceptar */}
      <ConfirmModal 
        visible={modalAceptarVisible} 
        nombre={usuarioSeleccionado?.nombres} 
        onConfirm={() => ejecutarAccion('aceptar')}
        onCancel={() => setModalAceptarVisible(false)}
        procesando={procesandoAccion}
      />

      {/* Modal para Rechazar */}
      <RechazoModal 
        visible={modalRechazarVisible} 
        nombre={usuarioSeleccionado?.nombres} 
        onConfirm={() => ejecutarAccion('rechazar')}
        onCancel={() => setModalRechazarVisible(false)}
        procesando={procesandoAccion}
        motivosSeleccionados={motivosRechazo}
        toggleMotivo={toggleMotivo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  header: { paddingTop: 50, paddingBottom: 15, alignItems: 'center', backgroundColor: '#FFF', elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2 },
  cardContentRow: { flexDirection: 'row', justifyContent: 'space-between' },
  leftSide: { flex: 1, paddingRight: 10 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatarContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  nombre: { fontWeight: 'bold', fontSize: 16 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start', marginTop: 2 },
  bgAzul: { backgroundColor: '#008FD9' },
  bgCeleste: { backgroundColor: '#80BDFF' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  detailsContainer: { marginTop: 5 },
  rowDetail: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  detailText: { fontSize: 13, color: '#555' },
  actionsContainer: { width: 95, alignItems: 'center', justifyContent: 'center' },
  topButtons: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  btnCheck: { backgroundColor: '#008FD9', width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnCross: { backgroundColor: '#DC3545', width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnEye: { backgroundColor: '#FFF', width: 90, paddingVertical: 5, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#DDD', flexDirection: 'column' },
  textVer: { fontSize: 11, color: '#000', fontWeight: 'bold', marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statCard: { width: '48%', padding: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  bgCelesteLight: { backgroundColor: '#E0F0FF' },
  bgAzulLight: { backgroundColor: '#D0E1F9' },
  statLabel: { fontSize: 14, color: '#555', marginTop: 5 },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  
  // Modales
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 15, padding: 25, alignItems: 'center' },
  modalRechazoContent: { width: '90%', backgroundColor: '#FFF', borderRadius: 15, padding: 20, maxHeight: '80%' },
  modalIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  modalText: { textAlign: 'center', color: '#666', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 15, width: '100%', marginTop: 10 },
  btnCancel: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#EEE', alignItems: 'center' },
  btnConfirm: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  btnCancelText: { fontWeight: 'bold', color: '#555' },
  btnConfirmText: { fontWeight: 'bold', color: '#FFF' },

  // Opciones de Rechazo (Checkboxes)
  opcionesContainer: { width: '100%', marginBottom: 10 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  checkboxRowSelected: { backgroundColor: '#FFF5F5' }, // Fondo rojito muy claro si está seleccionado
  checkboxText: { flex: 1, marginLeft: 10, fontSize: 14, color: '#444' },
  checkboxTextSelected: { color: '#DC3545', fontWeight: 'bold' }
});