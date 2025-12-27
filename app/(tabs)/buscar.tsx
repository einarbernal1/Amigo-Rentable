// BuscarAlquiAmigos.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router'; 
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { getUserData } from '../../services/authService';
import { Feather } from '@expo/vector-icons';

interface Horario {
  inicio: string; 
  fin: string;    
  inicioPeriodo: 'am' | 'pm';
  finPeriodo: 'am' | 'pm';
}

interface AlquiAmigo {
  uid: string;
  nombres: string;
  intereses: string;
  fotoURL: string;
  rating: number;
  tarifa: string;
  descripcion: string;
  genero?: string;         
  fechaNacimiento?: string;
  telefono?: string;
  disponibilidadHoraria?: Record<string, Horario | null>;
}

interface ClienteData {
  nombres: string;
  fotoURL: string;
}

export default function BuscarAlquiAmigos() {
  const router = useRouter();
  const params = useLocalSearchParams(); 

  const [busqueda, setBusqueda] = useState('');
  const [alquiAmigos, setAlquiAmigos] = useState<AlquiAmigo[]>([]);
  const [alquiAmigosFiltrados, setAlquiAmigosFiltrados] = useState<AlquiAmigo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [clienteData, setClienteData] = useState<ClienteData | null>(null);

  useEffect(() => {
    cargarAlquiAmigos();
    cargarDatosCliente();
  }, []);

  useEffect(() => {
    filtrarAlquiAmigos();
  }, [busqueda, alquiAmigos, params.filtros, params.filtrosHorario, params.filtrosHobbies]);

  const cargarDatosCliente = async () => {
    try {
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
    } catch (error) {
      console.error('Error al cargar datos del cliente:', error);
    }
  };

  const cargarAlquiAmigos = async () => {
    try {
      setCargando(true);
      const q = query(collection(db, 'alqui-amigos'), orderBy('rating', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const amigos: AlquiAmigo[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        amigos.push({
          uid: doc.id,
          nombres: data.nombres || 'Sin nombre',
          intereses: data.intereses || 'Sin intereses',
          fotoURL: data.fotoURL || '',
          rating: data.rating || 0,
          tarifa: data.tarifa || '0',
          descripcion: data.descripcion || '',
          genero: data.genero || '', 
          fechaNacimiento: data.fechaNacimiento || '',
          telefono: data.telefono || '',
          disponibilidadHoraria: data.disponibilidadHoraria || {},
        });
      });
      
      setAlquiAmigos(amigos);
      setAlquiAmigosFiltrados(amigos);
    } catch (error) {
      console.error('Error al cargar alqui-amigos:', error);
    } finally {
      setCargando(false);
    }
  };

  const calcularEdad = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const convertirAMinutos = (horaStr: string, periodo: 'am' | 'pm') => {
    if (!horaStr) return -1; 
    const [h, m] = horaStr.split(':').map(Number);
    let horas = h;
    if (periodo === 'pm' && horas !== 12) horas += 12;
    if (periodo === 'am' && horas === 12) horas = 0;
    return horas * 60 + m;
  };

  const convertirRangoTextoAMinutos = (horaStr: string) => {
    if (!horaStr) return -1;
    const [h, m] = horaStr.split(':').map(Number);
    return h * 60 + m;
  };

  const verificarDisponibilidad = (amigo: AlquiAmigo, rangoBusqueda: string) => {
    if (!amigo.disponibilidadHoraria) return false;
    if (!rangoBusqueda) return false;

    const partes = rangoBusqueda.split('-');
    if (partes.length !== 2) return false;

    const [inicioBusquedaStr, finBusquedaStr] = partes.map(s => s.trim());
    const inicioBusqueda = convertirRangoTextoAMinutos(inicioBusquedaStr);
    const finBusqueda = convertirRangoTextoAMinutos(finBusquedaStr);

    const dias = Object.keys(amigo.disponibilidadHoraria);
    
    for (const dia of dias) {
      const horarioAmigo = amigo.disponibilidadHoraria[dia];
      if (horarioAmigo && horarioAmigo.inicio && horarioAmigo.fin) { 
        const inicioAmigo = convertirAMinutos(horarioAmigo.inicio, horarioAmigo.inicioPeriodo);
        const finAmigo = convertirAMinutos(horarioAmigo.fin, horarioAmigo.finPeriodo);

        if (inicioAmigo === -1 || finAmigo === -1) continue;

        if (inicioAmigo < finBusqueda && inicioBusqueda < finAmigo) {
          return true; 
        }
      }
    }
    return false;
  };

  const filtrarAlquiAmigos = () => {
    let filtrados = alquiAmigos;

    if (busqueda.trim()) {
      const busquedaLower = busqueda.toLowerCase();
      filtrados = filtrados.filter((amigo) => {
        const nombreCoincide = amigo.nombres.toLowerCase().includes(busquedaLower);
        const interesesCoinciden = amigo.intereses.toLowerCase().includes(busquedaLower);
        return nombreCoincide || interesesCoinciden;
      });
    }

    if (params.filtros) {
      try {
        const filtros = JSON.parse(params.filtros as string);
        
        if (filtros.genero && filtros.genero !== 'Cualquiera') {
          filtrados = filtrados.filter(amigo => 
            amigo.genero?.toLowerCase() === filtros.genero.toLowerCase()
          );
        }
        if (filtros.edadMin && filtros.edadMax) {
          filtrados = filtrados.filter(amigo => {
            const edad = calcularEdad(amigo.fechaNacimiento || '');
            return edad >= filtros.edadMin && edad <= filtros.edadMax;
          });
        }
      } catch (e) { console.error("Error filtros JSON", e); }
    }

    if (params.filtrosHorario) {
      try {
        const filtroHorario = JSON.parse(params.filtrosHorario as string);
        if (filtroHorario && filtroHorario.rangoTexto) {
          filtrados = filtrados.filter(amigo => 
            verificarDisponibilidad(amigo, filtroHorario.rangoTexto)
          );
        }
      } catch (e) { console.error("Error filtro horario", e); }
    }

    if (params.filtrosHobbies) {
      try {
        const hobbiesSeleccionados = JSON.parse(params.filtrosHobbies as string);
        if (Array.isArray(hobbiesSeleccionados) && hobbiesSeleccionados.length > 0) {
          filtrados = filtrados.filter(amigo => {
            const interesesAmigo = amigo.intereses.toLowerCase();
            return hobbiesSeleccionados.some((hobby: string) => 
              interesesAmigo.includes(hobby.toLowerCase())
            );
          });
        }
      } catch (e) { console.error("Error filtro hobbies", e); }
    }

    setAlquiAmigosFiltrados(filtrados);
  };

  const onRefresh = async () => {
    setRefrescando(true);
    setBusqueda('');
    router.setParams({ filtros: undefined, filtrosHorario: undefined, filtrosHobbies: undefined }); 
    await cargarAlquiAmigos();
    setRefrescando(false);
  };

  const irAPerfilAlquiAmigo = (amigo: AlquiAmigo) => {
    // CORRECCIÓN: Pasamos solo el UID, no todo el JSON
    router.push({
      pathname: '/detalle_amigo',
      params: { uid: amigo.uid } 
    });
  };

  // --- FUNCIÓN ACTUALIZADA ---
  const irAMiPerfil = () => {
    // Redirige a la pantalla de perfil recién creada
    router.push('/Perfil_usuario/perfil');
  };

  const irAMasFiltros = () => router.push("/Filtros_busqueda/filtros");
  const irAHorarios = () => router.push("/Filtros_busqueda/horarios");
  const irAHobbies = () => router.push("/Filtros_busqueda/hobbies");

  const renderAlquiAmigo = ({ item }: { item: AlquiAmigo }) => (
    <TouchableOpacity
      style={styles.tarjetaAmigo}
      onPress={() => irAPerfilAlquiAmigo(item)}
      activeOpacity={0.7}
    >
      <View style={styles.contenidoTarjeta}>
        <View style={styles.contenedorFoto}>
          {item.fotoURL ? (
            <Image source={{ uri: item.fotoURL }} style={styles.fotoPerfil} />
          ) : (
            <View style={styles.iconoUsuarioContainer}>
              <View style={styles.iconoUsuario}>
                <View style={styles.cabezaIcono} />
                <View style={styles.cuerpoIcono} />
              </View>
            </View>
          )}
        </View>

        <View style={styles.infoAmigo}>
          <Text style={styles.nombreAmigo}>{item.nombres}</Text>
          <Text style={styles.interesesAmigo} numberOfLines={1}>
            {item.intereses || 'Sin intereses especificados'}
          </Text>
          
          <View style={styles.contenedorRating}>
            <Text style={styles.ratingNumero}>
              {item.rating.toFixed(1)}
            </Text>
            <View style={styles.estrella}>
              <Text style={styles.estrellaTexto}>★</Text>
            </View>
          </View>
        </View>

        <View style={styles.botonFlecha}>
          <Text style={styles.iconoFlecha}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Buscar Alqui-Amigos</Text>
        <TouchableOpacity style={styles.botonPerfil} onPress={irAMiPerfil}>
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

      {/* Barra de búsqueda */}
      <View style={styles.contenedorBusqueda}>
        <View style={styles.barraBusqueda}>
          <Feather name="search" size={20} color="#666666" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.inputBusqueda}
            placeholder="Buscar por nombre o actividad..."
            placeholderTextColor="#999999"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>
      </View>

      {/* Botones de filtro */}
      <View style={{ height: 60 }}>
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.contenedorFiltros}
            contentContainerStyle={styles.contenedorFiltrosContent}
        >
            <TouchableOpacity style={styles.botonFiltro} onPress={irAHobbies}>
            <Feather name="tag" size={18} color="#068FD9" style={{ marginRight: 8 }} />
            <Text style={styles.textoFiltro}>Hobbies</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botonFiltro} onPress={irAHorarios}>
            <Feather name="calendar" size={18} color="#068FD9" style={{ marginRight: 8 }} />
            <Text style={styles.textoFiltro}>Horarios</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botonFiltro} onPress={irAMasFiltros}>
            <Feather name="sliders" size={18} color="#068FD9" style={{ marginRight: 8 }} />
            <Text style={styles.textoFiltro}>Más filtros</Text>
            </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Lista de alqui-amigos */}
      {cargando ? (
        <View style={styles.contenedorCargando}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.textoCargando}>Cargando alqui-amigos...</Text>
        </View>
      ) : alquiAmigosFiltrados.length === 0 ? (
        <View style={styles.contenedorVacio}>
          <Text style={styles.textoVacio}>😕</Text>
          <Text style={styles.textoVacioTitulo}>No se encontraron resultados</Text>
          <Text style={styles.textoVacioSubtitulo}>
            Desliza hacia abajo para reiniciar los filtros.
          </Text>
          {(params.filtros || params.filtrosHorario || params.filtrosHobbies) && (
             <TouchableOpacity onPress={onRefresh} style={{marginTop: 20}}>
                <Text style={{color: '#007BFF', fontWeight:'bold'}}>Limpiar todos los filtros</Text>
             </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={alquiAmigosFiltrados}
          renderItem={renderAlquiAmigo}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.listaContenido}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={onRefresh}
              colors={['#007BFF']}
              tintColor="#007BFF"
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
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F0F0F0',
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
  contenedorBusqueda: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  barraBusqueda: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  inputBusqueda: {
    flex: 1,
    fontSize: 16,
    color: '#333333',
  },
  contenedorFiltros: {
    maxHeight: 70,
    marginBottom: 5,
  },
  contenedorFiltrosContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: 'center',
  },
  botonFiltro: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B3D9FF',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginRight: 10,
    height: 50,
  },
  textoFiltro: {
    fontSize: 15,
    color: '#068FD9',
    fontWeight: 'bold',
  },
  listaContenido: {
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 20,
  },
  tarjetaAmigo: {
    backgroundColor: '#F0F0F0',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
  },
  contenidoTarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  contenedorFoto: {
    marginRight: 15,
  },
  fotoPerfil: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#000000',
  },
  iconoUsuarioContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconoUsuario: {
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cabezaIcono: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#000000',
    marginBottom: 3,
  },
  cuerpoIcono: {
    width: 24,
    height: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: '#000000',
  },
  infoAmigo: {
    flex: 1,
    justifyContent: 'center',
  },
  nombreAmigo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 5,
  },
  interesesAmigo: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 8,
  },
  contenedorRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingNumero: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
    marginRight: 5,
  },
  estrella: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  estrellaTexto: {
    fontSize: 18,
    color: '#FFD700',
  },
  botonFlecha: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  iconoFlecha: {
    fontSize: 40,
    color: '#666666',
    fontWeight: '300',
  },
  contenedorCargando: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoCargando: {
    marginTop: 15,
    fontSize: 16,
    color: '#666666',
  },
  contenedorVacio: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  textoVacio: {
    fontSize: 60,
    marginBottom: 20,
  },
  textoVacioTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
    textAlign: 'center',
  },
  textoVacioSubtitulo: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});