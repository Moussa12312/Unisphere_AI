import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

export const AccountantPaymentsScreen = () => {
  const [search, setSearch] = useState('');

  const payments = [
    { id: 1, receipt: 'REC-2026-0418', student: 'Moussa Coulibaly', matricule: 'ETU-2026-0842', amount: 150000, tranche: 'Tranche 2', method: 'Wave', date: '23/10/2026' },
    { id: 2, receipt: 'REC-2026-0417', student: 'Aminata Diallo', matricule: 'ETU-2026-0112', amount: 150000, tranche: 'Tranche 2', method: 'Espèces', date: '23/10/2026' },
    { id: 3, receipt: 'REC-2026-0416', student: 'Oumar Diop', matricule: 'ETU-2026-0005', amount: 50000, tranche: 'Inscription', method: 'Orange Money', date: '22/10/2026' },
    { id: 4, receipt: 'REC-2026-0415', student: 'Fatoumata Koné', matricule: 'ETU-2026-0002', amount: 200000, tranche: 'Tranche 1 & 2', method: 'Chèque', date: '22/10/2026' },
  ];

  const filtered = payments.filter(
    (p) => p.student.toLowerCase().includes(search.toLowerCase()) || p.receipt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Header title="Encaissements Scolarité" subtitle="Reçus de Paiement & Modes de Règlement" role="accountant" />

      <View style={styles.searchBox}>
        <TextInput
          style={styles.input}
          placeholder="Rechercher par étudiant ou N° reçu..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {filtered.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.receipt}>{p.receipt}</Text>
                <Text style={styles.student}>{p.student}</Text>
                <Text style={styles.meta}>{p.matricule} • {p.tranche}</Text>
              </View>
              <Text style={styles.amount}>{p.amount.toLocaleString()} F</Text>
            </View>

            <View style={styles.cardBottom}>
              <Text style={styles.method}>💳 {p.method}</Text>
              <Text style={styles.date}>{p.date}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchBox: { padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  input: { backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, color: Colors.text },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  receipt: { fontSize: 11, fontWeight: '800', color: Colors.roleAccountant },
  student: { fontSize: 15, fontWeight: '800', color: Colors.text, marginTop: 2 },
  meta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: '900', color: Colors.accentGreen },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  method: { fontSize: 12, color: Colors.text, fontWeight: '600' },
  date: { fontSize: 11, color: Colors.textLight },
});

export default AccountantPaymentsScreen;
