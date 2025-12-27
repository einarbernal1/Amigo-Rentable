import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Modal,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { getUserData } from '../../services/authService';


const { width, height } = Dimensions.get('window');

// Orden de días para la visualización
const ORDEN_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export default function DetalleUsuarioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { uid, userType } = params;

  const [usuario, setUsuario] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

// EFECTO PARA CARGAR DATOS FRESCOS (Y ARREGLAR LA URL DE LA FOTO)
useEffect(() => {
  const cargarDatosUsuario = async () => {
    if (uid && userType) {
      try {
        // Reutilizamos tu servicio de authService
        const data = await getUserData(uid as string, userType as any);
        setUsuario(data);
      } catch (error) {
        console.error("Error cargando detalle:", error);
      }
    }
    setCargando(false);
  };

  cargarDatosUsuario();
}, [uid, userType]);

// Renderizado de carga
if (cargando) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#008FD9" />
      <Text style={{marginTop: 10, color: '#666'}}>Cargando perfil...</Text>
    </View>
  );
}

// Validación si falló la carga
if (!usuario) {
  return (
    <View style={styles.center}>
      <Feather name="alert-circle" size={50} color="#DC3545" />
      <Text style={{marginTop: 10, color: '#666'}}>No se encontró la información del usuario.</Text>
      <TouchableOpacity onPress={() => router.back()} style={{marginTop: 20}}>
          <Text style={{color: '#008FD9', fontWeight:'bold'}}>Volver</Text>
      </TouchableOpacity>
    </View>
  );
}

  // Función para formatear horarios del Alqui-Amigo
  const renderHorarios = () => {
    if (!usuario.disponibilidadHoraria) return "No especificado";
    
    // Filtramos los días activos y formateamos
    const diasActivos = ORDEN_DIAS.filter(dia => {
        // Verificamos si existe el día y si tiene la propiedad activo (o si el objeto existe se asume activo según tu estructura anterior)
        const diaData = usuario.disponibilidadHoraria[dia];
        // En tu estructura de registro, el objeto del día se guarda si está activo, o puede tener la flag activo.
        // Asumiendo que si está en la BD es porque se guardó. Revisamos si no es null.
        return diaData && (diaData.activo !== false);
      })
      .map(dia => {
        // Convertir "lunes" a "Lun" o nombre corto
        const nombreMap: {[key: string]: string} = { 
          lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom' 
        };
        return nombreMap[dia] || dia;
      });

    return diasActivos.length > 0 ? diasActivos.join(', ') : "Sin días disponibles";
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Detalles del perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* FOTO DE PERFIL (Expandible) */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <View style={styles.avatarContainer}>
              {usuario.fotoURL ? (
                <Image source={{ uri: usuario.fotoURL }} style={styles.avatar} />
              ) : (
                <Feather name="user" size={60} color="#000" />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* INFORMACIÓN GENERAL */}
        <Text style={styles.sectionLabel}>Información general</Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Nombre completo:</Text>
          <View style={styles.valueBox}>
            <Text style={styles.valueText}>{usuario.nombres}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Fecha de nacimiento:</Text>
          <View style={styles.valueBox}>
            <Text style={styles.valueText}>{usuario.fechaNacimiento}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>C.I. Bolivia</Text>
          <View style={styles.valueBox}>
            <Text style={styles.valueText}>{usuario.cedula}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <View style={styles.valueBox}>
            <Text style={styles.valueText} numberOfLines={1} adjustsFontSizeToFit>{usuario.email}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.label}>Teléfono:</Text>
          <View style={styles.valueBox}>
            <Text style={styles.valueText}>
              {usuario.telefono ? `+591 ${usuario.telefono}` : 'N/A'}
            </Text>
          </View>
        </View>

        {/* SECCIONES ESPECÍFICAS DE ALQUI-AMIGO */}
        {usuario.userType === 'alqui-amigo' && (
          <>
            <Text style={styles.sectionLabel}>Hobbies</Text>
            <View style={styles.valueBoxMulti}>
              <Text style={styles.valueText}>
                {usuario.intereses || "No especificados."}
              </Text>
            </View>
          </>
        )}

        {/* DESCRIPCIÓN PERSONAL (Para ambos) */}
        <Text style={styles.sectionLabel}>Descripción Personal</Text>
        <View style={styles.valueBoxMulti}>
          <Text style={styles.valueText}>
            {usuario.descripcion || "Sin descripción."}
          </Text>
        </View>

        {/* DISPONIBILIDAD (Solo Alqui-Amigo) */}
        {usuario.userType === 'alqui-amigo' && (
          <>
            <Text style={styles.sectionLabel}>Disponibilidad</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Días:</Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>{renderHorarios()}</Text>
              </View>
            </View>
          </>
        )}

      </ScrollView>

      {/* MODAL FOTO FULL SCREEN */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          <TouchableOpacity style={styles.closeModal} onPress={() => setModalVisible(false)}>
            <Feather name="x" size={30} color="#FFF" />
          </TouchableOpacity>
          {usuario.fotoURL ? (
            <Image source={{ uri: usuario.fotoURL }} style={styles.fullImage} resizeMode="contain" />
          ) : (
            <Feather name="user" size={100} color="#FFF" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    padding: 20, paddingTop: 50, backgroundColor: '#FFFFFF'
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  backBtn: { padding: 5 },
  content: { padding: 20, paddingBottom: 50 },
  
  // AVATAR
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  avatarContainer: {
    width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#000',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden', backgroundColor: '#FFF'
  },
  avatar: { width: '100%', height: '100%' },

  // FORMULARIO
  sectionLabel: { 
    fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 10, marginTop: 10 
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between'
  },
  label: {
    fontSize: 14, color: '#666', width: '35%', fontWeight: '600'
  },
  valueBox: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    width: '63%', // Resto del espacio
  },
  valueBoxMulti: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 10,
    minHeight: 60,
  },
  valueText: {
    fontSize: 14, color: '#000', fontWeight: '500'
  },

  // MODAL
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closeModal: { position: 'absolute', top: 50, right: 20, padding: 10 },
  fullImage: { width: width, height: height * 0.7 }
});