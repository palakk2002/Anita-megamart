import React from 'react';
import { ChevronLeft, ScrollText } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const TermsPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const fromDelivery = searchParams.get('from') === 'delivery';
    const { settings } = useSettings();
    const appName = settings?.appName || 'App';
    const companyName = settings?.companyName || appName;
    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            {/* Header */}
            <div className="bg-white sticky top-0 z-30 px-4 py-3 flex items-center gap-1 shadow-sm">
                <button
                    onClick={() => {
                        if (window.history.length > 1) {
                            navigate(-1);
                        } else if (window.opener) {
                            window.close();
                        }
                        
                        // Fallback if we couldn't navigate back or close
                        setTimeout(() => {
                            if (fromDelivery) {
                                navigate('/delivery/auth');
                            } else {
                                navigate('/');
                            }
                        }, 100);
                    }}
                    className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors"
                >
                    <ChevronLeft size={24} className="text-slate-600" />
                </button>
                <h1 className="text-lg font-black text-slate-800">Terms & Conditions</h1>
            </div>

            <div className="p-5 max-w-3xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 rounded-2xl bg-brand-50 flex items-center justify-center text-primary">
                            <ScrollText size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Terms & Conditions</h2>
                            <p className="text-xs text-slate-500 font-medium">Last updated: Oct 2025</p>
                        </div>
                    </div>

                    <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-4">
                        <p>
                            Welcome to {appName}. By accessing or using our mobile application and services, you agree to be bound by these Terms and Conditions.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">1. Acceptance of Terms</h3>
                        <p>
                            By creating an account or using our services, you agree to comply with these terms. If you do not agree, you may not use our services.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">2. Use of Service</h3>
                        <p>
                            You must be at least 18 years old to use our services. You agree to provide accurate information during registration and to keep your account secure.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">3. Orders and Payments</h3>
                        <p>
                            All orders are subject to availability. Prices are subject to change without notice. We reserve the right to cancel orders at our discretion.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">4. Intellectual Property</h3>
                        <p>
                            All content, trademarks, and data on this app are the property of {companyName} and are protected by law.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">5. Termination</h3>
                        <p>
                            We reserve the right to end or suspend your account at any time for violation of these terms.
                        </p>

                        <div className="border-t border-slate-100 mt-8 pt-6">
                            <h4 className="text-slate-800 font-bold text-base">Managed By</h4>
                            <div className="mt-3 text-slate-600 space-y-1.5 text-sm font-medium">
                                <p><span className="text-slate-800 font-semibold">Client Name:</span> Anita Lohar</p>
                                <p><span className="text-slate-800 font-semibold">Contact Number:</span> {settings?.supportPhone || '02269621920'}</p>
                                <p><span className="text-slate-800 font-semibold">Address:</span> {settings?.address || 'Ramkrishna Nagar patna 800020'}</p>
                                <p><span className="text-slate-800 font-semibold">Email:</span> {settings?.supportEmail || 'anitamegamart@gmail.com'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsPage;

