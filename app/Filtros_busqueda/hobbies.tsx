import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

export default function HobbiesScreen() {
  const router = useRouter();

  // Estado de hobbies seleccionados
  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  // Lista de hobbies disponibles para explorar
  const todosLosHobbies = [
    'Lectura', 'Senderismo', 'Café', 
    'Baile', 'Fotografía', 'Pesca',
    'Voluntariado', 'Deportes', 'Cine',
    'Cocina', 'Videojuegos', 'Música',
    'Arte', 'Viajes', 'Escritura',
    'Jardinería', 'Idiomas', 'Meditación'
  ];

  // Función para añadir/quitar hobbies
  const toggleHobby = (hobby: string) => {
    if (seleccionados.includes(hobby)) {
      // Si ya está, lo quitamos
      setSeleccionados(seleccionados.filter(h => h !== hobby));
    } else {
      // Si no está, lo agregamos
      setSeleccionados([...seleccionados, hobby]);
    }
  };

  const aplicarFiltros = () => {
    // Si no seleccionó nada, mandamos undefined para limpiar el filtro
    const filtrosHobbies = seleccionados.length > 0 ? JSON.stringify(seleccionados) : undefined;

    router.push({
      pathname: '/(tabs)/buscar',
      params: { filtrosHobbies: filtrosHobbies }
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
        <Text style={styles.headerTitle}>Seleccionar Hobbies</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* SECCIÓN 1: Hobbies Seleccionados (Dinámica) */}
        <View style={styles.sectionHeaderContainer}>
          <Text style={styles.sectionTitle}>Hobbies Seleccionados:</Text>
          {seleccionados.length > 0 && (
            <TouchableOpacity onPress={() => setSeleccionados([])}>
              <Text style={styles.limpiarTexto}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.chipsContainer, styles.areaSeleccionada]}>
          {seleccionados.length === 0 ? (
            <Text style={styles.placeholderTexto}>
              Selecciona opciones abajo para agregar aquí
            </Text>
          ) : (
            seleccionados.map((hobby) => (
              <TouchableOpacity
                key={hobby}
                style={[styles.chip, styles.chipSelected]}
                onPress={() => toggleHobby(hobby)}
              >
                <Text style={[styles.chipText, styles.chipTextSelected]}>
                  {hobby} <Feather name="x" size={14} color="#FFF" />
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* SECCIÓN 2: Explorar Hobbies */}
        <Text style={styles.sectionTitle}>Explorar Hobbies:</Text>
        <View style={styles.chipsContainer}>
          {todosLosHobbies.map((hobby) => {
            // Si ya está seleccionado, lo mostramos diferente o deshabilitado visualmente
            const isSelected = seleccionados.includes(hobby);
            return (
              <TouchableOpacity
                key={hobby}
                style={[
                  styles.chip, 
                  isSelected ? styles.chipInactivo : styles.chipNormal
                ]}
                onPress={() => toggleHobby(hobby)}
              >
                <Text style={[
                  styles.chipText, 
                  isSelected ? styles.chipTextInactivo : styles.chipTextNormal
                ]}>
                  {hobby}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>

      {/* Footer Botón */}
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
  sectionHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 20,
    marginBottom: 15,
  },
  limpiarTexto: {
    color: '#DC3545', // Rojo para limpiar
    fontSize: 14,
    fontWeight: '600',
  },
  areaSeleccionada: {
    minHeight: 60,
    backgroundColor: '#F9F9F9',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderStyle: 'dashed', // Borde punteado para indicar zona de drop/selección
  },
  placeholderTexto: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    width: '100%',
    marginTop: 5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 25,
    borderWidth: 1,
    marginRight: 10,
    marginBottom: 10,
  },
  // Estilos Chip Normal (Explorar)
  chipNormal: {
    backgroundColor: '#E0E0E0',
    borderColor: '#CCCCCC',
  },
  chipTextNormal: {
    color: '#333',
    fontWeight: '600',
  },
  // Estilos Chip Seleccionado (Arriba)
  chipSelected: {
    backgroundColor: '#008FD9',
    borderColor: '#008FD9',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  // Estilos Chip Inactivo (Cuando ya está seleccionado abajo)
  chipInactivo: {
    backgroundColor: '#F0F0F0',
    borderColor: '#E0E0E0',
    opacity: 0.5,
  },
  chipTextInactivo: {
    color: '#999',
  },
  chipText: {
    fontSize: 15,
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