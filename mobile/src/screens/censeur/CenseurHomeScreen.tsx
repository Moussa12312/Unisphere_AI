import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';

export const CenseurHomeScreen = ({ navigation, onLogout }: any) => {
  return (
    <View style={styles.container}>
      <Header
        title="Direction des Études"
        subtitle="Censure & Régulation Académique LMD"
        userName="Prof. Diop"
        role="censeur"
        onLogout={onLogout}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <StatCard label="Taux Réussite" value="84.6 %" icon="🎓" color={Colors.accentGreen} subtext="Semestre 1 LMD" />
          <StatCard label="Assiduité" value="91.2 %" icon="📊" color={Colors.roleCenseur} subtext="Présences globales" />
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Bulletins Prêts" value="412 / 450" icon="📑" color={Colors.accentPurple} subtext="92% calculés" />
          <StatCard label="Anomalies Notes" value="3 Alertes" icon="⚠️" color={Colors.accentRed} subtext="Nécessite examen" />
        </View>

        <Text style={styles.sectionTitle}>Contrôle Pédagogique</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('CenseurBulletins')}>
            <Text style={styles.actionIcon}>📄</Text>
            <Text style={styles.actionText}>Bulletins & Délibérations LMD</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('CenseurAnomalies')}>
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionText}>Audit des Anomalies de Notation</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginTop: 12, marginBottom: 12 },
  actionGrid: { gap: 10 },
  actionBtn: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: Colors.border },
  actionIcon: { fontSize: 24 },
  actionText: { fontSize: 14, fontWeight: '700', color: Colors.text },
});

export default CenseurHomeScreen;
