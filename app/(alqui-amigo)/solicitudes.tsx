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
  Alert
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { enviarNotificacionPush } from '../../services/notificationService';


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
  estado: 'pendiente' | 'aceptada' | 'rechazada' | 'concluida';
  datosCompletos: any;
  clientePushToken?: string;
}

export default function SolicitudesAlquiAmigoScreen() {
  const router = useRouter();
  const [solicitudes, setSolicitudes] = useState<SolicitudEntrante[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      const pesoEstado = { 'pendiente': 1, 'aceptada': 2, 'rechazada': 3, 'concluida': 4 };
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

      const q = query(
        collection(db, 'solicitudes'),
        where('alqui_amigo_id', '==', user.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const lista: SolicitudEntrante[] = [];

      await Promise.all(
        querySnapshot.docs.map(async (document) => {
          const data = document.data();
          
          // Datos por defecto si falla la carga del cliente
          let clienteInfo: {
            nombres: string;
            fotoURL: string;
            telefono: string;
            email: string;
            genero: string;
            fechaNacimiento: string;
            pushToken: string | null;
          } = {
            nombres: 'Usuario Desconocido',
            fotoURL: '',
            telefono: '',
            email: 'No disponible',
            genero: 'No especificado',
            fechaNacimiento: '',
            pushToken: null
          };

          try {
            const clienteDoc = await getDoc(doc(db, 'clientes', data.cliente_id));
            if (clienteDoc.exists()) {
              const cData = clienteDoc.data();
              clienteInfo = {
                nombres: cData.nombres || 'Usuario',
                fotoURL: cData.fotoURL || '',
                telefono: cData.telefono || '',
                email: cData.email || 'No disponible',
                genero: cData.genero || 'No especificado',
                fechaNacimiento: cData.fechaNacimiento || '',
                pushToken: null as string | null // <--- ¡AQUÍ ES DONDE DEBE IR!
              };
            }
          } catch (e) {
            console.error("Error cargando cliente", e);
          }

          let estadoFinal = data.estado_solicitud;

          lista.push({
            id: document.id,
            cliente_id: data.cliente_id,
            nombreCliente: clienteInfo.nombres,
            fotoCliente: clienteInfo.fotoURL,
            telefonoCliente: clienteInfo.telefono,
            clientePushToken: (clienteInfo as any).pushToken,
            lugar: data.lugar_asistir,
            fecha: data.fecha_salida,
            hora: data.hora_salida,
            duracion: data.duracion,
            estado: estadoFinal,
            
            // --- CORRECCIÓN CRÍTICA DE DATOS ---
            // Mapeamos explícitamente para que detalle_solicitud reciba los nombres correctos
            datosCompletos: { 
              id: document.id,
              // Datos del Cliente
              nombreCliente: clienteInfo.nombres,
              fotoCliente: clienteInfo.fotoURL,
              telefonoCliente: clienteInfo.telefono,
              email: clienteInfo.email,
              genero: clienteInfo.genero,
              fechaNacimiento: clienteInfo.fechaNacimiento,
              // Datos de la Solicitud
              fecha: data.fecha_salida,
              hora: data.hora_salida,
              duracion: data.duracion,
              lugar: data.lugar_asistir,
              detalles_de_la_salida: data.detalles_de_la_salida
            }
          });
        })
      );

      const listaOrdenada = ordenarSolicitudes(lista);
      setSolicitudes(listaOrdenada);

    } catch (error) {
      console.error("Error:", error);
    } finally {
      setCargando(false);
    }
  };

  const cambiarEstado = async (id: string, nuevoEstado: 'aceptada' | 'rechazada') => {
    // 1. Actualizar visualmente primero (Optimistic UI) para que se sienta rápido
    setSolicitudes(prev => {
      const act = prev.map(s => s.id === id ? { ...s, estado: nuevoEstado } : s);
      return ordenarSolicitudes(act);
    });

    try {
      // 2. Actualizar el estado en Firebase (Solicitud)
      await updateDoc(doc(db, 'solicitudes', id), { estado_solicitud: nuevoEstado });

      // --- CAMBIO CLAVE: BUSCAR TOKEN FRESCO ---
      // Buscamos la solicitud en memoria solo para obtener el ID del cliente
      const solicitudEnMemoria = solicitudes.find(s => s.id === id);
      
      if (solicitudEnMemoria) {
        // Vamos directamente a la colección 'clientes' a buscar su token REAL
        const clienteRef = doc(db, 'clientes', solicitudEnMemoria.cliente_id);
        const clienteSnap = await getDoc(clienteRef);

        if (clienteSnap.exists()) {
          const datosCliente = clienteSnap.data();
          const tokenDestino = datosCliente?.pushToken; // Leemos el campo exacto de tu BD

          console.log("Token fresco obtenido de BD:", tokenDestino);

          if (tokenDestino) {
            let titulo = '';
            let cuerpo = '';

            if (nuevoEstado === 'aceptada') {
              titulo = '¡Solicitud Aceptada! 🎉';
              cuerpo = `El AlquiAmigo ha aceptado tu solicitud. Prepara tu salida.`;
            } else {
              titulo = 'Solicitud Rechazada';
              cuerpo = `El AlquiAmigo no puede aceptar tu solicitud en este momento.`;
            }

            // Enviamos la notificación
            await enviarNotificacionPush(
              tokenDestino,
              titulo,
              cuerpo,
              { solicitudId: id, tipo: 'cambio_estado' }
            );
            console.log("✅ Notificación enviada exitosamente");
          } else {
            console.warn("⚠️ El documento del cliente existe, pero el campo 'pushToken' está vacío.");
          }
        } else {
          console.error("❌ No se encontró el documento del cliente en Firebase.");
        }
      }

    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar la solicitud.");
      console.error("Error en cambiarEstado:", error);
      cargarSolicitudesEntrantes(); // Revertir cambios visuales si falla
    }
  };

  const irADetalles = (solicitud: any) => {

    router.push({
      pathname: '/(alqui-amigo)/detalle_solicitud',
      params: { id: solicitud.id } 
    });
  };

  const renderBadge = (estado: string) => {
    let colorFondo = '#EEE';
    let texto = estado.toUpperCase();
    let colorTexto = '#555';

    switch (estado) {
      case 'pendiente': colorFondo = '#FF9800'; colorTexto = '#FFF'; texto = 'Pendiente'; break;
      case 'aceptada': colorFondo = '#28A745'; colorTexto = '#FFF'; texto = 'Aceptada'; break;
      case 'rechazada': colorFondo = '#DC3545'; colorTexto = '#FFF'; texto = 'Rechazada'; break;
      case 'concluida': colorFondo = '#6C757D'; colorTexto = '#FFF'; texto = 'Concluida'; break;
    }

    return (
      <View style={[styles.badge, { backgroundColor: colorFondo }]}>
        <Text style={[styles.badgeText, { color: colorTexto }]}>{texto}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: SolicitudEntrante }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatarBorder}>
            {item.fotoCliente ? (
              <Image source={{ uri: item.fotoCliente }} style={styles.avatar} />
            ) : (
              <Feather name="user" size={24} color="#555" />
            )}
          </View>
          <View>
            <Text style={styles.userName}>{item.nombreCliente}</Text>
            <Text style={styles.userPhone}>
              {item.telefonoCliente ? `+591 ${item.telefonoCliente}` : 'Sin teléfono'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.btnVerDetalles} onPress={() => irADetalles(item.datosCompletos)}>
          <Text style={styles.txtVerDetalles}>Ver Detalles</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.rowInfo}>
          <Feather name="calendar" size={16} color="#666" style={styles.iconInfo} />
          <Text style={styles.textInfo}>{item.fecha}, {item.hora}</Text>
        </View>
        <View style={styles.rowInfo}>
          <Feather name="map-pin" size={16} color="#666" style={styles.iconInfo} />
          <Text style={styles.textInfo}>{item.lugar}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        {item.estado === 'pendiente' ? (
          <View style={styles.footerPendiente}>
            {renderBadge('pendiente')}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.btnAceptar} onPress={() => cambiarEstado(item.id, 'aceptada')}>
                <Text style={styles.txtBtnAction}>Aceptar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnRechazar} onPress={() => cambiarEstado(item.id, 'rechazada')}>
                <Text style={styles.txtBtnAction}>Rechazar</Text>
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
        <Text style={styles.headerTitle}>Solicitudes Recibidas</Text>
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
          ListEmptyComponent={<Text style={styles.emptyText}>No tienes solicitudes nuevas.</Text>}
        />
      )}
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
  userInfo: { flexDirection: 'row', alignItems: 'center' },
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
  badgeText: { fontSize: 12, fontWeight: 'bold' }
});