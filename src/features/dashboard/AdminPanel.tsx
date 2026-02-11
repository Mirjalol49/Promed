import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, LogOut, Users, RefreshCw, ToggleLeft, ToggleRight,
  Trash2, Lock, ArrowRight, AlertCircle, ArrowLeft, Shield
} from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';


interface User {
  id: string;
  username: string; // Changed from phone
  phone?: string;
  name: string;
  role: string;
  accountId: string;
  disabled: boolean;
  createdAt?: string; // Supabase returns ISO strings
}

// Admin Login Screen
const AdminLoginScreen: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
  // State
  const [email, setEmail] = useState('superadmin@graft.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      if (userCredential.user) {
        localStorage.setItem('isAdminAuthenticated', 'true'); // Keep this for existing logic if any
        onLogin();
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-promed-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-premium w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-promed-primary to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm shadow-promed-primary/10">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Superadmin Access</h1>
          <p className="text-gray-400">Enter your admin credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-4 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-promed-primary focus:border-transparent text-white placeholder-gray-500 transition-all outline-none"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-promed-primary focus:border-transparent text-white placeholder-gray-500 transition-all outline-none"
                placeholder="Enter admin password"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-premium-blue !py-4"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Access Dashboard</span>
                <ArrowRight className="w-5 h-5 relative z-10" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a href="/" className="text-gray-400 hover:text-white transition flex items-center justify-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Main App
          </a>
        </div>

        <div className="mt-8 text-center text-xs text-gray-600">
          Restricted access. All login attempts are monitored.
        </div>
      </div>
    </div>
  );
};

// Admin Dashboard
const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ username: '', name: '', password: '', role: 'user' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Auto-hide global error after 5 seconds
  useEffect(() => {
    if (globalError) {
      const timer = setTimeout(() => setGlobalError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [globalError]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setGlobalError('');
    console.log('[AdminPanel] Fetching users from Firestore...');

    try {
      const querySnapshot = await getDocs(collection(db, "profiles"));

      const mappedUsers = querySnapshot.docs.map(doc => {
        const u = doc.data();
        return {
          id: doc.id,
          username: u.username || u.phone || 'N/A', // Fallback for old users
          phone: u.phone,
          name: u.full_name,
          role: u.role,
          accountId: u.account_id,
          disabled: u.is_disabled,
          createdAt: u.created_at || u.updated_at
        };
      });

      // Filter by search if needed
      let result = mappedUsers;
      if (search) {
        const searchLower = search.toLowerCase();
        result = mappedUsers.filter(u =>
          (u.username && u.username.toLowerCase().includes(searchLower)) ||
          (u.name && u.name.toLowerCase().includes(searchLower))
        );
      }

      setUsers(result);
      console.log('[AdminPanel] Users loaded successfully:', result.length);
    } catch (error: any) {
      console.error('[AdminPanel] Failed to fetch users:', error);
      setGlobalError(error?.message || 'Failed to fetch users. Check console for details.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    setGlobalError('');

    try {
      // We cannot create Firebase Auth users from client side without logging out the current admin user.
      // Requires Cloud Functions.
      throw new Error("User creation is not available in this version (Requires Firebase Cloud Functions). Please create users via Firebase Console.");

    } catch (error: any) {
      console.error('[AdminPanel] Error creating user:', error);
      setFormError(error?.message || 'Failed to create user');
    } finally {
      setFormLoading(false);
    }
  };

  const handleToggleUser = async (id: string, disabled: boolean) => {
    setGlobalError('');
    console.log('[AdminPanel] Toggling user:', id, 'disabled:', !disabled);

    try {
      const userRef = doc(db, "profiles", id);
      await updateDoc(userRef, {
        is_disabled: !disabled,
        updated_at: new Date().toISOString()
      });

      // Update local state on success
      setUsers(prev => prev.map(u =>
        u.id === id ? { ...u, disabled: !disabled } : u
      ));

      setSuccessMessage(`User ${!disabled ? 'disabled' : 'enabled'} successfully`);
    } catch (error: any) {
      console.error('Error toggling user:', error);
      setGlobalError(error.message || 'Failed to toggle user status');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This will only delete their profile data, not Auth account.')) return;

    setGlobalError('');
    console.log('[AdminPanel] Deleting user:', id);

    try {
      const userRef = doc(db, "profiles", id);
      await deleteDoc(userRef);

      setSuccessMessage('User profile deleted successfully!');
      fetchUsers();
    } catch (error: any) {
      console.error('[AdminPanel] Failed to delete user:', error);
      setGlobalError(error?.message || 'Failed to delete user');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('isAdminAuthenticated');
    onLogout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-800 to-gray-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="p-2 hover:bg-white/10 rounded-lg transition" title="Back to Main App">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </a>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-promed-primary to-purple-600 rounded-xl flex items-center justify-center shadow-sm shadow-promed-primary/10">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Superadmin Panel</h1>
                <p className="text-xs text-gray-400">Manage Users</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Global Success Message */}
        {successMessage && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Global Error Message */}
        {globalError && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Error</p>
              <p className="text-sm text-red-300/80">{globalError}</p>
            </div>
            <button onClick={() => setGlobalError('')} className="p-1 hover:bg-red-500/20 rounded-lg transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by phone or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-promed-primary outline-none transition-all"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchUsers}
              className="px-5 py-3 bg-gray-800/80 hover:bg-gray-700 border border-gray-700 rounded-xl transition-all flex items-center gap-2"
            >
              <RefreshCw className={`w - 4 h - 4 ${loading ? 'animate-spin' : ''} `} />
              Refresh
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-3 btn-premium-blue"
            >
              <Plus className="w-4 h-4 relative z-10" />
              <span>Add User</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-sm shadow-premium">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Username</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        <span>Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <Users className="w-12 h-12 text-gray-600" />
                        <span>No users found</span>
                        <button
                          onClick={() => setShowModal(true)}
                          className="mt-2 text-blue-400 hover:text-blue-300 transition"
                        >
                          Create your first user
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium font-mono text-blue-300">{user.username}</td>
                      <td className="px-6 py-4 text-gray-300">{user.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline - flex px - 3 py - 1 text - xs font - medium rounded - full ${user.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-promed-primary/10 text-promed-primary border border-promed-primary/20'
                          } `}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline - flex px - 3 py - 1 text - xs font - medium rounded - full ${user.disabled
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : 'bg-green-500/20 text-green-300 border border-green-500/30'
                          } `}>
                          {user.disabled ? 'Disabled' : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleUser(user.id, user.disabled)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title={user.disabled ? 'Enable' : 'Disable'}
                          >
                            {user.disabled ? (
                              <ToggleLeft className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ToggleRight className="w-5 h-5 text-green-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-premium">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-promed-primary/20 rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5 text-blue-400" />
              </div>
              Create New User
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Username / Clinic ID</label>
                <input
                  type="text"
                  placeholder="e.g. clinic01"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Name</label>
                <input
                  type="text"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition cursor-pointer hover:border-gray-500 "
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormError('');
                    setFormData({ username: '', name: '', password: '', role: 'user' });
                  }}
                  className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-3 btn-premium-blue"
                >
                  {formLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <span>Create User</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Admin Panel Component
const AdminPanel: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated
    const isAuth = localStorage.getItem('isAdminAuthenticated') === 'true';
    setIsAuthenticated(isAuth);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="w-12 h-12 border-4 border-promed-primary/30 border-t-promed-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return <AdminDashboard onLogout={() => setIsAuthenticated(false)} />;
};

export default AdminPanel;
