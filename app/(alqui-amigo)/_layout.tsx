import { Tabs } from 'expo-router';
import React from 'react';
import { Feather } from '@expo/vector-icons';

export default function AlquiAmigoLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#008FD9',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#F5F5F5',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          height: 110,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 2,
        },
      }}>
      
      {/* TAB 1: Calendario */}
      <Tabs.Screen
        name="calendario"
        options={{
          title: 'Calendario',
          tabBarIcon: ({ color }) => (
            <Feather name="calendar" size={24} color={color} />
          ),
        }}
      />
      
      {/* TAB 2: Solicitudes (Principal) */}
      <Tabs.Screen
        name="solicitudes"
        options={{
          title: 'Solicitudes',
          tabBarIcon: ({ color }) => (
            <Feather name="message-circle" size={24} color={color} />
          ),
        }}
      />
      
      {/* TAB 3: Ubicación */}
      <Tabs.Screen
        name="ubicacion"
        options={{
          title: 'Tu ubicación',
          tabBarIcon: ({ color }) => (
            <Feather name="map-pin" size={24} color={color} />
          ),
        }}
      />

      {/* TAB 4: Perfil */}
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={24} color={color} />
          ),
        }}
      />

      {/* --- PANTALLA DETALLE (OCULTA Y SIN NAVBAR) --- */}
      <Tabs.Screen
        name="detalle_solicitud"
        options={{
          href: null, // Oculta el botón del menú
          tabBarStyle: { display: 'none' }, // Oculta la barra inferior físicamente
        }}
      />
      <Tabs.Screen
        name="editar_perfil"
        options={{
          href: null, // Oculta el botón del menú
          tabBarStyle: { display: 'none' }, // Oculta la barra inferior físicamente
        }}
      />
    </Tabs>
  );
}