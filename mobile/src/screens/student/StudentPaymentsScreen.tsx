import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';

export const StudentPaymentsScreen = () => {
  const tranches = [
    { name: 'Frais d\'inscription', amount: 50000, paid: 50000, deadline: '15/10/2025', status: 'Payé' },
    { name: '1ère Tranche Scolarité', amount: 150000, paid: 150000, deadline: '30/11/2025', status: 'Payé' },
    { name: '2ème Tranche Scolarité', amount: 150000, paid: 150000, deadline: '28/02/2026', status: 'Payé' },
    { name: '3ème Tranche Scolarité', amount: 100000, paid: 0, deadline: '30/04/2026', status: 'En attente' },
  ];

  return (
    <View style={styles.container}>
      <Header title="Scolarité & Paiements" subtitle="Échéancier & Reçus Officiels" role="student" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <StatCard label="Total Scolarité" value="450 000 F" icon="🏷️" color={Colors.text} />
          <StatCard label="Montant Réglé" value="350 000 F" icon="✅" color={Colors.accentGreen} />
        </View>

        <View style={styles.alertCard}>
          <Text style={styles.alertTitle}>Reste à payer : 100 000 FCFA</Text>
          <Text style={styles.alertDesc}>Échéance finale : 30 Avril 2026 (Tranche 3)</Text>
        </View>

        <Text style={styles.sectionTitle}>Détail des Tranches</Text>
        {tranches.map((t, idx) => {
          const isPaid = t.status === 'Payé';
          return (
            <View key={idx} style={styles.trancheCard}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.trancheName}>{t.name}</Text>
                  <Text style={styles.deadline}>Date limite : {t.deadline}</Text>
                </View>
                <View style={[styles.badge, isPaid ? styles.badgePaid : styles.badgePending]}>
                  <Text style={[styles.badgeText, isPaid ? styles.badgeTextPaid : styles.badgeTextPending]}>
                    {t.status}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBottom}>
                <Text style={styles.amountText}>{t.amount.toLocaleString()} FCFA</Text>
                {isPaid && <Text style={styles.receiptLink}>📄 Reçu #REC-{202600 + idx}</Text>}
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
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  alertCard: { backgroundColor: '#FFF7ED', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FED7AA', marginBottom: 16 },
  alertTitle: { fontSize: 15, fontWeight: '800', color: Colors.primaryDark },
  alertDesc: { fontSize: 12, color: '#9A3412', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  trancheCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  trancheName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  deadline: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgePaid: { backgroundColor: '#ECFDF5' },
  badgePending: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  badgeTextPaid: { color: Colors.accentGreen },
  badgeTextPending: { color: Colors.accentAmber },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  amountText: { fontSize: 14, fontWeight: '800', color: Colors.text },
  receiptLink: { fontSize: 11, fontWeight: '700', color: Colors.accent },
});

export default StudentPaymentsScreen;
