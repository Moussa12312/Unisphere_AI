import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

export const GuardHistoryScreen = () => {
  const history = [
    { time: '10:28', name: 'Aminata Diallo', mat: 'ETU-2026-0112', status: 'Entrée Autorisée', gate: 'Portail Principal' },
    { time: '10:25', name: 'Moussa Coulibaly', mat: 'ETU-2026-0842', status: 'Entrée Autorisée', gate: 'Portail Principal' },
    { time: '10:14', name: 'Dr. Cheick Coulibaly', mat: 'ENS-2024-0012', status: 'Entrée Enseignant', gate: 'Portail Est' },
    { time: '09:58', name: 'Inconnu / Non Enregistré', mat: 'N/A', status: 'Accès Refusé', gate: 'Portail Principal' },
    { time: '09:42', name: 'Oumar Diop', mat: 'ETU-2026-0005', status: 'Entrée Autorisée', gate: 'Portail Principal' },
  ];

  return (
    <View style={styles.container}>
      <Header title="Journal des Passages" subtitle="Historique des Entrées / Sorties" role="guard" />

      <ScrollView contentContainerStyle={styles.content}>
        {history.map((h, i) => {
          const isRefused = h.status === 'Accès Refusé';
          return (
            <View key={i} style={styles.card}>
              <View style={styles.top}>
                <View>
                  <Text style={styles.name}>{h.name}</Text>
                  <Text style={styles.mat}>{h.mat} • {h.gate}</Text>
                </View>
                <Text style={styles.time}>{h.time}</Text>
              </View>

              <View style={styles.bottom}>
                <View style={[styles.badge, isRefused ? styles.bgRefused : styles.bgAuth]}>
                  <Text style={[styles.badgeText, isRefused ? styles.textRefused : styles.textAuth]}>
                    {h.status}
                  </Text>
                </View>
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
  name: { fontSize: 14, fontWeight: '800', color: Colors.text },
  mat: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  time: { fontSize: 12, fontWeight: '700', color: Colors.textLight },
  bottom: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  bgAuth: { backgroundColor: '#ECFDF5' },
  bgRefused: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  textAuth: { color: Colors.accentGreen },
  textRefused: { color: Colors.accentRed },
});

export default GuardHistoryScreen;
