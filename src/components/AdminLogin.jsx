// components/AdminLogin.jsx - DEBUG VERSION
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { AuthLayout, AuthField, AuthError, AuthButton } from './ui/AuthLayout';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState({});
  
  const { adminLogin, isAuthenticated, isAdmin, admin } = useAuth();
  const navigate = useNavigate();

  // Debug: Log auth state changes
  useEffect(() => {
    const debugState = {
      isAuthenticated: isAuthenticated(),
      isAdmin: isAdmin(),
      admin: admin,
      timestamp: new Date().toISOString()
    };
    setDebugInfo(debugState);
    console.log('AdminLogin - Auth state changed:', debugState);
    
    // Redirect if already authenticated as admin
    if (isAuthenticated() && isAdmin()) {
      console.log('Already authenticated as admin, redirecting...');
      navigate('/admin-dashboard');
    }
  }, [isAuthenticated, isAdmin, admin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    console.log('Admin login form submitted:', { email, password: '***' });

    try {
      const result = await adminLogin(email, password);
      console.log('Admin login result:', result);
      
      if (result.success) {
        console.log('Admin login successful, navigating to dashboard...');
        navigate('/admin-dashboard');
      } else {
        setError(result.error || 'Admin login failed');
        console.error('Admin login failed:', result.error);
      }
    } catch (error) {
      console.error('Admin login exception:', error);
      setError('An unexpected error occurred: ' + error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <AuthLayout heading="Admin Sign In" subheading="Manage students, bookings and community safety">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError>{error}</AuthError>
        <AuthField icon={Mail} type="email" name="email" placeholder="Admin Email" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <AuthField icon={Lock} type="password" name="password" placeholder="Admin Password" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        <AuthButton loading={loading} loadingText="Signing in...">Sign in as Admin</AuthButton>
      </form>
      <p className="mt-6 text-center text-sm">
        <button onClick={() => navigate('/login')} className="font-medium text-brand-600 hover:text-brand-800">
          Back to student login
        </button>
      </p>
    </AuthLayout>
  );
};

export default AdminLogin;
