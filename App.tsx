import React, { useState, useEffect } from 'react';
import { Customer, InventoryItem, Transaction, ViewState, UserRole, User, Complaint } from './types';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { CustomerManager } from './components/CustomerManager';
import { PaymentPortal } from './components/PaymentPortal';
import { TransactionHistory } from './components/TransactionHistory';
import { InventoryManager } from './components/InventoryManager';
import { AdminPanel } from './components/AdminPanel';
import { AIAssistant } from './components/AIAssistant';
import { LoginScreen } from './components/LoginScreen';
import { CheckCircle } from 'lucide-react';

// --- MOCK DATA ---

const MOCK_USERS: User[] = [
  { 
    id: 'U1', name: 'Super Admin', username: 'admin', password: '123', role: UserRole.ADMIN, 
    permissions: ['DASHBOARD', 'CUSTOMERS', 'PAYMENTS', 'HISTORY', 'INVENTORY', 'ADMIN', 'COMPLAINTS'] 
  },
  { 
    id: 'U2', name: 'Alex (Tech)', username: 'alex', password: '123', role: UserRole.TECHNICIAN, 
    permissions: ['COMPLAINTS'] // STRICT: Only tasks
  },
  { 
    id: 'U3', name: 'Sarah (Agent)', username: 'sarah', password: '123', role: UserRole.COLLECTION_AGENT, 
    permissions: ['CUSTOMERS', 'DASHBOARD'] // STRICT: Balance view only. NO PAYMENTS.
  }
];

const MOCK_CUSTOMERS: Customer[] = [
  { 
    id: 'C001', 
    name: 'Alice Cyber', 
    email: 'alice@net.com', 
    phone: '+1-555-0101', 
    status: 'ACTIVE', 
    balance: 150.00,
    subscriptionType: 'INTERNET',
    planDays: 30,
    expiryDate: new Date(Date.now() + 86400000 * 5).toISOString(), // Expires in 5 days
    devices: [{ id: 'D1', name: 'Router X1', type: 'ROUTER', macAddress: '00:1A:2B:3C:4D', assignedDate: '2023-01-01' }],
    history: [
      { id: 'TX1', date: '2023-10-01', amount: 50, type: 'PAYMENT', method: 'UPI', description: 'Monthly Sub' }
    ],
    avatarUrl: ''
  },
  { 
    id: 'C002', 
    name: 'Bob Matrix', 
    email: 'bob@grid.com', 
    phone: '+1-555-0102', 
    status: 'INACTIVE', 
    balance: -20.00,
    subscriptionType: 'CABLE',
    planDays: 30,
    expiryDate: new Date(Date.now() - 86400000 * 2).toISOString(), // Expired 2 days ago
    devices: [],
    history: [],
    avatarUrl: ''
  },
  {
    id: 'C003',
    name: 'Eve Nexus',
    email: 'eve@node.com',
    phone: '+1-555-0103', 
    status: 'ACTIVE', 
    balance: 45.50,
    subscriptionType: 'INTERNET',
    planDays: 30,
    expiryDate: new Date(Date.now() + 86400000 * 15).toISOString(),
    devices: [{ id: 'D2', name: 'STB Pro', type: 'SET_TOP_BOX', macAddress: 'AA:BB:CC:DD:EE', assignedDate: '2023-05-12' }],
    history: [{ id: 'TX3', date: '2023-10-05', amount: 100, type: 'RECHARGE', method: 'CASH', description: 'Top Up' }],
    avatarUrl: ''
  }
];

const MOCK_INVENTORY: InventoryItem[] = [
  { 
    id: 'INV1', 
    name: 'Fiber Router GX', 
    category: 'Hardware', 
    price: 120, 
    status: 'IN_STOCK', 
    serialNumbers: ['GX-1001', 'GX-1002', 'GX-1003', 'GX-1004', 'GX-1005'], 
    remarks: 'New Batch',
    image: ''
  },
  { 
    id: 'INV2', 
    name: 'CAT6 Cable (100m)', 
    category: 'Cables', 
    price: 30, 
    status: 'LOW_STOCK', 
    serialNumbers: ['CABLE-A1', 'CABLE-A2'],
    remarks: 'Order soon',
    image: ''
  },
  { 
    id: 'INV3', 
    name: 'Android STB 4K', 
    category: 'Hardware', 
    price: 85, 
    status: 'OUT_OF_STOCK', 
    serialNumbers: [],
    image: ''
  },
];

