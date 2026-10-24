import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';

export const StudentCardScreen = () => {
  return (
    <View style={styles.container}>
      <Header title="Carte Étudiante Sécurisée" subtitle="Accès Campus & Examen" role="student" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Badge Card Virtuelle */}
        <View style={styles.idCard}>
          <View style={styles.cardHeader}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>U</Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.univName}>UNIVERSITÉ UNISPHERE AI</Text>
              <Text style={styles.academicYear}>ANNÉE ACADÉMIQUE 2025 - 2026</Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>🎓</Text>
            </View>

            <View style={styles.infoCol}>
              <Text style={styles.studentName}>MOUSSA COULIBALY</Text>
              <Text style={styles.matricule}>MATRICULE : ETU-2026-0842</Text>
              <Text style={styles.filiere}>Génie Informatique & IA</Text>
              <Text style={styles.level}>Niveau : Licence 3 LMD</Text>
            </View>
          </View>

          {/* QR Code Container */}
          <View style={styles.qrContainer}>
            <View style={styles.fakeQr}>
              <Text style={styles.qrIcon}>📱</Text>
              <Text style={styles.qrCodeText}>UNISPHERE:SECURE:ETU-2026-0842</Text>
            </View>
            <Text style={styles.qrHint}>Présentez ce QR Code au gardien pour franchir le portail</Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.statusLive}>● STATUT : INSCRIT & ACTIF</Text>
            <Text style={styles.expiryDate}>VALIDE JUSQU'AU 31/08/2026</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Instructions d'accès au campus</Text>
          <Text style={styles.infoText}>• Cette carte numérique est infalsifiable et mise à jour en temps réel.</Text>
          <Text style={styles.infoText}>• Le scan au portail enregistre automatiquement votre présence sur la session du jour.</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, alignItems: 'center', paddingBottom: 32 },
  idCard: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 6,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  logoBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { color: Colors.white, fontSize: 20, fontWeight: '900' },
  cardHeaderText: { flex: 1 },
  univName: { color: Colors.white, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  academicYear: { color: '#94A3B8', fontSize: 10, fontWeight: '600', marginTop: 2 },
  cardBody: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 20 },
  avatarBox: { width: 72, height: 72, borderRadius: 16, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.primary },
  avatarText: { fontSize: 36 },
  infoCol: { flex: 1 },
  studentName: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  matricule: { color: Colors.primary, fontSize: 11, fontWeight: '700', marginTop: 2 },
  filiere: { color: '#E2E8F0', fontSize: 12, marginTop: 4 },
  level: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  qrContainer: { alignItems: 'center', backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginVertical: 8 },
  fakeQr: { width: 150, height: 150, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', padding: 8 },
  qrIcon: { fontSize: 48, marginBottom: 8 },
  qrCodeText: { fontSize: 8, color: '#64748B', fontWeight: '800', textAlign: 'center' },
  qrHint: { fontSize: 11, color: '#64748B', marginTop: 8, textAlign: 'center', fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  statusLive: { color: Colors.accentGreen, fontSize: 11, fontWeight: '800' },
  expiryDate: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  infoCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, width: '100%', marginTop: 16, borderWidth: 1, borderColor: Colors.border },
  infoTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  infoText: { fontSize: 12, color: Colors.textMuted, lineHeight: 18, marginTop: 4 },
});

export default StudentCardScreen;
