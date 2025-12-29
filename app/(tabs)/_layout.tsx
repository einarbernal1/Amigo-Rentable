import { Tabs } from 'expo-router';
import React from 'react';
import { Feather } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007BFF',
        tabBarInactiveTintColor: '#999999',
        tabBarStyle: {
          backgroundColor: '#F5F5F5',
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          height: 108,
          paddingBottom: 12,
          paddingTop: 0,
          paddingHorizontal: 10,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: '600',
          marginTop: 5,
        },
        tabBarItemStyle: {
          paddingVertical: 5,
        },
      }}>
      
      {/* TAB 1: Buscar */}
      <Tabs.Screen
        name="buscar"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color }) => (
            <Feather 
              name="search" 
              size={28} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* TAB 2: Solicitudes */}
      <Tabs.Screen
        name="solicitudes"
        options={{
          title: 'Solicitudes',
          tabBarIcon: ({ color }) => (
            <Feather 
              name="message-square" 
              size={28} 
              color={color} 
            />
          ),
        }}
      />
      
      {/* TAB 3: Tu ubicación */}
      <Tabs.Screen
        name="ubicacion"
        options={{
          title: 'Tu ubicación',
          tabBarIcon: ({ color }) => (
            <Feather 
              name="map-pin" 
              size={28} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}