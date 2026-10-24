import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';

export const AccountantHomeScreen = ({ navigation, onLogout }: any) => {
  return (
    <View style={styles.container}>
      <Header
        title="Agence Comptable"
        subtitle="Gestion Financière & Recouvrement"
        userName="Mme. Touré"
        role="accountant"
        onLogout={onLogout}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <StatCard label="Total Encaissé" value="142.5 M F" icon="💵" color={Colors.accentGreen} subtext="Année en cours" />
          <StatCard label="Recouvrement Jour" value="1.85 M F" icon="📈" color={Colors.roleAccountant} subtext="14 versements" />
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Impayés / Retard" value="28.4 M F" icon="⏳" color={Colors.accentRed} subtext="Tranche 2 & 3" />
          <StatCard label="Solde Trésorerie" value="38.2 M F" icon="🏦" color={Colors.accentPurple} subtext="Banque & Caisse" />
        </View>

        <Text style={styles.sectionTitle}>Modules Comptables</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('AccountantPayments')}>
            <Text style={styles.actionIcon}>🧾</Text>
            <Text style={styles.actionText}>Paiements & Reçus de Scolarité</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation?.navigate('AccountantReports')}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>Clôture Journalière & Rapports</Text>
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

export default AccountantHomeScreen;
