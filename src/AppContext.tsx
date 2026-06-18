import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

// Types
export type User = {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  pin?: string;
  has_pin?: boolean;
  role: 'superadmin' | 'admin' | 'user';
  balance: number;
  status: 'active' | 'blocked';
};

export type RouterDevice = {
  id: number;
  name: string;
  ip_address: string;
  api_port?: string;
  username?: string;
  password?: string;
  status: 'online' | 'offline' | 'warning';
  connected_users: number;
};

export type Package = {
  id: number;
  name: string;
  speed: string;
  quota: string;
  duration: string;
  price: number;
  badge_color: string;
  router_id?: number | null;
  mikrotik_profile?: string | null;
};

export type Transaction = {
  id: number;
  user_id: number;
  package_id: number;
  voucher_code: string;
  amount: number;
  payment_method: 'saldo' | 'qris';
  status: 'pending' | 'success' | 'failed';
  created_at: string;
  user_name?: string;
  package_name?: string;
};

export type Promo = {
  id: number;
  title: string;
  subtitle: string;
  color: string;
  icon: string;
  badge: string;
  image_url: string;
  link_type: 'packages' | 'package' | 'external' | 'none';
  link_value: string;
  button_text: string;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  sort_order: number;
  show_on: 'home' | 'landing' | 'both';
};

export type PromoInput = Omit<Promo, 'id'>;

const API = '';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  return res.json();
}

type AppContextType = {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  routers: RouterDevice[];
  packages: Package[];
  transactions: Transaction[];
  promos: Promo[];
  loading: boolean;
  refreshData: () => Promise<void>;
  refreshPromos: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  registerUser: (name: string, email: string, phone_number: string, password: string) => Promise<{ success: boolean; error?: string }>;
  updateUser: (userId: number, data: Partial<User & { password?: string }>) => Promise<void>;
  topupBalance: (userId: number, amount: number) => Promise<void>;
  buyPackage: (pkg: Package, method: 'saldo' | 'qris', pin?: string) => Promise<{ success: boolean; error?: string; voucher_code?: string }>;
  addRouter: (router: Omit<RouterDevice, 'id' | 'status' | 'connected_users'>) => Promise<void>;
  updateRouter: (routerId: number, data: Omit<RouterDevice, 'id' | 'status' | 'connected_users'>) => Promise<void>;
  syncRouter: (routerId: number) => Promise<void>;
  deleteRouter: (routerId: number) => Promise<void>;
  testRouterConnection: (routerId: number) => Promise<{ connected: boolean; message: string; latency?: number }>;
  deleteUser: (userId: number) => Promise<void>;
  deleteVoucher: (txId: number) => Promise<void>;
  addPackage: (pkg: Omit<Package, 'id'>) => Promise<void>;
  updatePackage: (packageId: number, pkg: Omit<Package, 'id'>) => Promise<void>;
  deletePackage: (packageId: number) => Promise<void>;
  generateVoucherReal: (routerId: number, profile: string, name: string, password: string) => Promise<any>;
  getRouterActiveUsers: (routerId: number) => Promise<ActiveUser[]>;
  getRouterProfiles: (routerId: number) => Promise<{ data: MikrotikProfile[]; source: string; warning?: string }>;
  createRouterProfile: (routerId: number, p: ProfileInput) => Promise<void>;
  updateRouterProfile: (routerId: number, profileId: string, p: ProfileInput) => Promise<void>;
  deleteRouterProfile: (routerId: number, profileId: string) => Promise<void>;
};

export type MikrotikProfile = {
  id: string;
  name: string;
  sessionTimeout: string;
  sharedUsers: string;
  rateLimit: string;
};

export type ProfileInput = {
  name: string;
  rateLimit?: string;
  sharedUsers?: string;
  sessionTimeout?: string;
};

