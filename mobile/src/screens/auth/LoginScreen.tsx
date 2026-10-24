import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Colors from '../../constants/colors';
import AuthService from '../../services/authService';
import { UserRole } from '../../types/auth';

interface LoginScreenProps {
  onLoginSuccess: (role: string) => void;
}

const DEMO_ACCOUNTS: { label: string; role: UserRole; email: string; icon: string }[] = [
  { label: 'Étudiant', role: 'student', email: 'etudiant@unisphere.ai', icon: '🎓' },
  { label: 'Enseignant', role: 'teacher', email: 'enseignant@unisphere.ai', icon: '👨‍🏫' },
  { label: 'Secrétaire', role: 'secretary', email: 'secretaire@unisphere.ai', icon: '📁' },
  { label: 'Censeur', role: 'censeur', email: 'censeur@unisphere.ai', icon: '⚖️' },
  { label: 'Admin', role: 'admin', email: 'admin@unisphere.ai', icon: '👑' },
  { label: 'Gardien', role: 'guard', email: 'gardien@unisphere.ai', icon: '🛡️' },
  { label: 'Comptable', role: 'accountant', email: 'comptable@unisphere.ai', icon: '💰' },
  { label: 'Alumni', role: 'alumni', email: 'alumni@unisphere.ai', icon: '🤝' },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Erreur', 'Veuillez saisir votre email et mot de passe.');
      return;
    }

    setLoading(true);
    try {
      const res = await AuthService.login(email, password);
      onLoginSuccess(res.user.role || selectedRole);
    } catch (err: any) {
      // Si offline ou dev sans serveur local direct, autoriser l'accès avec le rôle choisi
      Alert.alert(
        'Connexion directe',
        `Serveur non joignable (${err.message}). Voulez-vous continuer dans l'espace ${selectedRole.toUpperCase()} ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Continuer',
            onPress: async () => {
              await AuthService.setDevRole(selectedRole);
              onLoginSuccess(selectedRole);
            },
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoRole = (role: UserRole, demoEmail: string) => {
    setSelectedRole(role);
    setEmail(demoEmail);
    setPassword('unisphere2026');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* En-tête UniSphere AI */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>U</Text>
          </View>
          <Text style={styles.title}>UniSphere AI</Text>
          <Text style={styles.subtitle}>Plateforme Universitaire Mobile Intelligente</Text>
        </View>

        {/* Sélecteur rapide des 8 espaces */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>Sélectionnez votre espace universitaire :</Text>
          <View style={styles.roleGrid}>
            {DEMO_ACCOUNTS.map((item) => {
              const active = selectedRole === item.role;
              return (
                <TouchableOpacity
                  key={item.role}
                  onPress={() => handleSelectDemoRole(item.role, item.email)}
                  activeOpacity={0.8}
                  style={[styles.roleCard, active && styles.roleCardActive]}
                >
                  <Text style={styles.roleIcon}>{item.icon}</Text>
                  <Text style={[styles.roleText, active && styles.roleTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Formulaire de connexion */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Connexion sécurisée</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Adresse Email</Text>
            <TextInput
              style={styles.input}
              placeholder="votre-email@unisphere.ai"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.submitBtnText}>
                Accéder à l'espace {selectedRole.toUpperCase()}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>UniSphere AI Mobile • Système LMD & Gestion Intégrée</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 12,
  },
  logoText: {
    color: Colors.white,
    fontSize: 34,
    fontWeight: '900',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  demoSection: {
    marginBottom: 20,
  },
  demoTitle: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleCard: {
    width: '23%',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  roleCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
  },
  roleIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  roleText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
  },
  roleTextActive: {
    color: Colors.primary,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  footerText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
  },
});

export default LoginScreen;
