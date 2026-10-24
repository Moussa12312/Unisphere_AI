import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';

export const AdminHomeScreen = ({ navigation, onLogout }: any) => {
  return (
    <View style={styles.container}>
      <Header
        title="Administration Centrale"
        subtitle="Supervision Globale de l'Université"
        userName="Administrateur"
        role="admin"
        onLogout={onLogout}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <StatCard label="Total Inscrits" value="450 Étudiants" icon="👥" color={Colors.roleAdmin} subtext="Année 2025-2026" />
          <StatCard label="Corps Enseignant" value="35 Professeurs" icon="👨‍🏫" color={Colors.accentGreen} subtext="8 Départements" />
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Scolarités" value="82.4 %" icon="💰" color={Colors.roleAccountant} subtext="Taux de recouvrement" />
          <StatCard label="Système" value="100 % Opérationnel" icon="⚡" color={Colors.accentPurple} subtext="API FastAPI Active" />
        </View>

        <Text style={styles.sectionTitle}>Gestion du Système</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('AdminAccounts')}>
            <Text style={styles.actionIcon}>🛡️</Text>
            <Text style={styles.actionText}>Gestion des Comptes & Rôles</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('AdminSettings')}>
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionText}>Paramètres Institutionnels & LMD</Text>
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

export default AdminHomeScreen;
