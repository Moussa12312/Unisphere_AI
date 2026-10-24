import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import DataService from '../../services/dataService';

export const GuardHistoryScreen = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    try {
      const data = await DataService.getRecentScans(30);
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log('Error loading guard history:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadHistory();
  };

  return (
    <View style={styles.container}>
      <Header title="Journal des Passages" subtitle="Historique des Entrées / Sorties Réelles" role="guard" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.roleGuard]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.roleGuard} style={{ marginVertical: 30 }} />
        ) : history.length > 0 ? (
          history.map((h, i) => {
            const isLate = h.status === 'late';
            const scanTime = h.scan_time ? new Date(h.scan_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '10:00';
            return (
              <View key={h.id || i} style={styles.card}>
                <View style={styles.top}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.name}>{h.student_name || 'Étudiant'}</Text>
                    <Text style={styles.mat}>
                      {h.matricule} • {h.class_name || h.level || 'Campus'}
                    </Text>
                  </View>
                  <Text style={styles.time}>{scanTime}</Text>
                </View>

                <View style={styles.bottom}>
                  <View style={[styles.badge, isLate ? styles.bgLate : styles.bgAuth]}>
                    <Text style={[styles.badgeText, isLate ? styles.textLate : styles.textAuth]}>
                      {isLate ? 'Entrée avec Retard' : 'Entrée Autorisée (À l\'heure)'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🚪</Text>
            <Text style={styles.emptyTitle}>Aucun passage enregistré aujourd'hui</Text>
            <Text style={styles.emptySubtitle}>Les scans effectués au poste de garde s'afficheront ici en direct.</Text>
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
  name: { fontSize: 14, fontWeight: '800', color: Colors.text },
  mat: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  time: { fontSize: 12, fontWeight: '700', color: Colors.textLight },
  bottom: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  bgAuth: { backgroundColor: '#ECFDF5' },
  bgLate: { backgroundColor: '#FFFBEB' },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  textAuth: { color: Colors.accentGreen },
  textLate: { color: Colors.accentAmber },
  emptyCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, marginTop: 20 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 12, color: Colors.textMuted, textAlign: 'center' },
});

export default GuardHistoryScreen;
