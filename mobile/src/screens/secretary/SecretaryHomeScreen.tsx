import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';

export const SecretaryHomeScreen = ({ navigation, onLogout }: any) => {
  return (
    <View style={styles.container}>
      <Header
        title="Secrétariat Académique"
        subtitle="Gestion Administrative & Scolarité"
        userName="Mme. Traoré"
        role="secretary"
        onLogout={onLogout}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <StatCard label="Inscriptions" value="450" icon="📝" color={Colors.roleSecretary} subtext="Année en cours" />
          <StatCard label="Certificats" value="12 En attente" icon="📄" color={Colors.accentAmber} subtext="À traiter" />
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Dossiers Incomplets" value="8" icon="⚠️" color={Colors.accentRed} subtext="Pièces manquantes" />
          <StatCard label="Cartes Émises" value="442" icon="🪪" color={Colors.accentGreen} subtext="Taux 98%" />
        </View>

        <Text style={styles.sectionTitle}>Opérations Rapides</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('SecretaryStudents')}>
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={styles.actionText}>Annuaire & Dossiers Étudiants</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('SecretaryCertificates')}>
            <Text style={styles.actionIcon}>📑</Text>
            <Text style={styles.actionText}>Validation des Certificats</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('SecretarySchedules')}>
            <Text style={styles.actionIcon}>🏫</Text>
            <Text style={styles.actionText}>Occupation des Salles & Emploi du Temps</Text>
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

export default SecretaryHomeScreen;
