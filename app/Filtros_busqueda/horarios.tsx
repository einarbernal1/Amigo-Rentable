import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ScrollView,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function HorariosScreen() {
  const router = useRouter();

  // Estados
  const [turnoSeleccionado, setTurnoSeleccionado] = useState<string | null>(null);
  const [rangoPersonalizado, setRangoPersonalizado] = useState('');

  // Definición de turnos fijos
  const turnos = [
    { id: 'manana', label: 'Mañana', rango: '06:00 - 12:00' },
    { id: 'tarde', label: 'Tarde', rango: '12:00 - 18:00' },
    { id: 'noche', label: 'Noche', rango: '18:00 - 23:59' },
  ];

  const seleccionarTurno = (id: string) => {
    if (turnoSeleccionado === id) {
      setTurnoSeleccionado(null); // Deseleccionar
    } else {
      setTurnoSeleccionado(id);
      setRangoPersonalizado(''); // Limpiar personalizado si selecciona turno
    }
  };

  const confirmarHorarios = () => {
    let filtrosHorario = null;

    if (turnoSeleccionado) {
      const turno = turnos.find(t => t.id === turnoSeleccionado);
      if (turno) {
        filtrosHorario = {
          tipo: 'turno',
          valor: turno.id,
          rangoTexto: turno.rango // Enviamos "06:00 - 12:00"
        };
      }
    } else if (rangoPersonalizado.trim()) {
      // Validar formato simple HH:MM - HH:MM
      const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s*-\s*([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      if (!regex.test(rangoPersonalizado.trim())) {
        Alert.alert("Formato Inválido", "Por favor ingresa el rango en formato 24h. Ej: 09:00 - 12:00");
        return;
      }

      filtrosHorario = {
        tipo: 'personalizado',
        rangoTexto: rangoPersonalizado.trim()
      };
    }

    // Navegar de vuelta con los filtros
    router.push({
      pathname: '/(tabs)/buscar',
      params: { 
        filtrosHorario: filtrosHorario ? JSON.stringify(filtrosHorario) : undefined 
      }
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.botonAtras}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Horarios Disponibles</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Sección Turnos */}
        <Text style={styles.sectionTitle}>Seleccionar Turno</Text>
        <View style={styles.turnosContainer}>
          {turnos.map((turno) => {
            const isSelected = turnoSeleccionado === turno.id;
            return (
              <TouchableOpacity
                key={turno.id}
                style={[
                  styles.botonTurno,
                  isSelected && styles.botonTurnoSelected
                ]}
                onPress={() => seleccionarTurno(turno.id)}
              >
                <Text style={[
                  styles.textoTurno,
                  isSelected && styles.textoTurnoSelected
                ]}>
                  {turno.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sección Personalizado */}
        <Text style={styles.sectionTitle}>Rango de Horas Personalizado</Text>
        <TextInput
          style={styles.inputRango}
          placeholder="Ej: 09:00 - 12:00"
          placeholderTextColor="#999"
          value={rangoPersonalizado}
          onChangeText={(text) => {
            setRangoPersonalizado(text);
            if (text.length > 0) setTurnoSeleccionado(null); // Deseleccionar turno si escribe
          }}
          keyboardType="numbers-and-punctuation" // Ayuda en algunos teclados
        />
        <Text style={styles.helperText}>Usa el formato 24 horas (HH:MM - HH:MM)</Text>

      </ScrollView>

      {/* Botón Confirmar */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.botonConfirmar} onPress={confirmarHorarios}>
          <Text style={styles.botonConfirmarTexto}>Confirmar Horarios</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  botonAtras: {
    padding: 5,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
    color: '#000',
  },
  turnosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  botonTurno: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#000',
    alignItems: 'center',
    backgroundColor: '#FFF', // Fondo por defecto
  },
  botonTurnoSelected: {
    backgroundColor: '#008FD9', // Azul celeste seleccionado
    borderColor: '#008FD9',
  },
  textoTurno: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  textoTurnoSelected: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  inputRango: {
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  helperText: {
    marginTop: 8,
    color: '#888',
    fontSize: 12,
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  botonConfirmar: {
    backgroundColor: '#008FD9',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  botonConfirmarTexto: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});