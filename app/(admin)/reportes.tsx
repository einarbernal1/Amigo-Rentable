import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  ScrollView
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { obtenerDenunciasPendientes, resolverDenuncia } from '../../services/adminService';

// --- MODAL DE CONFIRMACIÓN ---
const ConfirmActionModal = ({ visible, tipo, nombre, onConfirm, onCancel, procesando }: any) => {
  const esStrike = tipo === 'strike';
  const color = esStrike ? '#FF9800' : '#D50000'; // Naranja o Rojo
  
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={[styles.modalIcon, { backgroundColor: color }]}>
            <Feather name={esStrike ? "alert-triangle" : "slash"} size={30} color="#FFF" />
          </View>
          <Text style={styles.modalTitle}>
            {esStrike ? 'Añadir Falta (Strike)' : 'Dar de Baja (Ban)'}
          </Text>
          <Text style={styles.modalText}>
            {esStrike 
              ? `¿Estás seguro de añadir una falta al historial de ${nombre}?`
              : `¿Estás seguro de BLOQUEAR permanentemente a ${nombre}?`
            }
          </Text>
          
          {procesando ? (
            <ActivityIndicator size="small" color={color} style={{marginTop: 15}} />
          ) : (
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.btnCancel} onPress={onCancel}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.btnConfirm, { backgroundColor: color }]} 
                onPress={onConfirm}
              >
                <Text style={styles.btnConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default function AdminReportesScreen() {
  const [reportes, setReportes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // Estados del Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState<any>(null);
  const [accionModal, setAccionModal] = useState<'strike' | 'ban'>('strike');

  const cargarDatos = async () => {
    const lista = await obtenerDenunciasPendientes();
    setReportes(lista);
    setCargando(false);
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

  const abrirModal = (item: any, accion: 'strike' | 'ban') => {
    setItemSeleccionado(item);
    setAccionModal(accion);
    setModalVisible(true);
  };

  const ejecutarAccion = async () => {
    if (!itemSeleccionado) return;
    setProcesando(true);

    const resultado = await resolverDenuncia(
      itemSeleccionado.id, 
      itemSeleccionado.alqui_amigo_id, 
      accionModal
    );

    if (resultado.success) {
      setModalVisible(false);
      await cargarDatos(); // Recargar lista (el item desaparecerá)
      Alert.alert("Éxito", "Acción aplicada correctamente.");
    } else {
      setModalVisible(false);
      Alert.alert("Error", "No se pudo aplicar la acción.");
    }
    setProcesando(false);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        
        {/* AVATAR */}
        <View style={styles.avatarContainer}>
          {item.datosAcusado.fotoURL ? (
            <Image source={{ uri: item.datosAcusado.fotoURL }} style={styles.avatar} />
          ) : (
            <Feather name="user" size={35} color="#555" />
          )}
        </View>

        {/* INFO */}
        <View style={styles.infoContainer}>
          <Text style={styles.nombre}>{item.datosAcusado.nombres}</Text>
          <View style={styles.badgeRol}>
            <Text style={styles.badgeText}>Alqui-Amigo</Text>
          </View>
        </View>

        {/* BADGE FALTAS (NARANJA) */}
        <View style={styles.badgeFaltas}>
          <Feather name="alert-triangle" size={12} color="#FFF" style={{marginRight: 4}} />
          <Text style={styles.textFaltas}>{item.datosAcusado.faltas} faltas</Text>
        </View>
      </View>

      {/* FILA DE BOTONES Y MOTIVO */}
      <View style={styles.bodyRow}>
        {/* MOTIVO (Izquierda) */}
        <View style={styles.motivoContainer}>
          <Text style={styles.labelMotivo}>Motivo: <Text style={styles.textoMotivo}>{item.motivo}</Text></Text>
          <Text style={styles.descripcion} numberOfLines={2}>{item.descripcion}</Text>
        </View>

        {/* BOTONES DE ACCIÓN (Derecha) */}
        <View style={styles.actionsContainer}>
          {/* Botón Strike (X Negra/Blanca) */}
          <TouchableOpacity 
            style={styles.btnStrike} 
            onPress={() => abrirModal(item, 'strike')}
          >
            <Feather name="x" size={24} color="#000" />
          </TouchableOpacity>

          {/* Botón Ban (Rojo) */}
          <TouchableOpacity 
            style={styles.btnBan} 
            onPress={() => abrirModal(item, 'ban')}
          >
            <Feather name="slash" size={20} color="#FFF" />
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
        <Text style={styles.sectionTitle}>Reporte en cuentas</Text>

        {cargando ? (
          <ActivityIndicator size="large" color="#008FD9" />
        ) : reportes.length === 0 ? (
          <View style={styles.center}>
            <Feather name="check-circle" size={50} color="#CCC" />
            <Text style={styles.emptyText}>No hay reportes pendientes.</Text>
          </View>
        ) : (
          reportes.map((item) => <View key={item.id}>{renderItem({ item })}</View>)
        )}
      </ScrollView>

      <ConfirmActionModal
        visible={modalVisible}
        tipo={accionModal}
        nombre={itemSeleccionado?.datosAcusado.nombres}
        onConfirm={ejecutarAccion}
        onCancel={() => setModalVisible(false)}
        procesando={procesando}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  header: { paddingTop: 50, paddingBottom: 15, alignItems: 'center', backgroundColor: '#FFF', elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, marginTop: 5 },
  center: { alignItems: 'center', marginTop: 50 },
  emptyText: { textAlign: 'center', color: '#999', marginVertical: 20 },

  // CARD
  card: { backgroundColor: '#FFF', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2 },
  
  // HEADER CARD
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatarContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  infoContainer: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  nombre: { fontWeight: 'bold', fontSize: 17, color: '#000' },
  badgeRol: { backgroundColor: '#80BDFF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start', marginTop: 4 },
  badgeText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  
  // BADGE FALTAS (Top Right)
  badgeFaltas: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#FF9800', 
    paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8 
  },
  textFaltas: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },

  // BODY ROW
  bodyRow: { flexDirection: 'row', marginTop: 15, alignItems: 'center' },
  motivoContainer: { flex: 1, paddingRight: 10 },
  labelMotivo: { fontWeight: 'bold', fontSize: 14, color: '#000' },
  textoMotivo: { fontWeight: 'normal', color: '#333' },
  descripcion: { fontSize: 13, color: '#666', marginTop: 4, fontStyle: 'italic' },

  // ACTIONS (Right)
  actionsContainer: { flexDirection: 'row', gap: 10 },
  btnStrike: { 
    width: 45, height: 45, borderRadius: 10, 
    justifyContent: 'center', alignItems: 'center', 
    borderWidth: 1, borderColor: '#000', backgroundColor: '#FFF' 
  },
  btnBan: { 
    width: 45, height: 45, borderRadius: 10, 
    justifyContent: 'center', alignItems: 'center', 
    backgroundColor: '#D50000' 
  },

  // MODAL
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