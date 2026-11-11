// components/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthLayout, AuthField, AuthError, AuthButton } from './ui/AuthLayout';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated()) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from);
    }
  }, [isAuthenticated, navigate, location]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        // Redirect to intended page or dashboard
        const from = location.state?.from?.pathname || '/dashboard';
        navigate(from);
      } else {
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <AuthLayout heading="Welcome Back!" subheading="Continue your journey towards better mental health">
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthError>{error}</AuthError>
        <AuthField icon={Mail} type="email" name="email" placeholder="Email Address" autoComplete="email"
          value={formData.email} onChange={handleChange} required disabled={loading} />
        <AuthField icon={Lock} type="password" name="password" placeholder="Password" autoComplete="current-password"
          value={formData.password} onChange={handleChange} required disabled={loading} />
        <AuthButton loading={loading} loadingText="Logging in...">Login</AuthButton>
      </form>
      <div className="mt-6 space-y-2 text-center text-sm text-brand-500">
        <p>
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-brand-700 hover:text-brand-900">Sign Up</Link>
        </p>
        <p>
          <Link to="/admin-login" className="text-xs font-medium text-brand-400 hover:text-brand-700">Admin / counsellor login</Link>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Login;
