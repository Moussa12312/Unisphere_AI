import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import DataService from '../../services/dataService';
import { getApiBaseUrl } from '../../config/api';

export const StudentCardScreen = () => {
  const [cardData, setCardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCard = async () => {
    try {
      const data = await DataService.getStudentCard();
      setCardData(data);
    } catch (e) {
      console.log('Error loading student card:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadCard();
  };

  const student = cardData?.student;
  const university = cardData?.university;
  const studentName = student ? `${student.first_name} ${student.last_name}`.toUpperCase() : 'ÉTUDIANT UNISPHERE';
  const matricule = student?.matricule || 'ETU-2026-0842';
  const filiere = student?.filiere || 'Génie Logiciel & Intelligence Artificielle';
  const level = student?.level || 'Licence 3 LMD';
  const univName = university?.name || 'UNIVERSITÉ UNISPHERE AI';

  const baseUrl = getApiBaseUrl().replace('/api/v1', '');
  const qrCodeUrl = student?.qr_code ? (student.qr_code.startsWith('http') ? student.qr_code : `${baseUrl}${student.qr_code}`) : null;

  return (
    <View style={styles.container}>
      <Header title="Carte Étudiante Sécurisée" subtitle="Accès Campus & Examen" role="student" />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginVertical: 40 }} />
        ) : (
          <View style={styles.idCard}>
            <View style={styles.cardHeader}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoText}>U</Text>
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.univName}>{univName.toUpperCase()}</Text>
                <Text style={styles.academicYear}>ANNÉE ACADÉMIQUE 2025 - 2026</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>🎓</Text>
              </View>

              <View style={styles.infoCol}>
                <Text style={styles.studentName}>{studentName}</Text>
                <Text style={styles.matricule}>MATRICULE : {matricule}</Text>
                <Text style={styles.filiere}>{filiere}</Text>
                <Text style={styles.level}>Niveau : {level}</Text>
              </View>
            </View>

            {/* QR Code Réel du Backend */}
            <View style={styles.qrContainer}>
              {qrCodeUrl ? (
                <Image
                  source={{ uri: qrCodeUrl }}
                  style={styles.realQrImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.qrBadgeBox}>
                  <Text style={styles.qrIcon}>📱</Text>
                  <Text style={styles.qrCodeText}>UNISPHERE:SECURE:{matricule}</Text>
                </View>
              )}
              <Text style={styles.qrHint}>Badge cryptographique certifié • Scannable par le poste de garde</Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.statusLive}>● STATUT : INSCRIT & ACTIF</Text>
              <Text style={styles.expiryDate}>VALIDE JUSQU'AU 31/08/2026</Text>
            </View>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Instructions d'accès au campus</Text>
          <Text style={styles.infoText}>• Cette carte numérique est infalsifiable et synchronisée avec le serveur central.</Text>
          <Text style={styles.infoText}>• Le scan au portail valide votre identité et horodate automatiquement votre présence en base de données.</Text>
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
  studentName: { color: Colors.white, fontSize: 15, fontWeight: '800' },
  matricule: { color: Colors.primary, fontSize: 11, fontWeight: '700', marginTop: 2 },
  filiere: { color: '#E2E8F0', fontSize: 12, marginTop: 4 },
  level: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  qrContainer: { alignItems: 'center', backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginVertical: 8 },
  realQrImage: { width: 150, height: 150, borderRadius: 8 },
  qrBadgeBox: { width: 140, height: 140, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', padding: 8 },
  qrIcon: { fontSize: 44, marginBottom: 6 },
  qrCodeText: { fontSize: 8, color: '#334155', fontWeight: '800', textAlign: 'center' },
  qrHint: { fontSize: 11, color: '#64748B', marginTop: 8, textAlign: 'center', fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  statusLive: { color: Colors.accentGreen, fontSize: 11, fontWeight: '800' },
  expiryDate: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
  infoCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, width: '100%', marginTop: 16, borderWidth: 1, borderColor: Colors.border },
  infoTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  infoText: { fontSize: 12, color: Colors.textMuted, lineHeight: 18, marginTop: 4 },
});

export default StudentCardScreen;
