import React, { useState, useEffect, useCallback } from 'react';
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
  Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { getUserData } from '../../services/authService';

interface SolicitudVisual {
  id: string;
  alqui_amigo_id: string;
  nombreAmigo: string;
  fotoAmigo: string;
  // NUEVOS CAMPOS NECESARIOS
  telefonoAmigo: string; 
  ratingAmigo: number;
  // -----------------------
  lugar: string;
  fecha: string;
  hora: string;
  duracion: number;
  estado: 'pendiente' | 'aceptada' | 'rechazada' | 'concluida';
  yaCalificada: boolean; 
}

export default function SolicitudesScreen() {
  const router = useRouter();
  
  const [solicitudes, setSolicitudes] = useState<SolicitudVisual[]>([]);
  const [cargando, setCargando] = useState(true);
  const [clienteData, setClienteData] = useState<{ nombres: string; fotoURL: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
          let telefonoAmigo = ''; // Variable para guardar el teléfono
          let ratingAmigo = 0;    // Variable para guardar el rating

          try {
            const amigoDoc = await getDoc(doc(db, 'alqui-amigos', data.alqui_amigo_id));
            if (amigoDoc.exists()) {
              const amigoData = amigoDoc.data();
              nombreAmigo = amigoData.nombres;
              fotoAmigo = amigoData.fotoURL;
              // CAMBIO IMPORTANTE: Capturamos los datos que faltaban
              telefonoAmigo = amigoData.telefono || ''; 
              ratingAmigo = amigoData.rating || 0;
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
            alqui_amigo_id: data.alqui_amigo_id,
            nombreAmigo,
            fotoAmigo,
            telefonoAmigo, // Guardamos
            ratingAmigo,   // Guardamos
            lugar: data.lugar_asistir,
            fecha: data.fecha_salida, 
            hora: data.hora_salida,   
            duracion: data.duracion,
            estado: estadoFinal,
            yaCalificada: data.estado_calificacion || false 
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

  const irAPerfil = () => {
    router.push('/Perfil_usuario/perfil');
  };

  const irACalificar = (solicitud: SolicitudVisual) => {
    
    router.push({
      pathname: '/Funciones_usuario_cliente/calificar_experiencia',
      params: { solicitudId: solicitud.id } 
    });
  };

  const renderBadgeEstado = (estado: string) => {
    let colorFondo = '#EEE';
    let colorTexto = '#555';
    let texto = estado.charAt(0).toUpperCase() + estado.slice(1);

    switch (estado) {
      case 'pendiente':
        colorFondo = '#FF9800'; 
        colorTexto = '#FFF';
        break;
      case 'aceptada':
        colorFondo = '#25D366'; 
        colorTexto = '#FFF';
        break;
      case 'rechazada':
        colorFondo = '#DC3545'; 
        colorTexto = '#FFF';
        break;
      case 'concluida':
        colorFondo = '#E0E0E0'; 
        colorTexto = '#777';
        break;
    }

    return (
      <View style={[styles.badge, { backgroundColor: colorFondo }]}>
        <Text style={[styles.badgeText, { color: colorTexto }]}>{texto}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: SolicitudVisual }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarBorder}>
            {item.fotoAmigo ? (
              <Image source={{ uri: item.fotoAmigo }} style={styles.avatar} />
            ) : (
              <Feather name="user" size={24} color="#555" />
            )}
          </View>
          <Text style={styles.userName}>{item.nombreAmigo}</Text>
        </View>
        {renderBadgeEstado(item.estado)}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.rowDetail}>
          <Feather name="activity" size={16} color="#666" style={styles.iconDetail} />
          <Text style={styles.textDetail} numberOfLines={1}>{item.lugar}</Text>
        </View>
        <View style={styles.rowDetail}>
          <Feather name="calendar" size={16} color="#666" style={styles.iconDetail} />
          <Text style={styles.textDetail}>{item.fecha}, {item.hora}</Text>
        </View>
      </View>

      {item.estado === 'concluida' && !item.yaCalificada && (
        <TouchableOpacity 
          style={styles.botonCalificar}
          onPress={() => irACalificar(item)}
        >
          <Text style={styles.textoBotonCalificar}>Calificar</Text>
        </TouchableOpacity>
      )}
      
      {item.estado === 'concluida' && item.yaCalificada && (
        <View style={{ marginTop: 10, marginLeft: 60 }}>
            <Text style={{ color: '#008FD9', fontStyle: 'italic', fontSize: 13 }}>
                ✓ Experiencia calificada
            </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Solicitudes</Text>
        <TouchableOpacity style={styles.botonPerfil} onPress={irAPerfil}>
          {clienteData?.fotoURL ? (
            <Image 
              source={{ uri: clienteData.fotoURL }} 
              style={styles.fotoPerfilCliente} 
            />
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
          <Text style={styles.emptyText}>No tienes solicitudes realizadas.</Text>
        </View>
      ) : (
        <FlatList
          data={solicitudes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#007BFF']}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5', 
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 10,
    color: '#999',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  botonPerfil: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    overflow: 'hidden',
  },
  fotoPerfilCliente: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  iconoPerfilContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconoPerfilUsuario: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cabezaPerfil: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
    marginBottom: 2,
  },
  cuerpoPerfil: {
    width: 18,
    height: 12,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    backgroundColor: '#000000',
  },
  listContent: {
    padding: 15,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBorder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    overflow: 'hidden',
    marginRight: 10,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#000',
  },
  badge: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  cardBody: {
    marginLeft: 60, 
  },
  rowDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  iconDetail: {
    marginRight: 8,
    width: 20,
  },
  textDetail: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  botonCalificar: {
    backgroundColor: '#008FD9',
    marginTop: 15,
    marginLeft: 60,
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  textoBotonCalificar: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});