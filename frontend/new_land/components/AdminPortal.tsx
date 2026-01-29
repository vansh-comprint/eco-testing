
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Layers, 
  Box, 
  Truck, 
  Users, 
  Settings, 
  LogOut, 
  Upload, 
  Search, 
  Filter, 
  Plus, 
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { useTheme } from '../App';

// --- SUB COMPONENTS ---

const StatsCard = ({ label, value, trend }: { label: string, value: string, trend: string }) => (
  <div className="p-6 bg-white/40 dark:bg-black/40 backdrop-blur-md border border-black/5 dark:border-white/5 relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="w-2 h-2 rounded-full bg-ecotribe-primary animate-pulse"></div>
    </div>
    <h3 className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50 mb-2">{label}</h3>
    <div className="font-brand font-black text-4xl text-black dark:text-white mb-2">{value}</div>
    <div className="font-mono text-xs text-ecotribe-primary">{trend}</div>
  </div>
);

const Dashboard = () => (
  <div className="space-y-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatsCard label="Total Assets" value="12,405" trend="+12% this week" />
      <StatsCard label="Pending Pickup" value="45" trend="3 Scheduled Today" />
      <StatsCard label="Carbon Saved" value="1.2T" trend="Metric Tonnes" />
      <StatsCard label="Active Batches" value="3" trend="Processing" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Activity Graph Placeholder */}
      <div className="lg:col-span-2 p-8 bg-white/40 dark:bg-black/40 backdrop-blur-md border border-black/5 dark:border-white/5 min-h-[300px] relative">
         <h3 className="font-brand font-bold text-lg text-black dark:text-white mb-6 uppercase">Asset Inflow</h3>
         <div className="absolute inset-0 flex items-center justify-center opacity-10">
            {/* SVG Wave placeholder for graph */}
            <svg viewBox="0 0 100 20" className="w-full h-full stroke-black dark:stroke-white fill-none stroke-[0.5]">
              <path d="M0 10 Q 25 20 50 10 T 100 10" />
            </svg>
         </div>
      </div>

      {/* Recent Activity List */}
      <div className="p-8 bg-white/40 dark:bg-black/40 backdrop-blur-md border border-black/5 dark:border-white/5">
        <h3 className="font-brand font-bold text-lg text-black dark:text-white mb-6 uppercase">System Log</h3>
        <ul className="space-y-4 font-mono text-xs">
          {[
            { time: '09:42', event: 'Batch #4029 Uploaded' },
            { time: '10:15', event: 'Pickup #99 Completed' },
            { time: '11:00', event: 'New User Added: J.Doe' },
            { time: '13:20', event: 'Asset #X99 Flagged' },
          ].map((item, i) => (
            <li key={i} className="flex gap-4 text-black/70 dark:text-white/70">
              <span className="opacity-50">{item.time}</span>
              <span>{item.event}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
);

const Batches = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="font-brand font-bold text-2xl uppercase">Batch Management</h2>
      <button className="flex items-center gap-2 px-6 py-3 bg-ecotribe-primary text-black font-brand font-bold uppercase text-xs tracking-wider btn-chamfer hover:bg-white transition-colors">
        <Upload size={14} />
        <span>Upload CSV</span>
      </button>
    </div>

    {/* Table */}
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-black/10 dark:border-white/10 text-xs font-mono uppercase tracking-widest text-black/50 dark:text-white/50">
            <th className="py-4 px-4">Batch ID</th>
            <th className="py-4 px-4">Date</th>
            <th className="py-4 px-4">Count</th>
            <th className="py-4 px-4">Status</th>
            <th className="py-4 px-4">Action</th>
          </tr>
        </thead>
        <tbody className="font-display font-medium text-sm">
          {[
            { id: 'B-2024-001', date: 'Oct 24, 2024', count: 142, status: 'Processing' },
            { id: 'B-2024-002', date: 'Oct 23, 2024', count: 89, status: 'Completed' },
            { id: 'B-2024-003', date: 'Oct 22, 2024', count: 210, status: 'Pending Review' },
          ].map((row, i) => (
            <tr key={i} className="group hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b border-black/5 dark:border-white/5">
              <td className="py-4 px-4 font-mono text-ecotribe-primary">{row.id}</td>
              <td className="py-4 px-4">{row.date}</td>
              <td className="py-4 px-4">{row.count} Units</td>
              <td className="py-4 px-4">
                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-sm ${
                  row.status === 'Completed' ? 'bg-ecotribe-primary/20 text-ecotribe-primary' : 
                  row.status === 'Processing' ? 'bg-blue-500/20 text-blue-500' : 'bg-orange-500/20 text-orange-500'
                }`}>
                  {row.status}
                </span>
              </td>
              <td className="py-4 px-4">
                <button className="text-black/40 dark:text-white/40 hover:text-black dark:hover:text-white"><MoreHorizontal size={16} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const Assets = () => (
  <div className="space-y-6">
    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40" size={16} />
        <input 
          type="text" 
          placeholder="SEARCH ASSET TAG / SERIAL" 
          className="w-full pl-10 pr-4 py-3 bg-white/40 dark:bg-black/40 border border-black/10 dark:border-white/10 font-mono text-xs focus:outline-none focus:border-ecotribe-primary text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30"
        />
      </div>
      <div className="flex gap-4">
         <button className="p-3 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><Filter size={16} /></button>
         <button className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-brand font-bold text-xs uppercase tracking-wider btn-chamfer hover:opacity-80 transition-opacity">
           Initiate Pickup
         </button>
      </div>
    </div>

    {/* Asset Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="p-6 bg-white/40 dark:bg-black/40 backdrop-blur-md border border-black/5 dark:border-white/5 hover:border-ecotribe-primary/50 transition-colors group cursor-pointer relative">
          <div className="flex justify-between items-start mb-4">
            <div className="font-mono text-xs text-black/40 dark:text-white/40">TAG-882-{i}9</div>
            <div className="w-2 h-2 rounded-full bg-ecotribe-primary/50"></div>
          </div>
          <h3 className="font-brand font-bold text-lg text-black dark:text-white mb-1">MacBook Pro 16"</h3>
          <p className="font-display text-sm text-black/60 dark:text-white/60 mb-4">Intel Core i9 / 32GB / 1TB</p>
          <div className="flex justify-between items-center pt-4 border-t border-black/5 dark:border-white/5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-ecotribe-primary">Ready for Pickup</span>
            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Pickups = () => (
  <div className="space-y-8">
     <div className="flex gap-4 overflow-x-auto pb-2">
       {['All', 'Ready', 'Scheduled', 'In Transit', 'Completed'].map(status => (
         <button key={status} className="px-4 py-2 border border-black/10 dark:border-white/10 font-mono text-[10px] uppercase tracking-widest hover:bg-ecotribe-primary hover:text-black hover:border-ecotribe-primary transition-colors whitespace-nowrap text-black dark:text-white">
           {status}
         </button>
       ))}
     </div>

     <div className="relative border-l border-black/10 dark:border-white/10 ml-4 space-y-12">
        {[
          { id: 'PK-992', status: 'In Transit', dest: 'Sector 7G', count: 42, time: '2h ago' },
          { id: 'PK-991', status: 'Completed', dest: 'Sector 4A', count: 128, time: 'Yesterday' },
          { id: 'PK-990', status: 'Completed', dest: 'Sector 1B', count: 15, time: 'Oct 20' },
        ].map((item, i) => (
          <div key={i} className="relative pl-8">
            <div className="absolute -left-[5px] top-2 w-[9px] h-[9px] bg-ecotribe-primary rounded-full outline outline-4 outline-white dark:outline-black"></div>
            <div className="p-6 bg-white/40 dark:bg-black/40 backdrop-blur-md border border-black/5 dark:border-white/5">
              <div className="flex justify-between items-start mb-2">
                 <h3 className="font-brand font-bold text-xl">{item.id}</h3>
                 <span className="font-mono text-[10px] uppercase tracking-widest text-black/50 dark:text-white/50">{item.time}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 font-mono text-xs mt-4">
                <div>
                  <div className="text-black/40 dark:text-white/40 mb-1">Status</div>
                  <div className="text-ecotribe-primary uppercase">{item.status}</div>
                </div>
                <div>
                  <div className="text-black/40 dark:text-white/40 mb-1">Destination</div>
                  <div>{item.dest}</div>
                </div>
                <div>
                  <div className="text-black/40 dark:text-white/40 mb-1">Assets</div>
                  <div>{item.count} Units</div>
                </div>
              </div>
            </div>
          </div>
        ))}
     </div>
  </div>
);

const SubUsers = () => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="font-brand font-bold text-2xl uppercase">Team Members</h2>
      <button className="flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-brand font-bold uppercase text-xs tracking-wider btn-chamfer hover:opacity-80 transition-opacity">
        <Plus size={14} />
        <span>Invite User</span>
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border border-black/10 dark:border-white/10 bg-white/20 dark:bg-black/20">
          <div className="w-10 h-10 bg-black/5 dark:bg-white/5 flex items-center justify-center font-brand font-bold">
            JD
          </div>
          <div className="flex-1">
            <h4 className="font-brand font-bold text-sm">John Doe</h4>
            <p className="font-mono text-[10px] text-black/50 dark:text-white/50">john.doe@enterprise.com</p>
          </div>
          <span className="px-2 py-1 bg-black/5 dark:bg-white/5 text-[10px] font-mono uppercase">Admin</span>
        </div>
      ))}
    </div>
  </div>
);

const SettingsView = () => (
  <div className="max-w-2xl space-y-8">
    <div className="p-8 bg-white/40 dark:bg-black/40 backdrop-blur-md border border-black/5 dark:border-white/5">
      <h3 className="font-brand font-bold text-lg mb-6 uppercase border-b border-black/10 dark:border-white/10 pb-4">Organization Profile</h3>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
           <label className="font-mono text-[10px] uppercase tracking-widest opacity-60">Company Name</label>
           <input type="text" value="Acme Corp" className="w-full bg-transparent border-b border-black/20 dark:border-white/20 py-2 font-display text-sm focus:outline-none" />
        </div>
        <div className="space-y-2">
           <label className="font-mono text-[10px] uppercase tracking-widest opacity-60">Admin Email</label>
           <input type="email" value="admin@acme.com" className="w-full bg-transparent border-b border-black/20 dark:border-white/20 py-2 font-display text-sm focus:outline-none" />
        </div>
      </div>
    </div>

    <div className="p-8 bg-white/40 dark:bg-black/40 backdrop-blur-md border border-black/5 dark:border-white/5">
      <h3 className="font-brand font-bold text-lg mb-6 uppercase border-b border-black/10 dark:border-white/10 pb-4">Pickup Locations</h3>
      <div className="space-y-4">
        <div className="p-4 border border-black/10 dark:border-white/10 flex justify-between items-center">
          <div>
            <div className="font-brand font-bold text-sm">HQ - San Francisco</div>
            <div className="font-mono text-[10px] opacity-60">1200 Market St, SF, CA</div>
          </div>
          <button className="text-xs font-mono uppercase underline hover:text-ecotribe-primary">Edit</button>
        </div>
        <button className="w-full py-3 border border-dashed border-black/20 dark:border-white/20 font-mono text-xs uppercase tracking-widest hover:border-ecotribe-primary hover:text-ecotribe-primary transition-colors">
          + Add New Location
        </button>
      </div>
    </div>
  </div>
);


// --- MAIN LAYOUT ---

type AdminView = 'dashboard' | 'batches' | 'assets' | 'pickups' | 'users' | 'settings';

interface AdminPortalProps {
  onLogout: () => void;
}

const AdminPortal: React.FC<AdminPortalProps> = ({ onLogout }) => {
  const [activeView, setActiveView] = useState<AdminView>('dashboard');
  const { theme } = useTheme();

  const NavItem = ({ view, icon: Icon, label }: { view: AdminView, icon: any, label: string }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`w-full flex items-center gap-4 px-6 py-4 transition-all duration-300 relative group ${
        activeView === view 
          ? 'text-ecotribe-primary bg-black/5 dark:bg-white/5 border-r-2 border-ecotribe-primary' 
          : 'text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      <Icon size={18} />
      <span className="font-brand font-bold uppercase tracking-wider text-xs">{label}</span>
      {activeView === view && (
        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-ecotribe-primary/10 to-transparent"></div>
      )}
    </button>
  );

  return (
    <div className="flex h-screen bg-transparent">
      
      {/* Sidebar - Glassmorphism */}
      <motion.aside 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-64 h-full border-r border-black/10 dark:border-white/5 bg-white/60 dark:bg-black/60 backdrop-blur-xl flex flex-col z-20"
      >
        <div className="p-8">
          <div className="font-brand font-black text-xl tracking-tight text-black dark:text-white leading-none">
            ECO<span className="text-ecotribe-primary">/</span><span className="text-ecotribe-primary">TRIBE</span>
          </div>
          <div className="mt-2 font-mono text-[9px] uppercase tracking-[0.2em] opacity-60">Admin Console</div>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          <NavItem view="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="batches" icon={Layers} label="Batches" />
          <NavItem view="assets" icon={Box} label="Assets" />
          <NavItem view="pickups" icon={Truck} label="Pickups" />
          <NavItem view="users" icon={Users} label="Sub-Users" />
          <NavItem view="settings" icon={Settings} label="Settings" />
        </nav>

        <div className="p-6 border-t border-black/10 dark:border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-ecotribe-primary rounded-full flex items-center justify-center font-brand font-bold text-black text-xs">
              AD
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="font-brand font-bold text-sm truncate">Admin User</div>
              <div className="font-mono text-[9px] opacity-60 truncate">Acme Corp</div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 border border-black/10 dark:border-white/10 text-[10px] font-mono uppercase tracking-widest hover:bg-red-500 hover:border-red-500 hover:text-white transition-colors"
          >
            <LogOut size={12} /> Logout
          </button>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {/* Top Header - Glass */}
        <header className="h-20 px-8 flex items-center justify-between border-b border-black/5 dark:border-white/5 bg-white/20 dark:bg-black/20 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest opacity-60">
            <span>Portal</span>
            <span>/</span>
            <span className="text-ecotribe-primary">{activeView}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-ecotribe-primary/10 border border-ecotribe-primary/20 rounded-full">
               <div className="w-1.5 h-1.5 rounded-full bg-ecotribe-primary animate-pulse"></div>
               <span className="font-mono text-[9px] font-bold text-ecotribe-primary uppercase">System Online</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 relative z-0 scrollbar-thin scrollbar-thumb-ecotribe-primary/20">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-[1400px] mx-auto pb-20"
            >
              {activeView === 'dashboard' && <Dashboard />}
              {activeView === 'batches' && <Batches />}
              {activeView === 'assets' && <Assets />}
              {activeView === 'pickups' && <Pickups />}
              {activeView === 'users' && <SubUsers />}
              {activeView === 'settings' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

    </div>
  );
};

export default AdminPortal;
