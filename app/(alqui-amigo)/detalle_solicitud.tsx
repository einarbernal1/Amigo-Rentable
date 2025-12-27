import React, { useState,useEffect } from 'react';
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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const { width, height } = Dimensions.get('window');

export default function DetalleSolicitudScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const { id } = params;
  const [datos, setDatos] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const cargarDetallesCompletos = async () => {
      if (!id) return;

      try {
        // A) Buscar la solicitud
        const solRef = doc(db, 'solicitudes', id as string);
        const solSnap = await getDoc(solRef);

        if (solSnap.exists()) {
          const solData = solSnap.data();

          // B) Buscar datos del cliente asociado
          let clienteInfo = {
            nombreCliente: 'Usuario Desconocido',
            fotoCliente: '',
            email: 'No disponible',
            telefonoCliente: 'N/A',
            genero: 'No esp.',
            fechaNacimiento: ''
          };

          if (solData.cliente_id) {
            const clientRef = doc(db, 'clientes', solData.cliente_id);
            const clientSnap = await getDoc(clientRef);
            
            if (clientSnap.exists()) {
              const cData = clientSnap.data();
              // Mapeamos los datos del cliente
              clienteInfo = {
                nombreCliente: cData.nombres || 'Usuario',
                fotoCliente: cData.fotoURL || '', // <--- ¡AQUÍ LLEGA LA URL CORRECTA!
                email: cData.email || 'No disponible',
                telefonoCliente: cData.telefono || '',
                genero: cData.genero || 'No esp.',
                fechaNacimiento: cData.fechaNacimiento || ''
              };
            }
          }

          // C) Unir todo en un solo objeto para la vista
          setDatos({
            ...clienteInfo,
            fecha: solData.fecha_salida,
            hora: solData.hora_salida,
            duracion: solData.duracion,
            lugar: solData.lugar_asistir,
            detalles_de_la_salida: solData.detalles_de_la_salida
          });
        } else {
            console.log("No existe la solicitud");
        }
      } catch (error) {
        console.error("Error cargando detalles:", error);
      } finally {
        setCargando(false);
      }
    };

    cargarDetallesCompletos();
  }, [id]);

  // Pantalla de carga
  if (cargando) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#008FD9" />
        <Text style={{ marginTop: 10, color: '#666' }}>Cargando detalles...</Text>
      </View>
    );
  }

  if (!datos) return <View style={styles.center}><Text>No se encontró la solicitud.</Text></View>;

  // Calcular edad
  const calcularEdad = (fecha: string) => {
    if (!fecha) return 'N/A';
    // Algunos guardan YYYY-MM-DD, otros timestamps. Asumimos string ISO
    const nacimiento = new Date(fecha);
    if (isNaN(nacimiento.getTime())) return '? años';

    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return `${edad} años`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/(alqui-amigo)/solicitudes")} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Detalles de la solicitud</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={styles.sectionLabel}>Cliente</Text>
        
        {/* CARD CLIENTE */}
        <View style={styles.card}>
          <View style={styles.clienteHeaderRow}>
            {/* Foto Expandible */}
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <View style={styles.avatarContainer}>
                {datos.fotoCliente ? (
                  <Image source={{ uri: datos.fotoCliente }} style={styles.avatar} />
                ) : (
                  <Feather name="user" size={50} color="#555" />
                )}
              </View>
            </TouchableOpacity>
            
            {/* Nombre a la derecha */}
            <View style={styles.nombreContainer}>
              <Text style={styles.nombreCliente}>{datos.nombreCliente}</Text>
              <Text style={styles.subtituloCliente}>Usuario Cliente</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.gridInfo}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Correo</Text>
              <Text style={styles.gridValue} numberOfLines={1}>{datos.email || 'No disponible'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Teléfono</Text>
              <Text style={styles.gridValue}>
                {datos.telefonoCliente ? `+591 ${datos.telefonoCliente}` : 'N/A'}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Género</Text>
              <Text style={styles.gridValue}>{datos.genero || 'No esp.'}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Edad</Text>
              <Text style={styles.gridValue}>{calcularEdad(datos.fechaNacimiento)}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Resumen de la salida</Text>

        {/* CARD RESUMEN SALIDA */}
        <View style={styles.card}>
          <View style={styles.gridInfo}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Fecha</Text>
              <Text style={styles.gridValue}>{datos.fecha}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Hora</Text>
              <Text style={styles.gridValue}>{datos.hora}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Duración</Text>
              <Text style={styles.gridValue}>{datos.duracion} horas</Text>
            </View>
          </View>

          <View style={styles.locationContainer}>
            <Feather name="map-pin" size={18} color="#666" style={{marginTop: 2}} />
            <View style={{marginLeft: 8, flex: 1}}>
              <Text style={styles.gridLabel}>Lugar de encuentro</Text>
              <Text style={styles.gridValue}>{datos.lugar}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Mensaje adjunto del cliente</Text>

        {/* CARD MENSAJE */}
        <View style={[styles.card, styles.messageCard]}>
          <Text style={styles.messageText}>
            {datos.detalles_de_la_salida || "Sin mensaje adjunto."}
          </Text>
        </View>

      </ScrollView>

      {/* MODAL FULL SCREEN PARA FOTO */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalBackground}>
          <TouchableOpacity style={styles.closeModal} onPress={() => setModalVisible(false)}>
            <Feather name="x" size={30} color="#FFF" />
          </TouchableOpacity>
          {datos.fotoCliente ? (
            <Image source={{ uri: datos.fotoCliente }} style={styles.fullImage} resizeMode="contain" />
          ) : (
            <Feather name="user" size={100} color="#FFF" />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    padding: 20, paddingTop: 50, backgroundColor: '#FFF',
    borderBottomWidth: 1, borderColor: '#EEE' 
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  backBtn: { padding: 5 },
  content: { padding: 20, paddingBottom: 50 },
  
  sectionLabel: { 
    color: '#666', fontSize: 15, fontWeight: 'bold', marginBottom: 8, marginTop: 15, marginLeft: 5
  },
  
  // TARJETAS (Color Plomo más fuerte)
  card: {
    backgroundColor: '#EAEAEA', // Gris más notable para que resalte del fondo blanco/claro
    borderRadius: 15,
    padding: 20,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  
  // CLIENTE HEADER HORIZONTAL
  clienteHeaderRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  avatarContainer: {
    width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#000',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden', backgroundColor: '#FFF',
    marginRight: 15
  },
  avatar: { width: '100%', height: '100%' },
  nombreContainer: { flex: 1, justifyContent: 'center' },
  nombreCliente: { fontSize: 22, fontWeight: 'bold', color: '#000', flexWrap: 'wrap' },
  subtituloCliente: { fontSize: 14, color: '#666', marginTop: 2 },

  divider: { height: 1, backgroundColor: '#CCC', marginBottom: 15 },

  // GRID INFO
  gridInfo: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%', marginBottom: 15 },
  gridLabel: { fontSize: 13, color: '#666', marginBottom: 4, fontWeight: '600' },
  gridValue: { fontSize: 16, color: '#000', fontWeight: '500' },

  locationContainer: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 5 },

  messageCard: {
    backgroundColor: '#FFF', // Mensaje en blanco para resaltar texto dentro del grupo gris
    borderWidth: 1, borderColor: '#DDD'
  },
  messageText: { fontSize: 16, color: '#333', lineHeight: 24, fontStyle: 'italic' },

  // MODAL
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  closeModal: { position: 'absolute', top: 50, right: 20, padding: 10 },
  fullImage: { width: width, height: height * 0.7 }
});