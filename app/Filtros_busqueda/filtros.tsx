// app/filtros.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';

export default function FiltrosScreen() {
  const router = useRouter();

  // --- ESTADOS DE LOS FILTROS ---
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [genero, setGenero] = useState<string>('Cualquiera');
  const [rangoEdad, setRangoEdad] = useState<number[]>([18, 50]); 

  // --- OPCIONES ---
  const listaHobbies = ['Lectura', 'Senderismo', 'Café', 'Deportes', 'Videojuegos', 'Cine', 'Cocina', 'Arte', 'Música'];
  const listaHorarios = ['Mañana', 'Tarde', 'Noche', 'Fin de semana'];

  // --- HANDLERS ---
  const toggleHobby = (hobby: string) => {
    if (hobbies.includes(hobby)) {
      setHobbies(hobbies.filter(h => h !== hobby));
    } else {
      setHobbies([...hobbies, hobby]);
    }
  };

  const toggleHorario = (horario: string) => {
    if (horarios.includes(horario)) {
      setHorarios(horarios.filter(h => h !== horario));
    } else {
      setHorarios([...horarios, horario]);
    }
  };

  const aplicarFiltros = () => {
    const filtrosAplicados = {
      hobbies,
      horarios,
      genero,
      edadMin: rangoEdad[0],
      edadMax: rangoEdad[1]
    };

    router.push({
      pathname: '/(tabs)/buscar',
      params: { filtros: JSON.stringify(filtrosAplicados) }
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.botonAtras}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Más filtros</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* SECCIÓN HOBBIES */}
        <Text style={styles.seccionTitulo}>Hobbies:</Text>
        <View style={styles.chipsContainer}>
          {listaHobbies.map((hobby) => {
            const isSelected = hobbies.includes(hobby);
            return (
              <TouchableOpacity
                key={hobby}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleHobby(hobby)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {hobby}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SECCIÓN HORARIOS */}
        <Text style={styles.seccionTitulo}>Horarios:</Text>
        <View style={styles.chipsContainer}>
          {listaHorarios.map((horario) => {
            const isSelected = horarios.includes(horario);
            return (
              <TouchableOpacity
                key={horario}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleHorario(horario)}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {horario}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SECCIÓN EDAD */}
        <Text style={styles.seccionTitulo}>Edad:</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.rangoTexto}>{rangoEdad[0]} - {rangoEdad[1]} años</Text>
          <Slider
            value={rangoEdad}
            minimumValue={18}
            maximumValue={65}
            step={1}
            onValueChange={(val) => setRangoEdad(val as number[])}
            animateTransitions
            maximumTrackTintColor="#d3d3d3"
            minimumTrackTintColor="#007BFF"
            thumbStyle={styles.thumbSlider}
            trackStyle={styles.trackSlider}
          />
        </View>

        {/* SECCIÓN GÉNERO */}
        <Text style={styles.seccionTitulo}>Género:</Text>
        <View style={styles.radioContainer}>
          {['Cualquiera', 'Hombre', 'Mujer'].map((opcion) => {
            const isSelected = genero === opcion.toLowerCase() || (opcion === 'Cualquiera' && genero === 'Cualquiera');
            const valorReal = opcion === 'Cualquiera' ? 'Cualquiera' : opcion.toLowerCase();
            
            return (
              <TouchableOpacity 
                key={opcion} 
                style={styles.radioOpcion}
                onPress={() => setGenero(valorReal)}
              >
                <View style={[styles.radioCirculo, isSelected && styles.radioCirculoSelected]}>
                  {isSelected ? <View style={styles.radioPunto} /> : null}
                </View>
                <Text style={styles.radioTexto}>{opcion}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      {/* FOOTER BOTÓN */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.botonAplicar} onPress={aplicarFiltros}>
          <Text style={styles.botonAplicarTexto}>Aplicar filtros</Text>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
    color: '#000',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#E0F0FF',
    borderWidth: 1,
    borderColor: '#007BFF',
    marginRight: 10,
    marginBottom: 10,
  },
  chipSelected: {
    backgroundColor: '#007BFF',
  },
  chipText: {
    color: '#007BFF',
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  sliderContainer: {
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  rangoTexto: {
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 16,
    color: '#666',
  },
  thumbSlider: {
    backgroundColor: '#007BFF',
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  trackSlider: {
    height: 6,
    borderRadius: 3,
  },
  radioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between', 
  },
  radioOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  radioCirculo: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioCirculoSelected: {
    borderColor: '#007BFF',
  },
  radioPunto: {
    height: 12,
    width: 12,
    borderRadius: 6,
    backgroundColor: '#007BFF',
  },
  radioTexto: {
    fontSize: 16,
    color: '#333',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  botonAplicar: {
    backgroundColor: '#008FD9',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  botonAplicarTexto: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});