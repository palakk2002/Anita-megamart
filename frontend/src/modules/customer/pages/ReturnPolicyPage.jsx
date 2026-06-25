import React from 'react';
import { ChevronLeft, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const ReturnPolicyPage = () => {
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
                <h1 className="text-lg font-black text-slate-800">Return Policy</h1>
            </div>

            <div className="p-5 max-w-3xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 rounded-2xl bg-brand-50 flex items-center justify-center text-primary">
                            <RotateCcw size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Return Policy</h2>
                            <p className="text-xs text-slate-500 font-medium">Last updated: Oct 2025</p>
                        </div>
                    </div>

                    <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-4">
                        <p>
                            Thank you for shopping at {appName}. We want you to be completely satisfied with your purchase. If you are not entirely satisfied, we are here to help.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">1. Eligibility for Returns</h3>
                        <p>
                            To be eligible for a return, your item must be unused, in the same condition that you received it, and in its original packaging. Some perishable items (e.g., fresh sweets, cakes, and bakery products) may have different eligibility rules due to their nature.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">2. Return Window</h3>
                        <p>
                            You have 24 hours from the time of delivery to request a return for fresh food or perishable items, and up to 7 days for non-perishable goods, depending on the product category.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">3. Proof of Purchase</h3>
                        <p>
                            To complete your return, we require a receipt, order confirmation email, or other proof of purchase.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">4. Inspection and Approval</h3>
                        <p>
                            Once we receive your returned item, we will inspect it and notify you that we have received it. We will immediately notify you of the status of your return request after inspection.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">5. Contact Us</h3>
                        <p>
                            If you have any questions on how to return your item to us, contact our support team through the Help & Support section of the app.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReturnPolicyPage;