export type ActiveUser = {
  id: string;
  user: string;
  address: string;
  macAddress: string;
  uptime: string;
  bytesIn: number;
  bytesOut: number;
  loginBy: string;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

function loadSession(): User | null {
  try {
    const raw = localStorage.getItem('wifi_session');
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function saveSession(user: User | null) {
  if (user) {
    localStorage.setItem('wifi_session', JSON.stringify(user));
  } else {
    localStorage.removeItem('wifi_session');
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, _setCurrentUser] = useState<User | null>(loadSession);
  const [users, setUsers] = useState<User[]>([]);
  const [routers, setRouters] = useState<RouterDevice[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(false);

  const setCurrentUser = (user: User | null) => {
    _setCurrentUser(user);
    saveSession(user);
  };

  const refreshPromos = useCallback(async () => {
    try {
      const res = await apiFetch('/api/promos/public?show_on=home');
      if (res.success) setPromos(res.data);
    } catch (err) {
      console.error('Gagal memuat promo:', err);
    }
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      // Always load packages + promos (needed for user view)
      const pkgRes = await apiFetch('/api/packages');
      if (pkgRes.success) setPackages(pkgRes.data);
      await refreshPromos();

      if (currentUser) {
        if (currentUser.role !== 'user') {
          // Admin-only endpoints — users & routers list
          const [usersRes, routersRes, txRes] = await Promise.all([
            apiFetch('/api/users'),
            apiFetch('/api/routers'),
            apiFetch('/api/transactions'),
          ]);
          if (usersRes.success) setUsers(usersRes.data);
          if (routersRes.success) setRouters(routersRes.data);
          if (txRes.success) setTransactions(txRes.data);
        } else {
          // Regular users only get their own transactions (server scopes by session)
          const txRes = await apiFetch('/api/transactions');
          if (txRes.success) setTransactions(txRes.data);
        }
      }
    } catch (err) {
      console.error("Gagal memuat data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, refreshPromos]);

  // Hydrate session from the server on mount (cookie-based source of truth)
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch('/api/auth/me');
        if (res.success) {
          _setCurrentUser(res.data);
          saveSession(res.data);
        } else {
          _setCurrentUser(null);
          saveSession(null);
        }
      } catch {
        // network error — keep cached session, if any
      }
    })();
  }, []);

  useEffect(() => {
    refreshData();
  }, [currentUser?.id]);

  // ─── AUTH ─────────────────────────────────────────────────────────────
  const login = async (identifier: string, password: string) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    if (res.success) {
      setCurrentUser(res.data);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network error — clear local state regardless
    }
    setCurrentUser(null);
    setUsers([]);
    setRouters([]);
    setTransactions([]);
  };

  const registerUser = async (name: string, email: string, phone_number: string, password: string) => {
    const res = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone_number, password }),
    });
    if (res.success) {
      setCurrentUser(res.data);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  // ─── USERS ────────────────────────────────────────────────────────────
  const updateUser = async (userId: number, data: Partial<User & { password?: string }>) => {
    const res = await apiFetch(`/api/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (res.success) {
      const updated = res.data;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u));
      if (currentUser?.id === userId) {
        setCurrentUser({ ...currentUser, ...updated });
      }
    }
  };

  const topupBalance = async (userId: number, amount: number) => {
    const res = await apiFetch(`/api/users/${userId}/topup`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
    if (res.success) {
      const newBalance = res.data.balance;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, balance: newBalance } : u));
      if (currentUser?.id === userId) {
        setCurrentUser({ ...currentUser, balance: newBalance });
      }
    }
  };

  // ─── PACKAGES ─────────────────────────────────────────────────────────
  const addPackage = async (pkg: Omit<Package, 'id'>) => {
    const res = await apiFetch('/api/packages', {
      method: 'POST',
      body: JSON.stringify(pkg),
    });
    if (res.success) {
      setPackages(prev => [...prev, res.data]);
    }
  };

  const updatePackage = async (packageId: number, pkg: Omit<Package, 'id'>) => {
    const res = await apiFetch(`/api/packages/${packageId}`, {
      method: 'PATCH',
      body: JSON.stringify(pkg),
    });
    if (res.success) {
      setPackages(prev => prev.map(p => p.id === packageId ? res.data : p));
    }
  };

  const deletePackage = async (packageId: number) => {
    await apiFetch(`/api/packages/${packageId}`, { method: 'DELETE' });
    setPackages(prev => prev.filter(p => p.id !== packageId));
  };

  // ─── ROUTERS ──────────────────────────────────────────────────────────
  const addRouter = async (r: Omit<RouterDevice, 'id' | 'status' | 'connected_users'>) => {
    const res = await apiFetch('/api/routers', {
      method: 'POST',
      body: JSON.stringify(r),
    });
    if (res.success) {
      setRouters(prev => [...prev, res.data]);
    }
  };

  const syncRouter = async (routerId: number) => {
    const res = await apiFetch(`/api/routers/${routerId}/sync`, { method: 'POST' });
    if (res.success) {
      setRouters(prev => prev.map(r => r.id === routerId ? res.data : r));
    }
  };

  const updateRouter = async (routerId: number, data: Omit<RouterDevice, 'id' | 'status' | 'connected_users'>) => {
    const res = await apiFetch(`/api/routers/${routerId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res.success) {
      setRouters(prev => prev.map(r => r.id === routerId ? res.data : r));
    }
  };

  const deleteRouter = async (routerId: number) => {
    await apiFetch(`/api/routers/${routerId}`, { method: 'DELETE' });
    setRouters(prev => prev.filter(r => r.id !== routerId));
  };

  const testRouterConnection = async (routerId: number) => {
    const res = await apiFetch(`/api/routers/${routerId}/test`, { method: 'POST' });
    if (res.success) {
      setRouters(prev => prev.map(r =>
        r.id === routerId ? { ...r, status: res.connected ? 'online' : 'offline' } : r
      ));
      return { connected: res.connected, message: res.message, latency: res.latency };
    }
    return { connected: false, message: res.error || 'Gagal test koneksi' };
  };

  // ─── TRANSACTIONS ─────────────────────────────────────────────────────
  const buyPackage = async (pkg: Package, method: 'saldo' | 'qris', pin?: string) => {
    if (!currentUser) return { success: false, error: 'Akses ditolak: User belum login.' };

    const res = await apiFetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify({
        package_id: pkg.id,
        payment_method: method,
        pin,
      }),
    });

    if (res.success) {
      const { transaction, voucher_code, new_balance } = res.data;
      // Update local balance
      if (method === 'saldo') {
        setCurrentUser({ ...currentUser, balance: new_balance });
        setUsers(prev => prev.map(u => u.id === currentUser.id ? { ...u, balance: new_balance } : u));
      }
      // Add to transactions list
      setTransactions(prev => [transaction, ...prev]);
      return { success: true, voucher_code };
    }
    return { success: false, error: res.error };
  };

  const deleteVoucher = async (txId: number) => {
    await apiFetch(`/api/transactions/${txId}`, { method: 'DELETE' });
    setTransactions(prev => prev.filter(t => t.id !== txId));
  };

  // ─── MIKROTIK ─────────────────────────────────────────────────────────
  const generateVoucherReal = async (routerId: number, profile: string, name: string, password: string) => {
    const res = await apiFetch("/api/router/create-voucher", {
      method: "POST",
      body: JSON.stringify({ routerId, profile, name, password }),
    });
    if (!res.success) throw new Error(res.error || "Gagal membuat voucher di Mikrotik");
    return res;
  };

  const getRouterActiveUsers = async (routerId: number) => {
    const res = await apiFetch(`/api/routers/${routerId}/active-users`);
    if (!res.success) throw new Error(res.error || "Gagal memuat user aktif");
    setRouters(prev => prev.map(r => r.id === routerId ? { ...r, connected_users: res.data.length, status: 'online' } : r));
    return res.data as ActiveUser[];
  };

  const getRouterProfiles = async (routerId: number) => {
    const res = await apiFetch(`/api/routers/${routerId}/profiles`);
    if (!res.success) throw new Error(res.error || "Gagal memuat profil");
    return { data: res.data as MikrotikProfile[], source: res.source, warning: res.warning };
  };

  const createRouterProfile = async (routerId: number, p: ProfileInput) => {
    const res = await apiFetch(`/api/routers/${routerId}/profiles`, {
      method: "POST",
      body: JSON.stringify(p),
    });
    if (!res.success) throw new Error(res.error || "Gagal membuat profil");
  };

  const updateRouterProfile = async (routerId: number, profileId: string, p: ProfileInput) => {
    const res = await apiFetch(`/api/routers/${routerId}/profiles`, {
      method: "PUT",
      body: JSON.stringify({ profileId, ...p }),
    });
    if (!res.success) throw new Error(res.error || "Gagal memperbarui profil");
  };

  const deleteRouterProfile = async (routerId: number, profileId: string) => {
    const res = await apiFetch(`/api/routers/${routerId}/profiles`, {
      method: "DELETE",
      body: JSON.stringify({ profileId }),
    });
    if (!res.success) throw new Error(res.error || "Gagal menghapus profil");
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      users, routers, packages, transactions, promos,
      loading, refreshData, refreshPromos,
      login, logout, registerUser,
      updateUser, topupBalance, buyPackage,
      addRouter, updateRouter, syncRouter, deleteRouter, testRouterConnection,
      deleteUser: async (userId) => {
        await apiFetch(`/api/users/${userId}`, { method: 'DELETE' });
        setUsers(prev => prev.filter(u => u.id !== userId));
      },
      deleteVoucher, addPackage, updatePackage, deletePackage, generateVoucherReal,
      getRouterActiveUsers, getRouterProfiles, createRouterProfile, updateRouterProfile, deleteRouterProfile,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
