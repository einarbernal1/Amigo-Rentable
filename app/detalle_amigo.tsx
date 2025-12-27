import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Linking,
  Modal,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
// Importamos FontAwesome para el logo de WhatsApp
import { Feather, FontAwesome } from '@expo/vector-icons';
import { getUserData } from '../services/authService';


// Obtenemos el ancho de pantalla para la imagen
const { width } = Dimensions.get('window');

// Orden correcto de los días para mostrarlos
const DIAS_ORDENADOS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export default function DetalleAlquiAmigoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { uid } = params;
  
  const [amigo, setAmigo] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [imagenModalVisible, setImagenModalVisible] = useState(false);

  useEffect(() => {
    const cargarDatosAmigo = async () => {
      if (uid) {
        try {
          // Buscamos en la colección 'alqui-amigos'
          const data = await getUserData(uid as string, 'alqui-amigo');
          setAmigo(data);
        } catch (error) {
          console.error("Error cargando perfil amigo:", error);
        }
      }
      setCargando(false);
    };
    cargarDatosAmigo();
  }, [uid]);

  // Pantalla de Carga
  if (cargando) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#008FD9" />
      </View>
    );
  }

  if (!amigo) {
    return (
      <View style={styles.container}>
        <Text style={{textAlign: 'center', marginTop: 50}}>Usuario no encontrado.</Text>
      </View>
    );
  }

  // --- LÓGICA WHATSAPP ---
  const enviarMensajeWhatsApp = () => {
    // Texto predeterminado amigable
    const mensaje = `Hola ${amigo.nombres}, te vi en la app Amigo Rentable y me gustaría contactar contigo.`;
    
    let telefonoLimpio = amigo.telefono ? amigo.telefono.replace(/\s/g, '').replace('+', '') : '';
    
    // Si es un número corto (ej. 77788899), agregamos 591 (Bolivia) por defecto
    if (telefonoLimpio.length === 8) {
      telefonoLimpio = '591' + telefonoLimpio;
    }

    const url = `whatsapp://send?phone=${telefonoLimpio}&text=${encodeURIComponent(mensaje)}`;

    Linking.openURL(url).catch(() => {
      alert('No se pudo abrir WhatsApp. Verifica que esté instalado.');
    });
  };

  //Enviar a formulario de solicitud
  const irAFormularioSolicitud = () => {
    router.push({
      pathname: '/Funciones_usuario_cliente/enviar_solicitud',
      params: { uid: amigo.uid }
    });
  };

  // --- COMPONENTE FILA DE HORARIO ---
  const renderFilaHorario = (dia: string) => {
    const horario = amigo.disponibilidadHoraria?.[dia];
    
    // Capitalizar primera letra (lunes -> Lunes)
    const diaCapitalizado = dia.charAt(0).toUpperCase() + dia.slice(1);

    if (!horario) return null;

    return (
      <View key={dia} style={styles.filaHorario}>
        <Text style={styles.textoDia}>{diaCapitalizado}</Text>
        <Text style={styles.textoHora}>
          {horario.inicio} - {horario.fin}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.botonAtras}>
          <Feather name="arrow-left" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil de Alqui - Amigo</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* FOTO DE PERFIL (Click para ampliar) - CAMBIO 1: Se eliminó el icono de lupa */}
        <TouchableOpacity onPress={() => setImagenModalVisible(true)} style={styles.avatarContainer}>
          <View style={styles.avatarBorder}>
            {amigo.fotoURL ? (
              <Image source={{ uri: amigo.fotoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Feather name="user" size={60} color="#555" />
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* NOMBRE Y RATING */}
        <Text style={styles.nombreUsuario}>{amigo.nombres}</Text>
        
        <View style={styles.ratingContainer}>
          <Text style={styles.ratingTexto}>{amigo.rating ? Number(amigo.rating).toFixed(1) : "0.0"}</Text>
          <Feather name="star" size={20} color="#FFD700" style={{ marginLeft: 5 }} />
        </View>

        {/* SECCIÓN SOBRE MI */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Sobre mi:</Text>
          <Text style={styles.descripcionTexto}>
            {amigo.descripcion || "Este usuario no ha añadido una descripción."}
          </Text>
        </View>

        {/* SECCIÓN HOBBIES */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Hobbies e Intereses:</Text>
          <Text style={styles.textoNormal}>
            {amigo.intereses || "No especificados."}
          </Text>
        </View>

        {/* SECCIÓN DISPONIBILIDAD */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Disponibilidad:</Text>
          <View style={styles.tablaHorarios}>
            {amigo.disponibilidadHoraria ? (
              DIAS_ORDENADOS.map(dia => renderFilaHorario(dia))
            ) : (
              <Text style={styles.textoNormal}>Consultar disponibilidad.</Text>
            )}
          </View>
        </View>

        {/* SECCIÓN CONTACTO (Caja gris) */}
        <View style={styles.contactoCard}>
          <View style={styles.filaContacto}>
            <Text style={styles.labelContacto}>Teléfono:</Text>
            <Text style={styles.valorContacto}>{amigo.telefono || "No disponible"}</Text>
          </View>
          
          <View style={styles.filaContacto}>
            <Text style={styles.labelContacto}>Contacto rápido:</Text>
            {/* CAMBIO 2: Se reemplazó Feather por FontAwesome 'whatsapp' */}
            <TouchableOpacity style={styles.botonWhatsappPequeno} onPress={enviarMensajeWhatsApp}>
                <FontAwesome name="whatsapp" size={18} color="#FFF" style={{marginRight: 6}}/>
                <Text style={styles.textoBotonPequeno}>Enviar mensaje</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* FOOTER BOTÓN GRANDE */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.botonSolicitud} onPress={irAFormularioSolicitud}>
          <Text style={styles.botonSolicitudTexto}>Enviar Solicitud</Text>
        </TouchableOpacity>
      </View>

      {/* --- MODAL DE IMAGEN FULL SCREEN --- */}
      <Modal
        visible={imagenModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setImagenModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <TouchableOpacity 
            style={styles.botonCerrarModal} 
            onPress={() => setImagenModalVisible(false)}
          >
            <Feather name="x" size={30} color="#FFF" />
          </TouchableOpacity>
          
          <Image 
            source={{ uri: amigo.fotoURL }} 
            style={styles.imagenFullScreen} 
            resizeMode="contain" 
          />
        </View>
      </Modal>

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
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  botonAtras: {
    padding: 5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Espacio para el footer
    alignItems: 'center', // Centrar elementos como el avatar
  },
  // AVATAR
  avatarContainer: {
    marginTop: 20,
    marginBottom: 10,
    position: 'relative',
  },
  avatarBorder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  // SE ELIMINÓ EL ESTILO iconoExpandir
  nombreUsuario: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 10,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  ratingTexto: {
    fontSize: 18,
    color: '#FFD700', // Dorado
    fontWeight: 'bold',
  },
  
  // SECCIONES
  seccion: {
    width: '100%',
    marginBottom: 25,
  },
  tituloSeccion: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
  },
  descripcionTexto: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    textAlign: 'justify',
  },
  textoNormal: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  
  // TABLA HORARIOS
  tablaHorarios: {
    marginTop: 5,
  },
  filaHorario: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  textoDia: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  textoHora: {
    fontSize: 15,
    color: '#666',
  },

  // CONTACTO CARD
  contactoCard: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
  },
  filaContacto: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  labelContacto: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  valorContacto: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
  },
  botonWhatsappPequeno: {
    flexDirection: 'row',
    backgroundColor: '#25D366', // Color oficial de WhatsApp (Verde)
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  textoBotonPequeno: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // FOOTER
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
  botonSolicitud: {
    backgroundColor: '#008FD9',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  botonSolicitudTexto: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },

  // MODAL FULL SCREEN
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonCerrarModal: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  imagenFullScreen: {
    width: width,
    height: '80%',
  }
});