import React, { createContext, useContext, useState, ReactNode } from 'react';

// Types
export type User = {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  password?: string;
  pin?: string;
  role: 'admin' | 'user';
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
};

export type Transaction = {
  id: number;
  user_id: number;
  package_id: number;
  voucher_code: string;
  amount: number;
  payment_method: 'saldo' | 'qris';
  status: 'pending' | 'success' | 'failed';
  date: string;
};

type AppContextType = {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  routers: RouterDevice[];
  packages: Package[];
  transactions: Transaction[];
  // Mock mutations
  updateUser: (userId: number, data: Partial<User>) => void;
  buyPackage: (pkg: Package, method: 'saldo' | 'qris', pin?: string) => { success: boolean; error?: string };
  topupBalance: (amount: number) => void;
  registerUser: (name: string, email: string) => boolean;
  addRouter: (router: Omit<RouterDevice, 'id' | 'status' | 'connected_users'>) => void;
  syncRouter: (routerId: number) => void;
  generateVouchers: (qty: number, packageId: number, routerId: number) => string[];
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>({
    id: 1,
    name: 'Ahmad Pelanggan',
    email: 'user@demo.com',
    role: 'user',
    balance: 50000,
    status: 'active'
  }); // Starts logged in as user for demo

  const [users, setUsers] = useState<User[]>([
    { id: 1, name: 'Ahmad Pelanggan', email: 'user@demo.com', phone_number: '081234567890', password: 'user123', pin: '123456', role: 'user', balance: 50000, status: 'active' },
    { id: 2, name: 'Admin Net', email: 'admin@demo.com', phone_number: '08999999999', password: 'admin', role: 'admin', balance: 0, status: 'active' },
    { id: 3, name: 'Budi W', email: 'budi@demo.com', phone_number: '08111111111', password: 'user123', pin: '123456', role: 'user', balance: 15000, status: 'active' },
  ]);

  const [routers, setRouters] = useState<RouterDevice[]>([
    { id: 1, name: 'Router Pusat', ip_address: '192.168.1.1', api_port: '8728', username: 'admin', password: 'password', status: 'online', connected_users: 142 },
    { id: 2, name: 'Cabang Utara', ip_address: '192.168.2.1', api_port: '8728', username: 'admin', password: 'password', status: 'warning', connected_users: 38 },
  ]);

  const [packages, setPackages] = useState<Package[]>([
    { id: 1, name: 'Harian Hemat', speed: '10 Mbps', quota: 'Unlimited', duration: '1 Hari', price: 5000, badge_color: 'blue' },
    { id: 2, name: 'Mingguan Ngebut', speed: '20 Mbps', quota: 'Unlimited', duration: '7 Hari', price: 25000, badge_color: 'purple' },
    { id: 3, name: 'Bulanan Pro', speed: '50 Mbps', quota: 'Unlimited', duration: '30 Hari', price: 95000, badge_color: 'cyan' },
    { id: 4, name: 'Gaming VIP', speed: '100 Mbps', quota: 'Unlimited', duration: '30 Hari', price: 150000, badge_color: 'emerald' },
  ]);

  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: 101, user_id: 1, package_id: 1, voucher_code: 'WFI-1A2B3C', amount: 5000, payment_method: 'saldo', status: 'success', date: new Date().toISOString() },
    { id: 102, user_id: 3, package_id: 2, voucher_code: 'WFI-X8Y9Z0', amount: 25000, payment_method: 'qris', status: 'success', date: new Date(Date.now() - 86400000).toISOString() },
  ]);

  const registerUser = (name: string, email: string) => {
    if (users.find(u => u.email === email)) return false;
    const newUser: User = {
      id: Math.floor(Math.random() * 10000) + 1000,
      name,
      email,
      role: 'user',
      balance: 0,
      status: 'active'
    };
    setUsers([...users, newUser]);
    setCurrentUser(newUser);
    return true;
  };

  const addRouter = (r: Omit<RouterDevice, 'id' | 'status' | 'connected_users'>) => {
    const newRouter: RouterDevice = {
      ...r,
      id: Math.floor(Math.random() * 10000) + 1000,
      status: 'online',
      connected_users: 0
    };
    setRouters([...routers, newRouter]);
  };

  const syncRouter = (routerId: number) => {
    // Simulate syncing: update users count and maybe add a mock package that was read from mikrotik
    setRouters(routers.map(r => r.id === routerId ? { ...r, connected_users: r.connected_users + Math.floor(Math.random() * 10) } : r));
    
    // Add a mocked profile as a package if not exists
    const pkgName = `Paket Sync ${Math.floor(Math.random()*100)}`;
    setPackages([...packages, { 
      id: Math.floor(Math.random()*1000)+1000, 
      name: pkgName, 
      speed: '10 Mbps', 
      quota: 'Unlimited', 
      duration: '1 Hari', 
      price: 5000, 
      badge_color: 'fuchsia' 
    }]);
  };

  const updateUser = (userId: number, data: Partial<User>) => {
    // Keamanan Frontend (Anticipasi Injeksi React Context):
    // Memblokir manipulasi saldo, role, atau block secara langsung jika dijalankan oleh bukan Admin.
    if ('balance' in data || 'role' in data || 'status' in data) {
      if (currentUser?.role !== 'admin') {
        console.error("KEAMANAN TERPICU: Upaya manipulasi data sensitif digagalkan (saldo/role/status). Akses ditolak.");
        return;
      }
    }

    setUsers(prev => prev.map(u => {
      if (u.id === userId) {
        const updated = { ...u, ...data };
        if (currentUser?.id === userId) {
          setCurrentUser(updated as User);
        }
        return updated;
      }
      return u;
    }));
  };

  const buyPackage = (pkg: Package, method: 'saldo' | 'qris', pin?: string) => {
    if (!currentUser) return { success: false, error: 'Akses ditolak: User belum login.' };
    
    // Keamanan Frontend: Validasi Paket dan Harga
    if (!pkg || pkg.price <= 0) return { success: false, error: 'Paket tidak valid.' };
    
    if (method === 'saldo') {
      if (!currentUser.pin && pin) return { success: false, error: 'PIN transaksi Anda belum dikonfigurasi.' };
      if (currentUser.pin && currentUser.pin !== pin) return { success: false, error: 'Otorisasi Gagal: PIN salah.' };
      if (currentUser.balance < pkg.price) return { success: false, error: 'Saldo tidak mencukupi untuk transaksi ini.' };
      
      // Amankan mutasi state saldo
      const updatedUser = { ...currentUser, balance: currentUser.balance - pkg.price };
      setCurrentUser(updatedUser);
      setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
    }

    const newTx: Transaction = {
      id: Math.floor(Math.random() * 10000) + 1000,
      user_id: currentUser.id,
      package_id: pkg.id,
      voucher_code: `WFI-${Math.random().toString(36).substring(2,8).toUpperCase()}`,
      amount: pkg.price,
      payment_method: method,
      status: 'success',
      date: new Date().toISOString()
    };
    setTransactions([newTx, ...transactions]);
    return { success: true };
  };

  const topupBalance = (amount: number) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, balance: currentUser.balance + amount };
    setCurrentUser(updatedUser);
    setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
  };

  const generateVouchers = (qty: number, packageId: number, routerId: number) => {
    const codes: string[] = [];
    for(let i=0; i<qty; i++) {
        codes.push(`WFI-${Math.random().toString(36).substring(2,8).toUpperCase()}`);
    }
    return codes;
  };

  return (
    <AppContext.Provider value={{ 
      currentUser, setCurrentUser, users, routers, packages, transactions, 
      updateUser, buyPackage, topupBalance, registerUser, addRouter, syncRouter, generateVouchers 
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
