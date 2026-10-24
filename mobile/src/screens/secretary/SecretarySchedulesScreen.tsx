import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import DataService from '../../services/dataService';

export const SecretarySchedulesScreen = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRooms = async () => {
    try {
      const data = await DataService.getSecretaryRooms();
      setRooms(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log('Error loading rooms:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadRooms();
  };

  return (
    <View style={styles.container}>
      <Header title="Occupation des Salles" subtitle="Salles de cours & Sessions d'examen" role="secretary" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleSecretary]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleSecretary} style={{ marginVertical: 30 }} />
        ) : rooms.length > 0 ? (
          rooms.map((r, i) => {
            const isOcc = i % 2 === 0;
            return (
              <View key={r.id || i} style={styles.card}>
                <View style={styles.top}>
                  <View>
                    <Text style={styles.roomName}>{r.name || `Salle ${r.number || (i + 1)}`}</Text>
                    <Text style={styles.capacity}>
                      {r.building ? `Bâtiment ${r.building} • ` : ''}Capacité : {r.capacity || 50} places
                    </Text>
                  </View>
                  <View style={[styles.badge, isOcc ? styles.bgOcc : styles.bgFree]}>
                    <Text style={[styles.badgeText, isOcc ? styles.textOcc : styles.textFree]}>
                      {isOcc ? 'Occupée' : 'Disponible'}
                    </Text>
                  </View>
                </View>

                <View style={styles.bottom}>
                  <Text style={styles.course}>
                    {isOcc ? (r.current_course || 'Séance de Cours LMD') : 'Libre pour réservation'}
                  </Text>
                  <Text style={styles.time}>{isOcc ? '08:30 - 12:30' : 'Disponible'}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucune salle configurée</Text>
            <Text style={styles.emptySubtitle}>Les salles enregistrées apparaîtront ici.</Text>
          </View>
        )}
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
  emptyCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});

export default SecretarySchedulesScreen;
