import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

// Configuración de idioma español para el calendario
LocaleConfig.locales['es'] = {
  monthNames: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
  monthNamesShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
  dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy'
};
LocaleConfig.defaultLocale = 'es';

interface CitaCalendario {
  id: string;
  nombreCliente: string;
  lugar: string;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:MM
  duracion: number;
}

export default function CalendarioScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [citas, setCitas] = useState<Record<string, CitaCalendario[]>>({});
  const [markedDates, setMarkedDates] = useState<any>({});
  const [cargando, setCargando] = useState(true);

  useFocusEffect(
    useCallback(() => {
      cargarCitasAceptadas();
    }, [])
  );

  const cargarCitasAceptadas = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // 1. Traer solo solicitudes ACEPTADAS
      const q = query(
        collection(db, 'solicitudes'),
        where('alqui_amigo_id', '==', user.uid),
        where('estado_solicitud', '==', 'aceptada')
      );

      const querySnapshot = await getDocs(q);
      const citasMap: Record<string, CitaCalendario[]> = {};
      const marcas: any = {};

      // 2. Procesar cada cita
      await Promise.all(
        querySnapshot.docs.map(async (document) => {
          const data = document.data();
          
          // Obtener nombre del cliente
          let nombreCliente = 'Cliente';
          try {
            const clienteDoc = await getDoc(doc(db, 'clientes', data.cliente_id));
            if (clienteDoc.exists()) {
              nombreCliente = clienteDoc.data().nombres;
            }
          } catch (e) { console.error(e); }

          const cita: CitaCalendario = {
            id: document.id,
            nombreCliente,
            lugar: data.lugar_asistir,
            fecha: data.fecha_salida,
            hora: data.hora_salida,
            duracion: data.duracion
          };

          // Agrupar por fecha
          if (!citasMap[cita.fecha]) {
            citasMap[cita.fecha] = [];
            // Marcar en el calendario (punto azul)
            marcas[cita.fecha] = { marked: true, dotColor: '#008FD9' };
          }
          citasMap[cita.fecha].push(cita);
        })
      );

      // 3. Ordenar citas de cada día por hora
      Object.keys(citasMap).forEach(key => {
        citasMap[key].sort((a, b) => {
          // Convertir "14:00" a minutos para comparar
          const timeA = parseInt(a.hora.split(':')[0]) * 60 + parseInt(a.hora.split(':')[1] || '0');
          const timeB = parseInt(b.hora.split(':')[0]) * 60 + parseInt(b.hora.split(':')[1] || '0');
          return timeA - timeB;
        });
      });

      setCitas(citasMap);
      
      // Asegurar que el día seleccionado tenga el círculo de selección
      const newMarks = { ...marcas };
      if (newMarks[selectedDate]) {
        newMarks[selectedDate] = { ...newMarks[selectedDate], selected: true, selectedColor: '#008FD9' };
      } else {
        newMarks[selectedDate] = { selected: true, selectedColor: '#008FD9' };
      }
      setMarkedDates(newMarks);

    } catch (error) {
      console.error("Error cargando calendario:", error);
    } finally {
      setCargando(false);
    }
  };

  const onDayPress = (day: any) => {
    setSelectedDate(day.dateString);
    
    // Actualizar visualmente la selección sin perder los puntos
    const newMarks = { ...markedDates };
    // Limpiar selección anterior
    Object.keys(newMarks).forEach(key => {
      if (newMarks[key].selected) {
        // Si tenía punto, se lo dejamos, solo quitamos selected
        newMarks[key] = { ...newMarks[key], selected: false, selectedColor: undefined };
        // Si solo era selected (sin evento), lo borramos o dejamos vacío si tenía punto
        if (!newMarks[key].marked) delete newMarks[key]; 
      }
    });

    // Poner selección nueva
    if (newMarks[day.dateString]) {
      newMarks[day.dateString] = { ...newMarks[day.dateString], selected: true, selectedColor: '#008FD9' };
    } else {
      newMarks[day.dateString] = { selected: true, selectedColor: '#008FD9' };
    }
    setMarkedDates(newMarks);
  };

  const renderEvento = ({ item }: { item: CitaCalendario }) => (
    <View style={styles.cardEvento}>
      {/* Columna Hora */}
      <View style={styles.horaContainer}>
        <Text style={styles.horaTexto}>{item.hora}</Text>
        <Text style={styles.duracionTexto}>{item.duracion}h</Text>
      </View>
      
      {/* Divisor Vertical */}
      <View style={styles.divider} />

      {/* Columna Detalles */}
      <View style={styles.infoContainer}>
        <Text style={styles.nombreCliente}>{item.nombreCliente}</Text>
        <View style={styles.ubicacionRow}>
          <Feather name="map-pin" size={14} color="#666" style={{ marginTop: 2, marginRight: 4 }} />
          <Text style={styles.ubicacionTexto} numberOfLines={1}>{item.lugar}</Text>
        </View>
      </View>
    </View>
  );

  // Obtener citas del día seleccionado
  const eventosDelDia = citas[selectedDate] || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Calendario</Text>
      </View>

      {cargando ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#008FD9" /></View>
      ) : (
        <>
          <Calendar
            current={selectedDate}
            onDayPress={onDayPress}
            markedDates={markedDates}
            theme={{
              todayTextColor: '#008FD9',
              arrowColor: '#008FD9',
              textDayFontWeight: '500',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: 'bold',
              selectedDayBackgroundColor: '#008FD9',
              selectedDayTextColor: '#ffffff',
            }}
            enableSwipeMonths={true}
          />

          <View style={styles.listaContainer}>
            <Text style={styles.subtitulo}>Eventos del día</Text>
            
            {eventosDelDia.length === 0 ? (
              <View style={styles.vacioContainer}>
                <Text style={styles.textoVacio}>No tienes salidas programadas para este día.</Text>
              </View>
            ) : (
              <FlatList
                data={eventosDelDia}
                renderItem={renderEvento}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
              />
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  listaContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    padding: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 10,
    elevation: 5, // Sombra en Android
    shadowColor: "#000", // Sombra en iOS
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  subtitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 15,
  },
  
  // CARD EVENTO
  cardEvento: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    // Sombra suave
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  horaContainer: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horaTexto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#008FD9', // Azul principal
  },
  duracionTexto: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: '#EEE',
    marginHorizontal: 15,
  },
  infoContainer: {
    flex: 1,
  },
  nombreCliente: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  ubicacionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ubicacionTexto: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  
  // VACIO
  vacioContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  textoVacio: {
    color: '#999',
    fontSize: 15,
    fontStyle: 'italic',
  },
});