import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

export const SecretaryCertificatesScreen = () => {
  const [requests, setRequests] = useState([
    { id: 1, student: 'Moussa Coulibaly', matricule: 'ETU-2026-0842', type: 'Certificat de Scolarité', date: '23/10/2026', status: 'En attente' },
    { id: 2, student: 'Aminata Diallo', matricule: 'ETU-2026-0112', type: 'Attestation de Réussite', date: '22/10/2026', status: 'En attente' },
    { id: 3, student: 'Oumar Diop', matricule: 'ETU-2026-0005', type: 'Relevé de Notes Officiel', date: '21/10/2026', status: 'En attente' },
  ]);

  const handleAction = (id: number, action: 'Approuver' | 'Rejeter') => {
    Alert.alert('Action confirmée', `La demande a été marquée comme : ${action}.`);
    setRequests(requests.filter((r) => r.id !== id));
  };

  return (
    <View style={styles.container}>
      <Header title="Demandes de Certificats" subtitle="Validation & Signature Numérique" role="secretary" />

      <ScrollView contentContainerStyle={styles.content}>
        {requests.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Toutes les demandes ont été traitées !</Text>
          </View>
        ) : (
          requests.map((req) => (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.typeText}>{req.type}</Text>
                  <Text style={styles.studentName}>{req.student}</Text>
                  <Text style={styles.meta}>{req.matricule} • Demandé le {req.date}</Text>
                </View>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnReject]}
                  onPress={() => handleAction(req.id, 'Rejeter')}
                >
                  <Text style={styles.rejectText}>✕ Rejeter</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.btnApprove]}
                  onPress={() => handleAction(req.id, 'Approuver')}
                >
                  <Text style={styles.approveText}>✓ Valider & Générer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 32 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  cardTop: { marginBottom: 14 },
  typeText: { fontSize: 11, fontWeight: '800', color: Colors.roleSecretary, textTransform: 'uppercase' },
  studentName: { fontSize: 15, fontWeight: '800', color: Colors.text, marginTop: 2 },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnReject: { backgroundColor: '#FEF2F2' },
  btnApprove: { backgroundColor: Colors.roleSecretary },
  rejectText: { color: Colors.accentRed, fontSize: 12, fontWeight: '700' },
  approveText: { color: Colors.white, fontSize: 12, fontWeight: '800' },
});

export default SecretaryCertificatesScreen;
