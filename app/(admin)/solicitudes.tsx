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
// Importamos el servicio corregido
import { enviarCorreoAutomatico } from '../../services/emailService';

// --- MODAL DE CONFIRMACIÓN ---
const ConfirmModal = ({ visible, tipo, nombre, onConfirm, onCancel, procesando }: any) => {
  const esAceptar = tipo === 'aceptar';
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={[styles.modalIcon, { backgroundColor: esAceptar ? '#28A745' : '#DC3545' }]}>
            <Feather name={esAceptar ? "check" : "x"} size={30} color="#FFF" />
          </View>
          <Text style={styles.modalTitle}>{esAceptar ? 'Aceptar Usuario' : 'Rechazar Usuario'}</Text>
          <Text style={styles.modalText}>
            ¿Confirmas que deseas {esAceptar ? 'aceptar' : 'rechazar'} a <Text style={{fontWeight:'bold'}}>{nombre}</Text>?
            {'\n'}Se intentará enviar un correo automático.
          </Text>
          
          {procesando ? (
            <ActivityIndicator size="small" color="#008FD9" style={{marginTop: 15}} />
          ) : (
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={onCancel}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.btnConfirm, { backgroundColor: esAceptar ? '#28A745' : '#DC3545' }]} 
                onPress={onConfirm}
              >
                <Text style={styles.btnConfirmText}>{esAceptar ? 'Confirmar' : 'Rechazar'}</Text>
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

  const [modalVisible, setModalVisible] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<any>(null);
  const [accionModal, setAccionModal] = useState<'aceptar' | 'rechazar'>('aceptar');

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

  const abrirModal = (usuario: any, accion: 'aceptar' | 'rechazar') => {
    setUsuarioSeleccionado(usuario);
    setAccionModal(accion);
    setModalVisible(true);
  };

  const ejecutarAccion = async () => {
    if (!usuarioSeleccionado) return;
    
    setProcesandoAccion(true);
    
    // 1. Actualizar en Firebase
    const resultado = await gestionarUsuario(usuarioSeleccionado.id, usuarioSeleccionado.coleccion, accionModal);
    
    if (resultado.success) {
      // 2. Enviar Correo Automático (Silencioso)
      // No bloqueamos si falla el correo, lo importante es que la base de datos se actualizó
      enviarCorreoAutomatico(
        usuarioSeleccionado.email, 
        usuarioSeleccionado.nombres, 
        accionModal === 'aceptar'
      ).then((envioExitoso) => {
          if (!envioExitoso) {
              console.log("Advertencia: El correo no se pudo enviar, pero el usuario fue actualizado.");
          }
      });
      
      setModalVisible(false);
      await cargarDatos(); // Recargar lista
      
      // Mostrar éxito de la operación en BD
      Alert.alert("Éxito", `Usuario ${accionModal === 'aceptar' ? 'aceptado' : 'rechazado'} correctamente.`);
      
    } else {
      setModalVisible(false);
      Alert.alert("Error", "No se pudo actualizar el usuario en la base de datos.");
    }
    
    setProcesandoAccion(false);
  };

  const irADetalleExtra = (usuario: any) => {
    // CAMBIO: En lugar de pasar todo el objeto stringify, pasamos IDs
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
        
        {/* LADO IZQUIERDO: INFO */}
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
              <Text style={styles.nombre} numberOfLines={1}>{item.nombres}</Text>
              <View style={[styles.badge, item.userType === 'alqui-amigo' ? styles.bgAzul : styles.bgCeleste]}>
                <Text style={styles.badgeText}>
                  {item.userType === 'alqui-amigo' ? 'Alqui-Amigo' : 'Cliente'}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.detailsContainer}>
            <View style={styles.rowDetail}>
              <Feather name="activity" size={14} color="#666" />
              <Text style={styles.detailText}> Nacimiento: {item.fechaNacimiento}</Text>
            </View>
            <View style={styles.rowDetail}>
              <Feather name="credit-card" size={14} color="#666" />
              <Text style={styles.detailText}> Cédula: {item.cedula}</Text>
            </View>
          </View>
        </View>
        
        {/* LADO DERECHO: BOTONES */}
        <View style={styles.actionsContainer}>
          <View style={styles.topButtons}>
            <TouchableOpacity style={styles.btnCheck} onPress={() => abrirModal(item, 'aceptar')}>
              <Feather name="check" size={20} color="#FFF" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.btnCross} onPress={() => abrirModal(item, 'rechazar')}>
              <Feather name="x" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.btnEye} onPress={() => irADetalleExtra(item)}>
            <Feather name="eye" size={18} color="#000" />
            <Text style={styles.textVer}>Ver</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Panel Administrador</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.sectionTitle}>Solicitudes de registro</Text>
        
        {cargando ? (
          <ActivityIndicator size="large" color="#008FD9" />
        ) : solicitudes.length === 0 ? (
          <Text style={styles.emptyText}>No hay solicitudes pendientes.</Text>
        ) : (
          solicitudes.map((item) => <View key={item.id}>{renderItem({ item })}</View>)
        )}

        <Text style={styles.sectionTitle}>Resumen</Text>
        
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.bgCelesteLight]}>
            <Feather name="user-plus" size={24} color="#008FD9" />
            <Text style={styles.statLabel}>Pendientes:</Text>
            <Text style={styles.statNumber}>#{resumen.pendientes}</Text>
          </View>
          <View style={[styles.statCard, styles.bgAzulLight]}>
            <Feather name="users" size={24} color="#0056b3" />
            <Text style={styles.statLabel}>Alqui-Amigos:</Text>
            <Text style={styles.statNumber}>#{resumen.alquiAmigos}</Text>
          </View>
        </View>
        
        <View style={[styles.statCard, styles.bgCelesteLight, { marginTop: 10, width: '48%' }]}>
            <Feather name="users" size={24} color="#008FD9" />
            <Text style={styles.statLabel}>Clientes:</Text>
            <Text style={styles.statNumber}>#{resumen.clientes}</Text>
        </View>

      </ScrollView>

      <ConfirmModal 
        visible={modalVisible} 
        tipo={accionModal} 
        nombre={usuarioSeleccionado?.nombres} 
        onConfirm={ejecutarAccion}
        onCancel={() => setModalVisible(false)}
        procesando={procesandoAccion}
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 15, padding: 25, alignItems: 'center' },
  modalIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  modalText: { textAlign: 'center', color: '#666', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 15, width: '100%', marginTop: 10 },
  btnCancel: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#EEE', alignItems: 'center' },
  btnConfirm: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  btnCancelText: { fontWeight: 'bold', color: '#555' },
  btnConfirmText: { fontWeight: 'bold', color: '#FFF' },
});