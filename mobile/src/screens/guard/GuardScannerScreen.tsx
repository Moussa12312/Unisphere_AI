import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Colors from '../../constants/colors';
import Header from '../../components/Header';
import StatCard from '../../components/StatCard';

export const GuardScannerScreen = ({ onLogout }: any) => {
  const [lastScanned, setLastScanned] = useState<any>({
    name: 'Moussa Coulibaly',
    matricule: 'ETU-2026-0842',
    filiere: 'Informatique L3',
    status: 'AUTORISÉ',
    time: 'Il y a 2 min',
  });

  const handleSimulateScan = () => {
    setLastScanned({
      name: 'Aminata Diallo',
      matricule: 'ETU-2026-0112',
      filiere: 'Master 1 Gestion',
      status: 'AUTORISÉ',
      time: 'À l\'instant',
    });
    Alert.alert('Accès Autorisé', 'Étudiant en règle. Passage validé.');
  };

  return (
    <View style={styles.container}>
      <Header
        title="Poste de Garde"
        subtitle="Contrôle d'Accès & Scanner QR"
        userName="Agent Sissoko"
        role="guard"
        onLogout={onLogout}
      />

      <View style={styles.content}>
        <View style={styles.statsRow}>
          <StatCard label="Entrées du jour" value="342" icon="🚪" color={Colors.accentGreen} subtext="Badges scannés" />
          <StatCard label="Alertes refus" value="2" icon="🚫" color={Colors.accentRed} subtext="Non autorisés" />
        </View>

        {/* Caméra / Viseur de Scan */}
        <View style={styles.scannerBox}>
          <View style={styles.viewfinder}>
            <Text style={styles.scanTargetIcon}>📷</Text>
            <Text style={styles.scanTargetText}>Placez le QR Code de la carte étudiante ici</Text>
          </View>

          <TouchableOpacity style={styles.scanTriggerBtn} onPress={handleSimulateScan} activeOpacity={0.8}>
            <Text style={styles.scanTriggerText}>⚡ Scanner le Badge d'Accès</Text>
          </TouchableOpacity>
        </View>

        {/* Résultat du dernier scan */}
        {lastScanned && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Dernier Badge Scanné</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{lastScanned.status}</Text>
              </View>
            </View>

            <Text style={styles.studentName}>{lastScanned.name}</Text>
            <Text style={styles.studentMat}>{lastScanned.matricule} • {lastScanned.filiere}</Text>
            <Text style={styles.scanTime}>Heure : {lastScanned.time}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, flex: 1 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  scannerBox: { backgroundColor: '#0F172A', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  viewfinder: { width: 180, height: 180, borderRadius: 16, borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E293B', marginBottom: 16, padding: 12 },
  scanTargetIcon: { fontSize: 42, marginBottom: 8 },
  scanTargetText: { color: '#94A3B8', fontSize: 11, textAlign: 'center', fontWeight: '600' },
  scanTriggerBtn: { backgroundColor: Colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  scanTriggerText: { color: Colors.white, fontSize: 13, fontWeight: '800' },
  resultCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  resultTitle: { fontSize: 13, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase' },
  statusBadge: { backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { color: Colors.accentGreen, fontSize: 11, fontWeight: '900' },
  studentName: { fontSize: 16, fontWeight: '800', color: Colors.text },
  studentMat: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  scanTime: { fontSize: 11, color: Colors.textLight, marginTop: 6 },
});

export default GuardScannerScreen;
