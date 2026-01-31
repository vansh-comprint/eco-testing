/**
 * OPS Admin - Logistics Management Page
 * Reuses components from Super Admin Logistics
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Search, ChevronDown, ChevronRight, Mail, Phone, Edit2, UserPlus } from 'lucide-react';
import { Input, Button, Card, Badge, PageHeader } from '@/components/ui';
import { CreateLogisticsAdminModal, CreateLogisticsUserModal, EditUserModal } from '@/pages/super';
import { logisticsApi } from '@/lib/api/logistics';
import { text, iconSize, hover as hoverStyles } from '@/lib/design-tokens';

interface LogisticsAdmin {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  status: string;
  created_at: string;
}

interface LogisticsUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  status: string;
  created_at: string;
}

interface LogisticsAdminWithUsers {
  admin: LogisticsAdmin;
  users: LogisticsUser[];
  expanded: boolean;
}

export function OpsLogistics() {
  const [logisticsData, setLogisticsData] = useState<LogisticsAdminWithUsers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLogisticsAdminModalOpen, setIsLogisticsAdminModalOpen] = useState(false);
  const [isLogisticsUserModalOpen, setIsLogisticsUserModalOpen] = useState(false);
  const [selectedLogisticsAdminId, setSelectedLogisticsAdminId] = useState<string | undefined>(undefined);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<LogisticsAdmin | LogisticsUser | null>(null);

  useEffect(() => {
    fetchLogisticsData();
  }, []);

  const fetchLogisticsData = async () => {
    setIsLoading(true);
    try {
      // Fetch logistics admins and users from REST API
      const [adminsResult, usersResult] = await Promise.all([
        logisticsApi.listAdmins({ limit: 1000 }),
        logisticsApi.listUsers({ limit: 1000 }),
      ]);

      const admins: LogisticsAdmin[] = (adminsResult.success && adminsResult.data)
        ? adminsResult.data.map(a => ({
            id: a.id,
            email: a.email,
            name: a.name || a.contact_person,
            phone: a.phone,
            role: 'logistics_admin',
            status: a.status,
            created_at: a.created_at,
          }))
        : [];

      const allUsers: (LogisticsUser & { parent_user_id?: string })[] = (usersResult.success && usersResult.data)
        ? usersResult.data.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name,
            phone: u.phone,
            role: 'logistics_user',
            status: u.status,
            created_at: u.created_at,
            parent_user_id: (u as any).parent_user_id,
          }))
        : [];

      // Group users by their parent_user_id (logistics_admin_id)
      const grouped: LogisticsAdminWithUsers[] = admins.map(admin => ({
        admin,
        users: allUsers.filter(user => user.parent_user_id === admin.id),
        expanded: false,
      }));

      setLogisticsData(grouped);
    } catch (error) {
      console.error('Error fetching logistics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (adminId: string) => {
    setLogisticsData(prev =>
      prev.map(item =>
        item.admin.id === adminId
          ? { ...item, expanded: !item.expanded }
          : item
      )
    );
  };

  const filteredData = logisticsData.filter(item =>
    item.admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.users.some(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalAdmins = logisticsData.length;
  const totalUsers = logisticsData.reduce((sum, item) => sum + item.users.length, 0);
  const activeAdmins = logisticsData.filter(item => item.admin.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        label="Operations"
        title="Logistics Management"
        subtitle={`${totalAdmins} logistics admins, ${totalUsers} field users`}
        actions={
          <Button
            variant="primary"
            onClick={() => setIsLogisticsAdminModalOpen(true)}
            leftIcon={<Truck className={iconSize.sm} />}
          >
            Add Logistics Admin
          </Button>
        }
      />

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card className="p-4">
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Total Admins</p>
          <p className={`font-brand text-2xl font-bold ${text.primary} mt-1`}>{totalAdmins}</p>
        </Card>
        <Card className="p-4">
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Field Users</p>
          <p className={`font-brand text-2xl font-bold text-blue-500 mt-1`}>{totalUsers}</p>
        </Card>
        <Card className="p-4">
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Active Admins</p>
          <p className={`font-brand text-2xl font-bold text-emerald-500 mt-1`}>{activeAdmins}</p>
        </Card>
        <Card className="p-4">
          <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Total Active</p>
          <p className={`font-brand text-2xl font-bold text-amber-500 mt-1`}>{activeAdmins + totalUsers}</p>
        </Card>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-6">
          <Input
            placeholder="Search by admin or user name/email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className={iconSize.sm} />}
          />
        </Card>
      </motion.div>

      {/* Logistics Admins with Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        {isLoading ? (
          <Card className="p-12 text-center">
            <p className={`font-mono text-sm ${text.muted}`}>Loading logistics data...</p>
          </Card>
        ) : filteredData.length === 0 ? (
          <Card className="p-12 text-center">
            <p className={`font-mono text-sm ${text.muted}`}>No logistics data found</p>
          </Card>
        ) : (
          filteredData.map((item, index) => (
            <motion.div
              key={item.admin.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
            >
              <Card className="overflow-hidden">
                {/* Logistics Admin Header */}
                <div
                  className={`p-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent border-b border-slate-200/80 dark:border-zinc-800 ${hoverStyles.card} cursor-pointer`}
                  onClick={() => toggleExpand(item.admin.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        className={`p-2 hover:bg-amber-500/10 transition-colors ${text.muted} hover:text-amber-500`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(item.admin.id);
                        }}
                      >
                        {item.expanded ? (
                          <ChevronDown className={iconSize.md} />
                        ) : (
                          <ChevronRight className={iconSize.md} />
                        )}
                      </button>
                      <div className="w-12 h-12 border border-amber-500/30 dark:border-amber-400/20 bg-amber-50/80 dark:bg-amber-500/10 flex items-center justify-center font-brand font-bold text-amber-700 dark:text-amber-400">
                        {item.admin.name?.split(' ').map(n => n[0]).join('').toUpperCase() || item.admin.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <p className={`font-display text-lg font-bold uppercase ${text.primary}`}>
                            {item.admin.name || 'Logistics Admin'}
                          </p>
                          <Badge variant="warning" size="sm">Logistics Admin</Badge>
                          <Badge variant={item.admin.status === 'active' ? 'success' : 'default'} size="sm">
                            {item.admin.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-2">
                            <Mail className={`${iconSize.xs} ${text.muted}`} />
                            <p className={`font-mono text-xs ${text.muted}`}>{item.admin.email}</p>
                          </div>
                          {item.admin.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className={`${iconSize.xs} ${text.muted}`} />
                              <p className={`font-mono text-xs ${text.muted}`}>{item.admin.phone}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>Field Users</p>
                        <p className={`font-brand text-xl font-bold ${text.primary}`}>{item.users.length}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUser(item.admin);
                          setIsEditUserModalOpen(true);
                        }}
                        className={`p-2 hover:bg-amber-500/10 transition-colors ${text.muted} hover:text-amber-500`}
                        title="Edit Logistics Admin"
                      >
                        <Edit2 className={iconSize.sm} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Logistics Users List */}
                {item.expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-50/50 dark:bg-zinc-900/20"
                  >
                    {/* Header with Add Field User button */}
                    <div className="p-4 border-b border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-between">
                      <p className={`font-mono text-xs uppercase tracking-widest ${text.muted}`}>
                        Field Users ({item.users.length})
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLogisticsAdminId(item.admin.id);
                          setIsLogisticsUserModalOpen(true);
                        }}
                        className="px-3 py-1.5 font-mono font-bold text-xs text-blue-700 dark:text-blue-400 border border-blue-500/30 dark:border-blue-400/20 hover:bg-blue-500 hover:text-black dark:hover:text-black uppercase tracking-widest transition-all flex items-center gap-2"
                      >
                        <UserPlus className="w-3 h-3" />
                        Add Field User
                      </button>
                    </div>

                    {item.users.length === 0 ? (
                      <div className="p-8 text-center">
                        <p className={`font-mono text-sm ${text.muted}`}>No field users assigned yet</p>
                        <p className={`font-mono text-xs ${text.muted} mt-2`}>Click "Add Field User" to create one</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-200/60 dark:divide-zinc-800/60">
                        {item.users.map((user) => (
                          <div
                            key={user.id}
                            className={`p-4 flex items-center justify-between ${hoverStyles.row}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 border border-blue-500/30 dark:border-blue-400/20 bg-blue-50/80 dark:bg-blue-500/10 flex items-center justify-center font-brand font-bold text-blue-700 dark:text-blue-400 text-sm ml-16">
                                {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || user.email[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-3">
                                  <p className={`font-display text-sm font-bold uppercase ${text.primary}`}>
                                    {user.name || 'Field User'}
                                  </p>
                                  <Badge variant="info" size="sm">Field User</Badge>
                                  <Badge variant={user.status === 'active' ? 'success' : 'default'} size="sm">
                                    {user.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                  <div className="flex items-center gap-2">
                                    <Mail className={`${iconSize.xs} ${text.muted}`} />
                                    <p className={`font-mono text-xs ${text.muted}`}>{user.email}</p>
                                  </div>
                                  {user.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className={`${iconSize.xs} ${text.muted}`} />
                                      <p className={`font-mono text-xs ${text.muted}`}>{user.phone}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(user);
                                setIsEditUserModalOpen(true);
                              }}
                              className={`p-2 hover:bg-blue-500/10 transition-colors ${text.muted} hover:text-blue-500`}
                              title="Edit Field User"
                            >
                              <Edit2 className={iconSize.sm} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </Card>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Modals - Reused from Super Admin */}
      <CreateLogisticsAdminModal
        isOpen={isLogisticsAdminModalOpen}
        onClose={() => setIsLogisticsAdminModalOpen(false)}
        onSuccess={() => {
          fetchLogisticsData();
          setIsLogisticsAdminModalOpen(false);
        }}
      />
      <CreateLogisticsUserModal
        isOpen={isLogisticsUserModalOpen}
        onClose={() => {
          setIsLogisticsUserModalOpen(false);
          setSelectedLogisticsAdminId(undefined);
        }}
        onSuccess={() => {
          fetchLogisticsData();
          setIsLogisticsUserModalOpen(false);
          setSelectedLogisticsAdminId(undefined);
        }}
        logisticsAdminId={selectedLogisticsAdminId}
      />
      {selectedUser && (
        <EditUserModal
          isOpen={isEditUserModalOpen}
          onClose={() => {
            setIsEditUserModalOpen(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            fetchLogisticsData();
          }}
          user={selectedUser}
        />
      )}
    </div>
  );
}

export default OpsLogistics;
