import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ApiError } from '@/lib/api';

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? 'Invalid email or password' : err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-tjb-cream flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-border/60">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-tjb-lavender-600 flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-semibold text-tjb-charcoal">
            True Joy Birthing
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Admin dashboard sign in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="shelbi@truejoybirthing.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-tjb-lavender-600 hover:bg-tjb-rose-600 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}