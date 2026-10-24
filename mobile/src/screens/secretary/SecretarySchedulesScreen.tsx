import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

export const SecretarySchedulesScreen = () => {
  const rooms = [
    { name: 'Amphi Principal', capacity: 250, status: 'Occupé', course: 'Conférence Droit L1', time: '08:00 - 12:00' },
    { name: 'Salle B204', capacity: 50, status: 'Occupé', course: 'Génie Logiciel L3', time: '10:30 - 12:30' },
    { name: 'Labo Info 1', capacity: 35, status: 'Disponible', course: 'Libre jusqu\'à 14:00', time: '-' },
    { name: 'Labo Cisco', capacity: 30, status: 'Occupé', course: 'Réseaux & Sécurité', time: '08:30 - 11:30' },
    { name: 'Salle C102', capacity: 45, status: 'Disponible', course: 'Libre', time: '-' },
  ];

  return (
    <View style={styles.container}>
      <Header title="Occupation des Salles" subtitle="Salles de cours & Sessions d'examen" role="secretary" />

      <ScrollView contentContainerStyle={styles.content}>
        {rooms.map((r, i) => {
          const isOcc = r.status === 'Occupé';
          return (
            <View key={i} style={styles.card}>
              <View style={styles.top}>
                <View>
                  <Text style={styles.roomName}>{r.name}</Text>
                  <Text style={styles.capacity}>Capacité : {r.capacity} places</Text>
                </View>
                <View style={[styles.badge, isOcc ? styles.bgOcc : styles.bgFree]}>
                  <Text style={[styles.badgeText, isOcc ? styles.textOcc : styles.textFree]}>{r.status}</Text>
                </View>
              </View>

              <View style={styles.bottom}>
                <Text style={styles.course}>{r.course}</Text>
                {isOcc && <Text style={styles.time}>⏱️ {r.time}</Text>}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  roomName: { fontSize: 15, fontWeight: '800', color: Colors.text },
  capacity: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  bgOcc: { backgroundColor: '#FEF2F2' },
  bgFree: { backgroundColor: '#ECFDF5' },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  textOcc: { color: Colors.accentRed },
  textFree: { color: Colors.accentGreen },
  bottom: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between' },
  course: { fontSize: 13, fontWeight: '600', color: Colors.text },
  time: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
});

export default SecretarySchedulesScreen;
