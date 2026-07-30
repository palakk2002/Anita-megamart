import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../services/adminApi';
import Card from '@shared/components/ui/Card';
import Badge from '@shared/components/ui/Badge';
import {
    Mail,
    Phone,
    MapPin,
    Calendar,
    ShoppingBag,
    TrendingUp,
    MessageSquare,
    ChevronLeft,
    History,
    RotateCw,
    Edit3,
    ArrowUpRight,
    ExternalLink,
    Map as MapIcon,
    MoreVertical,
    ChevronRight,
    User,
    Ban,
    Search,
    Bell,
    Package,
    IndianRupee,
    CheckCircle2,
    Wallet,
    Plus,
    Minus,
    Coins,
    Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Modal from '@shared/components/ui/Modal';
import { useToast } from '@shared/components/ui/Toast';

const CustomerDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [orderSearch, setOrderSearch] = useState('');
    const [visibleOrders, setVisibleOrders] = useState(3);

    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
    const [isRestrictModalOpen, setIsRestrictModalOpen] = useState(false);

    // Wallet states
    const [walletData, setWalletData] = useState({ currentBalance: 0, availableCoins: 0, totalEarned: 0, totalUsed: 0, expiredCoins: 0 });
    const [walletHistory, setWalletHistory] = useState([]);
    const [walletLoading, setWalletLoading] = useState(true);
    const [isAddCoinsModalOpen, setIsAddCoinsModalOpen] = useState(false);
    const [isRemoveCoinsModalOpen, setIsRemoveCoinsModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [submittingWallet, setSubmittingWallet] = useState(false);

    const [addCoinsForm, setAddCoinsForm] = useState({ coins: '', reason: '', remarks: '', expiryDate: '' });
    const [removeCoinsForm, setRemoveCoinsForm] = useState({ coins: '', reason: '', remarks: '' });

    // Form states
    const [notifMessage, setNotifMessage] = useState('');
    const [notes, setNotes] = useState('Prefer morning deliveries. Use the building entrance on the north side.');

    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);

    const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });

    const fetchWalletData = async () => {
        try {
            setWalletLoading(true);
            const [walletRes, historyRes] = await Promise.all([
                adminApi.getUserWallet(id),
                adminApi.getUserWalletHistory(id, { page: 1, limit: 100 })
            ]);
            if (walletRes.data?.success) {
                setWalletData(walletRes.data.result || walletRes.data.data);
            }
            if (historyRes.data?.success) {
                const hData = historyRes.data.result || historyRes.data.data;
                setWalletHistory(Array.isArray(hData?.items) ? hData.items : []);
            }
        } catch (error) {
            console.error("Error fetching wallet details:", error);
        } finally {
            setWalletLoading(false);
        }
    };

    useEffect(() => {
        const fetchCustomerDetails = async () => {
            try {
                setLoading(true);
                const { data } = await adminApi.getUserById(id);
                if (data.success) {
                    const customerData = data.result;
                    setCustomer(customerData);
                    setOrders(customerData.recentOrders || []);
                    setEditForm({
                        name: customerData.name,
                        email: customerData.email,
                        phone: customerData.phone
                    });
                }
            } catch (error) {
                console.error("Error fetching customer details:", error);
                showToast("Failed to load customer profile", "error");
            } finally {
                setLoading(false);
            }
        };
        if (id) {
            fetchCustomerDetails();
            fetchWalletData();
        }
    }, [id]);

    const handleAddCoinsSubmit = async (e) => {
        e.preventDefault();
        const coinsNum = Number(addCoinsForm.coins);
        if (!coinsNum || coinsNum <= 0) {
            showToast('Please enter a valid positive coin amount', 'error');
            return;
        }
        if (!addCoinsForm.reason.trim()) {
            showToast('Please enter a reason for adding coins', 'error');
            return;
        }
        try {
            setSubmittingWallet(true);
            const res = await adminApi.addWalletCoins({
                userId: id,
                coins: coinsNum,
                reason: addCoinsForm.reason.trim(),
                remarks: addCoinsForm.remarks.trim(),
                expiryDate: addCoinsForm.expiryDate || null,
            });
            if (res.data?.success) {
                showToast(res.data.message || `Successfully credited ${coinsNum} coins`, 'success');
                setIsAddCoinsModalOpen(false);
                setAddCoinsForm({ coins: '', reason: '', remarks: '', expiryDate: '' });
                await fetchWalletData();
            } else {
                showToast(res.data?.message || 'Failed to credit coins', 'error');
            }
        } catch (err) {
            console.error('Error adding coins:', err);
            showToast(err.response?.data?.message || err.message || 'Failed to credit coins', 'error');
        } finally {
            setSubmittingWallet(false);
        }
    };

    const handleRemoveCoinsSubmit = async (e) => {
        e.preventDefault();
        const coinsNum = Number(removeCoinsForm.coins);
        if (!coinsNum || coinsNum <= 0) {
            showToast('Please enter a valid positive coin amount', 'error');
            return;
        }
        if (!removeCoinsForm.reason.trim()) {
            showToast('Please enter a reason for removing coins', 'error');
            return;
        }
        try {
            setSubmittingWallet(true);
            const res = await adminApi.removeWalletCoins({
                userId: id,
                coins: coinsNum,
                reason: removeCoinsForm.reason.trim(),
                remarks: removeCoinsForm.remarks.trim(),
            });
            if (res.data?.success) {
                showToast(res.data.message || `Successfully debited ${coinsNum} coins`, 'success');
                setIsRemoveCoinsModalOpen(false);
                setRemoveCoinsForm({ coins: '', reason: '', remarks: '' });
                await fetchWalletData();
            } else {
                showToast(res.data?.message || 'Failed to debit coins', 'error');
            }
        } catch (err) {
            console.error('Error removing coins:', err);
            showToast(err.response?.data?.message || err.message || 'Failed to debit coins', 'error');
        } finally {
            setSubmittingWallet(false);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => {
            setIsRefreshing(false);
            showToast('Customer data synchronized with main server', 'success');
        }, 1000);
    };

    const handleUpdateProfile = (e) => {
        e.preventDefault();
        setCustomer({ ...editForm });
        setIsEditModalOpen(false);
        showToast('Profile updated successfully', 'success');
    };

    const handleSendNotif = () => {
        if (!notifMessage.trim()) return;
        setIsNotifModalOpen(false);
        setNotifMessage('');
        showToast('Notification sent to user', 'success');
    };

    const handleRestrictAccount = () => {
        const newStatus = customer.status === 'active' ? 'restricted' : 'active';
        setCustomer({ ...customer, status: newStatus });
        setIsRestrictModalOpen(false);
        showToast(`Account successfully ${newStatus === 'restricted' ? 'restricted' : 'activated'}`, newStatus === 'restricted' ? 'warning' : 'success');
    };

    const handleSaveNotes = () => {
        showToast('Internal CRM notes updated', 'info');
    };

    const handleExportCSV = () => {
        showToast('Archive export initiated. CSV will be ready shortly.', 'info');
    };


    const safeOrders = useMemo(
        () => (Array.isArray(orders) ? orders : []),
        [orders]
    );

    const filteredOrders = useMemo(() => {
        return safeOrders.filter(o =>
            (o.id || '').toLowerCase().includes(orderSearch.toLowerCase()) ||
            (o.status || '').toLowerCase().includes(orderSearch.toLowerCase())
        ).slice(0, visibleOrders);
    }, [safeOrders, orderSearch, visibleOrders]);

    if (loading) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
                <RotateCw className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Profile...</p>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
                <p className="text-lg font-bold text-gray-400">Customer not found</p>
                <button onClick={() => navigate('/admin/customers')} className="text-primary font-bold">Back to Customers</button>
            </div>
        );
    }

    return (
        <div className="ds-section-spacing animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
            {/* Action Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 px-1">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/customers')}
                        className="p-2.5 bg-white ring-1 ring-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm group"
                    >
                        <ChevronLeft className="h-5 w-5 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="ds-h1">Customer Profile</h1>
                            <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">{customer.id}</Badge>
                        </div>
                        <p className="ds-description mt-1">Full profile and shopping history for this customer.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 px-5 py-3 bg-white ring-1 ring-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <RotateCw className={cn("h-4 w-4 text-brand-500", isRefreshing && "animate-spin")} />
                        REFRESH
                    </button>
                    <button
                        onClick={() => {
                            setEditForm({ ...customer });
                            setIsEditModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl text-xs font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 shadow-slate-200"
                    >
                        <Edit3 className="h-4 w-4" />
                        EDIT PROFILE
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Main Profile Info */}
                <Card className="lg:col-span-2 bg-white rounded-xl p-4 border-none shadow-xl ring-1 ring-slate-100 overflow-hidden relative">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-4 relative z-10">
                        <div className="relative shrink-0">
                            <img
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=BaseUser&backgroundColor=f1f5f9`}
                                alt=""
                                className="h-32 w-32 rounded-xl ring-4 ring-slate-50 shadow-lg bg-slate-100"
                            />
                            <div className={cn(
                                "absolute -bottom-1 -right-1 h-5 w-5 rounded-full ring-4 ring-white shadow-sm",
                                customer.status === 'active' ? "bg-brand-500" : "bg-rose-500"
                            )}></div>
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-6">
                            <div>
                                <h3 className="text-3xl font-black text-slate-900">{customer.name}</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Customer since {new Date(customer.joinedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[
                                    { label: 'Total Spend', value: `₹${(customer.totalSpent || 0).toLocaleString()}`, trend: 'Lifetime', icon: IndianRupee, color: 'emerald' },
                                    { label: 'Orders Placed', value: customer.totalOrders || 0, trend: 'Lifetime', icon: ShoppingBag, color: 'blue' },
                                    { label: 'Average Spend', value: `₹${customer.totalOrders > 0 ? Math.round(customer.totalSpent / customer.totalOrders).toLocaleString() : 0}`, trend: 'Per Order', icon: TrendingUp, color: 'indigo' },
                                    { label: 'Account Status', value: (customer.status || '').toUpperCase(), trend: 'Current', icon: CheckCircle2, color: 'fuchsia' },
                                ].map((stat, i) => (
                                    <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                                        <div className={cn("p-2 rounded-full mb-2",
                                            stat.color === 'emerald' && 'bg-brand-100 text-brand-600',
                                            stat.color === 'blue' && 'bg-brand-100 text-brand-600',
                                            stat.color === 'indigo' && 'bg-brand-100 text-brand-600',
                                            stat.color === 'fuchsia' && 'bg-fuchsia-100 text-fuchsia-600',
                                        )}>
                                            <stat.icon className="h-4 w-4" />
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
                                        <h5 className="text-lg font-black text-slate-900 mt-1">{stat.value}</h5>
                                        <p className="text-xs font-bold text-slate-500 mt-0.5">{stat.trend}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Quick Stats */}
                <div className="space-y-4">
                    <Card className="p-6 !bg-black  text-primary-foreground rounded-xl border-none shadow-lg shadow-brand-200 relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black opacity-90 uppercase tracking-widest mb-1">Lifetime Value</p>
                            <h4 className="text-3xl font-black text-white">₹{(customer.totalSpent || 0).toLocaleString()}</h4>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="p-1 px-2 rounded-full bg-white/25 text-white text-[10px] font-black uppercase tracking-tighter">
                                    {customer.totalOrders} Orders
                                </div>
                                <TrendingUp className="h-4 w-4 text-white/90" />
                            </div>
                        </div>
                        <ShoppingBag className="absolute -bottom-4 -right-4 h-24 w-24 text-white/10 group-hover:scale-110 transition-transform" />
                    </Card>

                    <Card className="p-6 bg-white rounded-xl border-none shadow-md ring-1 ring-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Recent Activity</p>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 rounded-xl text-amber-500">
                                <RotateCw className="h-4 w-4" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-700">Last Order placed</p>
                                <p className="text-[10px] font-semibold text-slate-400">
                                    {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Wallet, Delivery & Order History */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Wallet Management Section */}
                    <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                            <div>
                                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <Wallet className="h-4 w-4 text-emerald-600" />
                                    Wallet Management
                                </h4>
                                <p className="text-[11px] font-semibold text-slate-400 mt-1">
                                    View balance, add/remove coins manually, and track complete transaction history.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    onClick={() => setIsAddCoinsModalOpen(true)}
                                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Coins
                                </button>
                                <button
                                    onClick={() => setIsRemoveCoinsModalOpen(true)}
                                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                                >
                                    <Minus className="h-3.5 w-3.5" />
                                    Remove Coins
                                </button>
                                <button
                                    onClick={() => setIsHistoryModalOpen(true)}
                                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
                                >
                                    <History className="h-3.5 w-3.5 text-slate-500" />
                                    View Wallet History
                                </button>
                            </div>
                        </div>

                        {/* Wallet Metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Balance</p>
                                <h5 className="text-lg font-extrabold text-slate-900 mt-1">₹{walletData.currentBalance || 0}</h5>
                            </div>
                            <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-100 text-center">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Available Coins</p>
                                <h5 className="text-lg font-extrabold text-emerald-700 mt-1">{walletData.availableCoins || walletData.currentBalance || 0}</h5>
                            </div>
                            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-center">
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Used Coins</p>
                                <h5 className="text-lg font-extrabold text-blue-700 mt-1">{walletData.totalUsed || 0}</h5>
                            </div>
                            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-100 text-center">
                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Expired Coins</p>
                                <h5 className="text-lg font-extrabold text-amber-700 mt-1">{walletData.expiredCoins || 0}</h5>
                            </div>
                            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-center col-span-2 sm:col-span-1">
                                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Total Earned</p>
                                <h5 className="text-lg font-extrabold text-indigo-700 mt-1">{walletData.totalEarned || 0}</h5>
                            </div>
                        </div>
                    </Card>

                    {/* Delivery addresses */}
                    <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl p-4">
                        <div className="flex items-center justify-between mb-8">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <MapIcon className="h-4 w-4 text-brand-500" />
                                Saved Addresses
                            </h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(Array.isArray(customer.addresses) ? customer.addresses : []).length > 0 ? (
                                (Array.isArray(customer.addresses) ? customer.addresses : []).map((addr, idx) => {
                                    const type = (addr.label || addr.type || 'other').toUpperCase();
                                    const parts = [addr.fullAddress || addr.address, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean);
                                    const fullAddress = parts.length > 0 ? parts.join(', ') : 'No address';
                                    const isDefault = addr.isDefault ?? (idx === 0);
                                    return (
                                        <div key={addr._id || addr.id || idx} className={cn(
                                            "p-5 rounded-2xl ring-1 transition-all",
                                            isDefault ? "bg-slate-50 ring-slate-200 shadow-sm" : "bg-white ring-slate-100 hover:ring-brand-100"
                                        )}>
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge variant={isDefault ? 'primary' : 'secondary'} className="text-[9px] font-black">
                                                    {type}
                                                </Badge>
                                                <MapPin className="h-3.5 w-3.5 text-slate-300" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-600 leading-relaxed whitespace-pre-wrap break-words">{fullAddress}</p>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-2 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <MapPin className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No saved addresses</p>
                                </div>
                            )}
                        </div>
                    </Card>

                    {/* Order history */}
                    <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl overflow-hidden">
                        <div className="p-4 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <History className="h-4 w-4 text-brand-500" />
                                Recent Orders
                            </h4>
                            <div className="flex items-center gap-3">
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 group-focus-within:text-brand-500" />
                                    <input
                                        type="text"
                                        placeholder="Search Orders..."
                                        value={orderSearch}
                                        onChange={(e) => setOrderSearch(e.target.value)}
                                        className="pl-8 pr-4 py-2 bg-slate-50 border-none rounded-xl text-[10px] font-bold outline-none ring-1 ring-transparent focus:ring-brand-500/20 w-40"
                                    />
                                </div>
                                <button
                                    onClick={handleExportCSV}
                                    className="text-[10px] font-black text-brand-600 uppercase hover:underline"
                                >
                                    Export CSV
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <tbody className="divide-y divide-slate-50">
                                    {filteredOrders.map((order, i) => (
                                        <tr
                                            key={i}
                                            onClick={() => navigate(`/admin/orders/view/${order.id.replace('#', '')}`)}
                                            className="group hover:bg-slate-50/50 transition-all cursor-pointer"
                                        >
                                            <td className="px-4 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-white group-hover:shadow-sm transition-all text-slate-400 group-hover:text-brand-500">
                                                        <Package className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-slate-900">{order.id}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">{order.itemsCount} Items</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5">
                                                <p className="text-[10px] font-black text-slate-400 uppercase">
                                                    {new Date(order.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </td>
                                            <td className="py-5 text-center">
                                                <Badge variant={order.status === 'delivered' ? 'success' : order.status === 'cancelled' ? 'danger' : 'warning'} className="text-[8px] font-black">
                                                    {order.status.toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td className="py-5 text-right font-black text-slate-900 pr-8">
                                                ₹{(order.amount || 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredOrders.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-4 py-5 text-center text-xs font-bold text-slate-400">
                                                No orders found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {visibleOrders < safeOrders.length && (
                            <div className="p-4 bg-slate-50/50 flex justify-center border-t border-slate-50">
                                <button
                                    onClick={() => setVisibleOrders(safeOrders.length)}
                                    className="text-[10px] font-black text-brand-600 uppercase hover:underline flex items-center gap-2"
                                >
                                    SHOW ALL ORDERS
                                    <ChevronRight className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                    </Card>
                </div>

                {/* Sidebar Notes */}
                <div className="space-y-6">
                    <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-xl p-4">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-brand-500" />
                            Internal Notes
                        </h4>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full bg-slate-50 p-6 rounded-2xl min-h-[140px] text-sm font-bold text-slate-600 leading-relaxed italic border border-slate-100 outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/10 transition-all"
                        />
                        <button
                            onClick={handleSaveNotes}
                            className="w-full mt-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            UPDATE NOTES
                        </button>
                    </Card>

                    <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-slate-900 rounded-xl p-4 text-white">
                        <h4 className="text-xs font-black opacity-40 uppercase tracking-widest mb-6">Account Control</h4>
                        <div className="space-y-4">
                            <button
                                onClick={() => setIsNotifModalOpen(true)}
                                className="w-full py-4 bg-black  hover:bg-brand-500 text-primary-foreground rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-brand-900/20 flex items-center justify-center gap-2"
                            >
                                <MessageSquare className="h-4 w-4" />
                                SEND NOTIFICATION
                            </button>
                            <button
                                onClick={() => setIsRestrictModalOpen(true)}
                                className="w-full py-4 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl font-black text-[11px] uppercase tracking-widest border border-rose-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Ban className="h-4 w-4" />
                                {customer.status === 'active' ? 'BLOCK ACCOUNT' : 'UNBLOCK ACCOUNT'}
                            </button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Profile Details">
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Full Name</label>
                            <input
                                type="text"
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Phone Number</label>
                            <input
                                type="text"
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm"
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-black  hover:bg-brand-500 text-primary-foreground rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg active:scale-95">
                        SAVE CHANGES
                    </button>
                </form>
            </Modal>

            <Modal isOpen={isNotifModalOpen} onClose={() => setIsNotifModalOpen(false)} title="Send Notification">
                <div className="space-y-6">
                    <div className="p-4 bg-brand-50 rounded-2xl flex items-start gap-3">
                        <Bell className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-brand-700 leading-relaxed">
                            We will send notifications via app and SMS immediately.
                        </p>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Message</label>
                        <textarea
                            value={notifMessage}
                            onChange={(e) => setNotifMessage(e.target.value)}
                            placeholder="Type your message here..."
                            className="w-full px-5 py-5 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500/10 transition-all shadow-sm min-h-[120px]"
                        />
                    </div>
                    <button
                        onClick={handleSendNotif}
                        disabled={!notifMessage.trim()}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        SEND MESSAGE
                    </button>
                </div>
            </Modal>

            <Modal isOpen={isRestrictModalOpen} onClose={() => setIsRestrictModalOpen(false)} title="Confirm Action">
                <div className="space-y-6">
                    <div className="p-6 bg-rose-50 rounded-xl border border-rose-100 flex flex-col items-center text-center gap-4">
                        <div className="p-3 bg-rose-500 text-white rounded-full">
                            <Ban className="h-6 w-6" />
                        </div>
                        <h5 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                            Confirm Account {customer.status === 'active' ? 'Block' : 'Unblock'}?
                        </h5>
                        <p className="text-sm font-bold text-slate-500 leading-relaxed">
                            {customer.status === 'active'
                                ? 'This will block the customer from placing orders or logging in.'
                                : 'This will allow the customer to use all platform features again.'
                            }
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsRestrictModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all">
                            CANCEL
                        </button>
                        <button onClick={handleRestrictAccount} className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-rose-600 shadow-xl shadow-rose-200 transition-all">
                            CONFIRM
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Add Coins Modal */}
            <Modal isOpen={isAddCoinsModalOpen} onClose={() => setIsAddCoinsModalOpen(false)} title="Add Coins to User Wallet">
                <form onSubmit={handleAddCoinsSubmit} className="space-y-4">
                    <div className="p-3 bg-emerald-50 rounded-xl flex items-center gap-3">
                        <Plus className="h-5 w-5 text-emerald-600 shrink-0" />
                        <p className="text-xs font-semibold text-emerald-800">
                            Manually credit goodwill coins or reissue expired bonus to this user.
                        </p>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Coins Amount *</label>
                        <input
                            type="number"
                            min="1"
                            placeholder="e.g. 100"
                            value={addCoinsForm.coins}
                            onChange={(e) => setAddCoinsForm({ ...addCoinsForm, coins: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Reason *</label>
                        <input
                            type="text"
                            placeholder="e.g. Goodwill bonus reissue / Compensation"
                            value={addCoinsForm.reason}
                            onChange={(e) => setAddCoinsForm({ ...addCoinsForm, reason: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Remarks</label>
                        <textarea
                            placeholder="Additional internal audit notes..."
                            value={addCoinsForm.remarks}
                            onChange={(e) => setAddCoinsForm({ ...addCoinsForm, remarks: e.target.value })}
                            rows="2"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Expiry Date (Optional)</label>
                        <input
                            type="date"
                            value={addCoinsForm.expiryDate}
                            onChange={(e) => setAddCoinsForm({ ...addCoinsForm, expiryDate: e.target.value })}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsAddCoinsModalOpen(false)}
                            className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submittingWallet}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                        >
                            {submittingWallet ? 'Crediting...' : 'Confirm Add Coins'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Remove Coins Modal */}
            <Modal isOpen={isRemoveCoinsModalOpen} onClose={() => setIsRemoveCoinsModalOpen(false)} title="Remove Coins from User Wallet">
                <form onSubmit={handleRemoveCoinsSubmit} className="space-y-4">
                    <div className="p-3 bg-rose-50 rounded-xl flex items-center gap-3">
                        <Minus className="h-5 w-5 text-rose-600 shrink-0" />
                        <p className="text-xs font-semibold text-rose-800">
                            Current available balance: <span className="font-extrabold">₹{walletData.currentBalance || 0}</span>. Deductions cannot exceed available balance.
                        </p>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Coins Amount *</label>
                        <input
                            type="number"
                            min="1"
                            max={walletData.currentBalance || 0}
                            placeholder="e.g. 50"
                            value={removeCoinsForm.coins}
                            onChange={(e) => setRemoveCoinsForm({ ...removeCoinsForm, coins: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Reason *</label>
                        <input
                            type="text"
                            placeholder="e.g. Manual correction / Fraud reversal"
                            value={removeCoinsForm.reason}
                            onChange={(e) => setRemoveCoinsForm({ ...removeCoinsForm, reason: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Remarks</label>
                        <textarea
                            placeholder="Additional internal audit notes..."
                            value={removeCoinsForm.remarks}
                            onChange={(e) => setRemoveCoinsForm({ ...removeCoinsForm, remarks: e.target.value })}
                            rows="2"
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-rose-500/20"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsRemoveCoinsModalOpen(false)}
                            className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submittingWallet}
                            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                        >
                            {submittingWallet ? 'Debiting...' : 'Confirm Remove Coins'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Wallet History Modal */}
            <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Complete Wallet History">
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                    {walletHistory.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 font-semibold text-xs">
                            No wallet transactions recorded yet for this customer.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                                        <th className="py-2.5 px-3">Date</th>
                                        <th className="py-2.5 px-3">Type</th>
                                        <th className="py-2.5 px-3">Coins</th>
                                        <th className="py-2.5 px-3">Reason</th>
                                        <th className="py-2.5 px-3">Expiry</th>
                                        <th className="py-2.5 px-3">Created By</th>
                                        <th className="py-2.5 px-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                                    {walletHistory.map((tx) => (
                                        <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                                                {new Date(tx.date || tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="py-3 px-3 uppercase font-extrabold text-[10px]">
                                                <Badge
                                                    variant={tx.direction === 'CREDIT' || tx.type === 'ADMIN_CREDIT' || tx.type === 'WELCOME_BONUS' ? 'success' : 'danger'}
                                                    className="text-[9px] font-black"
                                                >
                                                    {tx.type || (tx.coins > 0 ? 'CREDIT' : 'DEBIT')}
                                                </Badge>
                                            </td>
                                            <td className={`py-3 px-3 font-extrabold ${tx.direction === 'CREDIT' || tx.type === 'ADMIN_CREDIT' || tx.type === 'WELCOME_BONUS' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {tx.direction === 'CREDIT' || tx.type === 'ADMIN_CREDIT' || tx.type === 'WELCOME_BONUS' ? '+' : '-'}{tx.coins || tx.amount || 0}
                                            </td>
                                            <td className="py-3 px-3 max-w-xs truncate" title={tx.reason}>
                                                {tx.reason || 'N/A'}
                                            </td>
                                            <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                                                {tx.expiryDate ? new Date(tx.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Never'}
                                            </td>
                                            <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                                                {tx.createdBy || 'System'}
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${tx.status === 'Settled' || tx.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                                    {tx.status || 'Settled'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default CustomerDetail;
