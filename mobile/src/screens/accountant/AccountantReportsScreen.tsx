import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

export const AccountantReportsScreen = () => {
  const handleClosing = () => {
    Alert.alert('Clôture Confirmée', 'La caisse du jour a été arrêtée et archivée.');
  };

  return (
    <View style={styles.container}>
      <Header title="Clôture & États Financiers" subtitle="Journée Comptable du 24/10/2026" role="accountant" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recouvrements du Jour par Canal</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Paiements Mobile Money (Wave/Orange)</Text>
            <Text style={styles.val}>1 150 000 FCFA</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Espèces en Caisse</Text>
            <Text style={styles.val}>450 000 FCFA</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Virements & Chèques</Text>
            <Text style={styles.val}>250 000 FCFA</Text>
          </View>
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>TOTAL JOURNÉE</Text>
            <Text style={styles.totalVal}>1 850 000 FCFA</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.closingBtn} onPress={handleClosing}>
          <Text style={styles.closingBtnText}>🔒 Clôturer la Caisse Journalière</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: 13, color: Colors.textMuted },
  val: { fontSize: 13, fontWeight: '700', color: Colors.text },
  totalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  totalLabel: { fontSize: 13, fontWeight: '900', color: Colors.text },
  totalVal: { fontSize: 15, fontWeight: '900', color: Colors.accentGreen },
  closingBtn: { backgroundColor: Colors.roleAccountant, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  closingBtnText: { color: Colors.white, fontSize: 14, fontWeight: '800' },
});

export default AccountantReportsScreen;
