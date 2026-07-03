import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, ChevronLeft, Wallet, Plus, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { customerApi } from '../services/customerApi';
import { useToast } from '@shared/components/ui/Toast';
import { useSettings } from '@core/context/SettingsContext';
import { useAuth } from '../../../core/context/AuthContext';

const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today) return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const WalletPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { settings } = useSettings();
    const { user } = useAuth();

    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    // Recharge states
    const [isRechargeModalOpen, setIsRechargeModalOpen] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState('');
    const [rechargeLoading, setRechargeLoading] = useState(false);
    const [verificationState, setVerificationState] = useState(null); // 'verifying' | 'success' | 'failed' | null
    const [verifiedAmount, setVerifiedAmount] = useState(0);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [profileRes, txRes] = await Promise.all([
                customerApi.getProfile(),
                customerApi.getWalletTransactions({ page: 1, limit: 50 }),
            ]);
            const profile = profileRes.data?.result ?? profileRes.data?.data ?? profileRes.data;
            const txData = txRes.data?.result ?? txRes.data?.data ?? txRes.data;
            setBalance(profile?.walletBalance ?? 0);
            setTransactions(Array.isArray(txData?.items) ? txData.items : []);
        } catch (err) {
            console.error('Wallet fetch error:', err);
            setBalance(0);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        
        // Check for merchantOrderId in URL for redirect verification
        const params = new URLSearchParams(window.location.search);
        const merchantOrderId = params.get('merchantOrderId');
        if (merchantOrderId) {
            verifyRecharge(merchantOrderId);
        }
    }, []);

    const verifyRecharge = async (merchantOrderId) => {
        setVerificationState('verifying');
        try {
            const res = await customerApi.verifyPaymentStatus(merchantOrderId);
            const status = res.data?.result?.status || res.data?.data?.status;
            const paymentAmount = res.data?.result?.payment?.amount || res.data?.data?.payment?.amount || 0;
            if (status === 'CAPTURED') {
                setVerifiedAmount(paymentAmount / 100);
                setVerificationState('success');
                // Remove query param without reload
                window.history.replaceState({}, document.title, window.location.pathname);
                await fetchData();
            } else {
                setVerificationState('failed');
            }
        } catch (err) {
            console.error('Verification error:', err);
            setVerificationState('failed');
        }
    };

    const openRazorpayWalletModal = (key, orderId, amount, currency) => {
        const options = {
            key: key || import.meta.env.VITE_RAZORPAY_KEY_ID || "",
            amount: amount,
            currency: currency || "INR",
            name: settings?.appName || "Anita Megamart",
            description: "Wallet Recharge",
            order_id: orderId,
            handler: async function (response) {
                setRechargeLoading(true);
                showToast("Verifying payment...", "info");
                try {
                    const verifyRes = await customerApi.verifyRazorpayPayment({
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_signature: response.razorpay_signature,
                    });
                    if (verifyRes.data.success) {
                        setVerifiedAmount(amount / 100);
                        setVerificationState('success');
                        showToast("Wallet recharged successfully!", "success");
                        await fetchData();
                    } else {
                        throw new Error(verifyRes.data.message || "Payment verification failed");
                    }
                } catch (err) {
                    console.error("Razorpay verification failed", err);
                    setVerificationState('failed');
                    showToast(err.message || "Payment verification failed.", "error");
                } finally {
                    setRechargeLoading(false);
                    setIsRechargeModalOpen(false);
                }
            },
            prefill: {
                name: user?.name || "",
                email: user?.email || "",
                contact: user?.phone || "",
            },
            theme: {
                color: "#10b981",
            },
            modal: {
                ondismiss: function () {
                    setRechargeLoading(false);
                    showToast("Payment cancelled by user.", "warning");
                }
            }
        };
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (resp) {
            setRechargeLoading(false);
            showToast(resp.error?.description || "Payment failed. Please try again.", "error");
        });
        rzp.open();
    };

    const handleRecharge = async () => {
        const amt = Number(rechargeAmount);
        if (!amt || isNaN(amt) || amt < 1) {
            alert('Please enter a valid amount (minimum ₹1)');
            return;
        }
        setRechargeLoading(true);
        try {
            const res = await customerApi.createWalletRechargeOrder({ amount: amt });
            const resultData = res.data?.result || res.data?.data || res.data;
            const gatewayName = resultData?.gatewayName || resultData?.payment?.gatewayName;

            if (gatewayName === 'RAZORPAY') {
                const key = resultData?.key || import.meta.env.VITE_RAZORPAY_KEY_ID || "";
                const payment = resultData?.payment;
                const orderId = payment?.gatewayOrderId;
                const amount = payment?.amount;
                const currency = payment?.currency || "INR";

                if (!window.Razorpay) {
                    const script = document.createElement("script");
                    script.src = "https://checkout.razorpay.com/v1/checkout.js";
                    script.async = true;
                    script.onload = () => {
                        openRazorpayWalletModal(key, orderId, amount, currency);
                    };
                    script.onerror = () => {
                        showToast("Failed to load Razorpay SDK", "error");
                        setRechargeLoading(false);
                    };
                    document.body.appendChild(script);
                } else {
                    openRazorpayWalletModal(key, orderId, amount, currency);
                }
            } else {
                const redirectUrl = resultData?.redirectUrl;
                if (redirectUrl) {
                    window.location.href = redirectUrl;
                } else {
                    alert(res.data?.message || 'Failed to initiate recharge payment');
                }
            }
        } catch (err) {
            console.error('Recharge error:', err);
            alert('Error initiating recharge. Please try again.');
        } finally {
            setRechargeLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24 font-sans relative">
            <div className="sticky top-0 z-30 bg-slate-50/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-slate-200/60 mb-4 flex items-center gap-2">
                <button
                    onClick={() => navigate(-1)}
                    className="w-10 h-10 flex items-center justify-center hover:bg-slate-200/70 rounded-full transition-colors -ml-1"
                >
                    <ChevronLeft size={22} className="text-slate-800" />
                </button>
                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Wallet</h1>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-1 relative z-20 space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
                    <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Available Balance</p>
                        <h2 className="text-4xl font-extrabold text-slate-900 mt-1">
                            {loading ? '...' : `₹${(balance || 0).toLocaleString('en-IN')}`}
                        </h2>
                        <p className="text-xs text-slate-500 mt-1.5">Add money, claim bonuses, or use for checkout</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setIsRechargeModalOpen(true)}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm hover:shadow flex items-center gap-2"
                        >
                            <Plus size={16} />
                            Add Money
                        </button>
                        {!loading && (
                            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider ${
                                transactions.some(t => t.title === 'Welcome Bonus')
                                    ? 'bg-brand-50 text-brand-700 border border-brand-100'
                                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                                Welcome Bonus: {transactions.some(t => t.title === 'Welcome Bonus') ? 'Credited' : 'Not Credited'}
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-base font-semibold text-slate-800">Transaction History</h3>
                        <Wallet size={18} className="text-slate-400" />
                    </div>

                    {loading ? (
                        <div className="py-12 flex justify-center text-slate-400 text-sm font-semibold">
                            Loading...
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                            <p className="text-sm font-semibold text-slate-500 mb-1">No wallet payments yet</p>
                            <p className="text-xs text-slate-400">
                                Orders paid using wallet will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {transactions.map((tx) => (
                                <div key={tx._id} className="px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${tx.type === 'credit' ? 'bg-brand-50 text-brand-600' : 'bg-slate-100 text-slate-700'}`}>
                                            {tx.type === 'credit' ? <ArrowDownLeft size={19} /> : <ArrowUpRight size={19} />}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-800 text-sm">{tx.title}</h4>
                                            <p className="text-[11px] text-slate-500">{formatDate(tx.date)}</p>
                                            {tx.orderId && (
                                                <p className="text-[10px] text-slate-500">#{tx.orderId}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`text-sm font-semibold ${tx.type === 'credit' ? 'text-brand-600' : 'text-slate-900'}`}>
                                        {tx.type === 'credit' ? '+' : '-'}₹{(tx.amount || 0).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Money Modal */}
            {isRechargeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 relative overflow-hidden">
                        <button
                            onClick={() => setIsRechargeModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <XCircle size={22} />
                        </button>
                        <h3 className="text-lg font-bold text-slate-900">Add Money to Wallet</h3>
                        <p className="text-xs text-slate-500 mt-1">Recharge instantly using UPI, Cards or NetBanking.</p>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Enter Amount (₹)</label>
                                <input
                                    type="number"
                                    placeholder="Enter amount (e.g. 500)"
                                    value={rechargeAmount}
                                    onChange={(e) => setRechargeAmount(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-2.5">
                                {[100, 500, 1000].map((amt) => (
                                    <button
                                        key={amt}
                                        onClick={() => setRechargeAmount(String(amt))}
                                        className={`py-2.5 px-3 border rounded-xl text-sm font-semibold transition-all ${
                                            rechargeAmount === String(amt)
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold'
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        +₹{amt}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleRecharge}
                                disabled={rechargeLoading}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                {rechargeLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Initiating Payment...
                                    </>
                                ) : (
                                    'Proceed to Pay'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Verification Status Modal */}
            {verificationState && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 text-center">
                        {verificationState === 'verifying' && (
                            <div className="py-6 flex flex-col items-center gap-3">
                                <Loader2 size={44} className="text-emerald-500 animate-spin" />
                                <h3 className="text-lg font-bold text-slate-900 mt-2">Verifying Recharge</h3>
                                <p className="text-xs text-slate-500">Please wait while we verify your payment status with the bank...</p>
                            </div>
                        )}
                        {verificationState === 'success' && (
                            <div className="py-6 flex flex-col items-center gap-3">
                                <CheckCircle2 size={48} className="text-emerald-500" />
                                <h3 className="text-lg font-bold text-slate-900 mt-2">Recharge Successful!</h3>
                                <p className="text-2xl font-black text-slate-800">₹{verifiedAmount}</p>
                                <p className="text-xs text-slate-500">Your wallet balance has been successfully credited.</p>
                                <button
                                    onClick={() => setVerificationState(null)}
                                    className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                        {verificationState === 'failed' && (
                            <div className="py-6 flex flex-col items-center gap-3">
                                <XCircle size={48} className="text-red-500" />
                                <h3 className="text-lg font-bold text-slate-900 mt-2">Payment Verification Failed</h3>
                                <p className="text-xs text-slate-500">We could not confirm your payment. If money was deducted, it will be refunded or credited shortly.</p>
                                <button
                                    onClick={() => setVerificationState(null)}
                                    className="mt-4 px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalletPage;
