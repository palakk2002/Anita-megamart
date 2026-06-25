import React from 'react';
import { ChevronLeft, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '@core/context/SettingsContext';

const ShippingPolicyPage = () => {
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
                <h1 className="text-lg font-black text-slate-800">Shipping Policy</h1>
            </div>

            <div className="p-5 max-w-3xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 rounded-2xl bg-brand-50 flex items-center justify-center text-primary">
                            <Truck size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Shipping Policy</h2>
                            <p className="text-xs text-slate-500 font-medium">Last updated: Oct 2025</p>
                        </div>
                    </div>

                    <div className="prose prose-slate prose-sm max-w-none text-slate-600 space-y-4">
                        <p>
                            Welcome to the Shipping & Delivery policy for {appName}. We are dedicated to providing fast and reliable delivery of fresh goods, sweets, and bakery items.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">1. Delivery Coverage</h3>
                        <p>
                            We deliver to selected areas and pincodes. Please ensure your delivery location is accurately set in the app to view the products available in your area.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">2. Delivery Time</h3>
                        <p>
                            We offer instant or quick-commerce delivery. Orders are typically prepared and dispatched within minutes of order confirmation. Estimated delivery times are shown at the checkout page before payment.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">3. Shipping/Delivery Charges</h3>
                        <p>
                            Delivery charges are calculated based on the delivery distance and order volume. Any applicable delivery fees will be shown transparently in the cart summary before checkout.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">4. Tracking Delivery</h3>
                        <p>
                            You can track your order status and view the live location of our delivery partner on the tracking screen after your order has been dispatched.
                        </p>

                        <h3 className="text-slate-800 font-bold text-base mt-6">5. Failed Deliveries</h3>
                        <p>
                            If a delivery cannot be completed due to incorrect address information, unavailability of the recipient, or refusal to accept the order, additional charges may apply for re-delivery or cancellation.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShippingPolicyPage;
