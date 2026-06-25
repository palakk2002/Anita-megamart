import React from 'react';
import { ChevronLeft, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const RefundPolicyPage = () => {
    const navigate = useNavigate();
    const { settings } = useSettings();
    const appName = settings?.appName || 'App';

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            {/* Header */}
            <div className="bg-white sticky top-0 z-30 px-4 py-3 flex items-center gap-1 shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <ChevronLeft size={24} className="text-slate-600" />
                </button>
                <h1 className="text-lg font-black text-slate-800">Refund Policy</h1>
            </div>

            <div className="p-5 max-w-3xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 rounded-2xl bg-brand-50 flex items-center justify-center text-primary">
                            <Coins size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Refund Policy</h2>
                            <p className="text-xs text-slate-500 font-medium">Last updated: Oct 2025</p>
                        </div>
                    </div>

                    <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-4">
                        <p>
                            At {appName}, we strive to ensure that all transactions and order processes are smooth and satisfying. This Refund Policy describes the refund terms and conditions.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">1. Refund Eligibility</h3>
                        <p>
                            Refunds are processed for:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Cancelled orders (before dispatch).</li>
                            <li>Damaged or defective products at the time of delivery.</li>
                            <li>Incorrect items delivered (not matching your order).</li>
                            <li>Missing items from the order that you were charged for.</li>
                        </ul>

                        <h3 className="text-slate-800 font-bold text-base mt-6">2. Refund Methods</h3>
                        <p>
                            Approved refunds can be credited either to your original payment source (bank, card, or wallet) or as store credit in your {appName} Wallet. Wallet refunds are generally instant, while bank/card refunds may take 5–7 business days depending on your financial institution.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">3. Refund Processing</h3>
                        <p>
                            Once a refund is approved by our support team, the transaction will be initiated immediately. You can view all refund transactions in the "Order Transactions" page under your Profile.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">4. Contact support</h3>
                        <p>
                            If you do not receive your refund within the expected timeframe, please reach out to our Customer Support immediately through the Support page in the app.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RefundPolicyPage;
