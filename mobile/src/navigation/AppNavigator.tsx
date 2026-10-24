import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthService from '../services/authService';
import AuthNavigator from './AuthNavigator';
import RoleTabsNavigator from './RoleTabsNavigator';
import Loader from '../components/Loader';

export const AppNavigator = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string>('student');

  useEffect(() => {
    Promise.all([AuthService.getStoredToken(), AuthService.getStoredRole()])
      .then(([token, role]) => {
        setIsAuthenticated(!!token);
        if (role) setUserRole(role);
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  const handleLoginSuccess = (role: string) => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await AuthService.logout();
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) {
    return <Loader message="Démarrage de UniSphere AI Mobile..." />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <RoleTabsNavigator initialRole={userRole} onLogout={handleLogout} />
      ) : (
        <AuthNavigator onLoginSuccess={handleLoginSuccess} />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