const MOCK_COMPLAINTS: Complaint[] = [
  { 
    id: 'CP1', 
    customerId: 'C001', 
    customerName: 'Alice Cyber', 
    assignedToUserIds: ['U2'], 
    description: 'Router blinking red light', 
    status: 'PENDING', 
    date: '2023-10-25' 
  }
];

function App() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setView] = useState<ViewState>('DASHBOARD');
  
  // New state to handle passing filters between screens
  const [filterParam, setFilterParam] = useState<string | null>(null);
  
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [inventory, setInventory] = useState<InventoryItem[]>(MOCK_INVENTORY);
  
  // Initialize transactions by flattening customer history and injecting customer details
  const [transactions, setTransactions] = useState<Transaction[]>(
    MOCK_CUSTOMERS.flatMap(c => 
      c.history.map(t => ({...t, customerId: c.id, customerName: c.name}))
    )
  );

  const [complaints, setComplaints] = useState<Complaint[]>(MOCK_COMPLAINTS);
  
  // Added systemUpiId state
  const [systemUpiId, setSystemUpiId] = useState('hitech-merchant@okaxis');
  
  const [showAI, setShowAI] = useState(false);

  // --- AUTOMATION LOGIC ---

  // 1. Check Expirations on Load
  useEffect(() => {
    const checkExpirations = () => {
      const now = new Date();
      setCustomers(prev => prev.map(c => {
        const expiry = new Date(c.expiryDate);
        // If expired AND currently active, deactivate them
        if (expiry < now && c.status === 'ACTIVE') {
          return { ...c, status: 'INACTIVE' };
        }
        return c;
      }));
    };
    checkExpirations();
  }, []);

  // 2. Transaction Handling (Auto-Activate on Recharge)
  const processTransaction = (
    customerId: string, 
    amount: number, 
    type: 'RECHARGE' | 'PAYMENT', 
    method: 'UPI' | 'CARD' | 'CASH',
    receiptImage?: string
  ) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        const newTx: Transaction = {
          id: `TX${Math.random().toString(36).substr(2, 5)}`,
          date: new Date().toISOString().split('T')[0],
          amount: amount,
          type: type,
          method: method,
          description: type === 'RECHARGE' ? 'Wallet Recharge' : 'Service Payment',
          customerId: c.id,      // Add linkage
          customerName: c.name,   // Add linkage
          receiptImage: receiptImage
        };
        
        // Add to global history
        setTransactions(curr => [newTx, ...curr]);
        
        let updates: Partial<Customer> = {
          balance: type === 'RECHARGE' ? c.balance + amount : c.balance - amount,
          history: [newTx, ...c.history]
        };

        // AUTO ACTIVATION LOGIC
        if (type === 'RECHARGE') {
          updates.status = 'ACTIVE';
          
          // Extend Expiry
          const now = new Date();
          const currentExpiry = new Date(c.expiryDate);
          
          // If already expired, start 30 days (or planDays) from NOW. 
          // If active, add 30 days to existing expiry.
          const baseDate = currentExpiry > now ? currentExpiry : now;
          const newExpiry = new Date(baseDate);
          newExpiry.setDate(newExpiry.getDate() + c.planDays);
          
          updates.expiryDate = newExpiry.toISOString();
        }

        return { ...c, ...updates };
      }
      return c;
    }));
  };

  const handleDataRestore = (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      if(data.customers) setCustomers(data.customers);
      if(data.inventory) setInventory(data.inventory);
      if(data.transactions) setTransactions(data.transactions);
      alert("System Data Restored Successfully");
    } catch (e) {
      alert("Invalid Backup File");
    }
  };

  const assignComplaint = (complaint: Complaint) => {
    setComplaints(prev => [...prev, complaint]);
  };

  const resolveComplaint = (id: string) => {
    setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: 'RESOLVED', resolvedBy: currentUser?.name } : c));
  };

  // Helper to navigate with params
  const handleNavigation = (view: ViewState, param?: string) => {
    setFilterParam(param || null);
    setView(view);
  };

  // --- USER MANAGEMENT ---
  const handleLogin = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      // Immediately redirect to the first permitted view.
      // If Tech, they only have COMPLAINTS, so they go there.
      // If Admin, they have DASHBOARD first.
      setView(user.permissions[0]);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('DASHBOARD');
  };

  const handleAddUser = (newUser: Omit<User, 'id'>) => {
    const userWithId: User = {
      ...newUser,
      id: `U${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
    };
    setUsers(prev => [...prev, userWithId]);
  };

  const handleRemoveUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleUpdatePassword = (id: string, newPass: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, password: newPass } : u));
  };

  if (!currentUser) {
    return <LoginScreen users={users} onLogin={handleLogin} />;
  }

  // Permission Check Helper
  const canView = (view: ViewState) => currentUser.permissions.includes(view);

  return (
    <Layout 
      currentView={currentView} 
      setView={(v) => handleNavigation(v)} 
      currentUser={currentUser}
      onLogout={handleLogout}
      showAI={showAI}
      toggleAI={() => setShowAI(!showAI)}
      complaints={complaints}
    >
      {currentView === 'DASHBOARD' && canView('DASHBOARD') && (
        <Dashboard 
          customers={customers} 
          inventory={inventory} 
          transactions={transactions} 
          onNavigate={handleNavigation}
          currentUser={currentUser}
          complaints={complaints}
        />
      )}
      {currentView === 'CUSTOMERS' && canView('CUSTOMERS') && (
        <CustomerManager 
          customers={customers} 
          setCustomers={setCustomers} 
          initialFilter={filterParam}
          currentUser={currentUser}
          onNavigate={handleNavigation}
        />
      )}
      {currentView === 'PAYMENTS' && canView('PAYMENTS') && (
        <PaymentPortal 
          customers={customers} 
          processTransaction={processTransaction} 
          currentUser={currentUser}
          systemUpiId={systemUpiId}
        />
      )}
      {currentView === 'HISTORY' && canView('HISTORY') && (
        <TransactionHistory 
          transactions={transactions}
        />
      )}
      {currentView === 'INVENTORY' && canView('INVENTORY') && (
        <InventoryManager 
          inventory={inventory} 
          setInventory={setInventory} 
          initialFilter={filterParam}
        />
      )}
      {currentView === 'ADMIN' && currentUser.role === UserRole.ADMIN && (
        <AdminPanel 
           users={users} 
           currentUser={currentUser}
           customers={customers} 
           inventory={inventory} 
           transactions={transactions}
           onRestore={handleDataRestore}
           onAssignComplaint={assignComplaint}
           onAddUser={handleAddUser}
           onRemoveUser={handleRemoveUser}
           onUpdatePassword={handleUpdatePassword}
           systemUpiId={systemUpiId}
           onUpdateUpiId={setSystemUpiId}
        />
      )}
      {currentView === 'COMPLAINTS' && (
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6">
            {currentUser.role === UserRole.TECHNICIAN ? 'My Assigned Tasks' : 'System Task Log'}
          </h2>
          <div className="space-y-4">
            {complaints.filter(c => currentUser.role === UserRole.ADMIN || c.assignedToUserIds.includes(currentUser.id)).length === 0 && (
              <div className="text-gray-500 italic">No tasks found.</div>
            )}
            {/* If Technician: Show only their assigned complaints. If Admin: Show all. */}
            {complaints
              .filter(c => currentUser.role === UserRole.ADMIN || c.assignedToUserIds.includes(currentUser.id))
              .map(c => (
              <div key={c.id} className={`glass-panel p-6 rounded-xl border flex flex-col md:flex-row gap-4 justify-between items-start ${c.status === 'RESOLVED' ? 'border-green-500/30 opacity-60' : 'border-neon-pink/50'}`}>
                 <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-xs font-bold text-gray-500 bg-black/40 px-2 py-0.5 rounded">{c.id}</span>
                       <span className="text-xs text-gray-400">{c.date}</span>
                    </div>
                    <h3 className="text-xl text-white font-bold">{c.customerName}</h3>
                    <div className="text-sm font-mono text-neon-blue mt-1">ID: {c.customerId}</div>
                    <p className="text-gray-300 mt-3 p-3 bg-white/5 rounded-lg border border-white/5">{c.description}</p>
                 </div>
                 <div className="flex flex-col gap-2 min-w-[140px]">
                    <div className="text-xs text-right text-gray-500 mb-1">
                       Assigned to: <span className="text-white font-bold">
                         {c.assignedToUserIds.map(id => users.find(u => u.id === id)?.name || id).join(', ')}
                       </span>
                    </div>
                    {c.status === 'PENDING' ? (
                      <button onClick={() => resolveComplaint(c.id)} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all">
                        <CheckCircle className="w-4 h-4" /> MARK COMPLETE
                      </button>
                    ) : (
                      <span className="w-full py-2 text-center text-green-400 font-bold text-xs border border-green-500/50 rounded bg-green-500/10">TASK RESOLVED</span>
                    )}
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AIAssistant 
        isOpen={showAI} 
        onClose={() => setShowAI(false)} 
        customers={customers}
        inventory={inventory}
      />
    </Layout>
  );
}

export default App;