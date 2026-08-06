import React, { useState, useEffect } from 'react';
import { sellerApi } from '@/modules/seller/services/sellerApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Power, Clock } from 'lucide-react';

const SellerStatusToggle = ({ className = "" }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchStatus = async () => {
      try {
        const res = await sellerApi.getProfile();
        if (active && res.data.success) {
          const seller = res.data.result;
          setIsOnline(Boolean(seller.isOnline ?? true));
          setIsStoreOpen(Boolean(seller.isStoreOpen ?? true));
          setIsManualOverride(Boolean(seller.isManualOverride ?? false));
        }
      } catch (err) {
        console.error("Error fetching seller store status:", err);
      } finally {
        if (active) setFetching(false);
      }
    };
    fetchStatus();
    return () => { active = false; };
  }, []);

  const handleToggle = async () => {
    if (loading) return;
    const nextStatus = !isOnline;
    setLoading(true);
    try {
      const res = await sellerApi.toggleStoreStatus({ isOnline: nextStatus });
      if (res.data.success) {
        const data = res.data.result || {};
        setIsOnline(data.isOnline);
        setIsStoreOpen(data.isStoreOpen);
        setIsManualOverride(data.isManualOverride);
        if (data.isOnline) {
          toast.success("🟢 Store is now ONLINE (Accepting Orders)");
        } else {
          toast.warning("🔴 Store is now OFFLINE (Shop Closed)");
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update store status");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 animate-pulse text-xs font-medium text-slate-400", className)}>
        <span className="h-2 w-2 rounded-full bg-slate-300"></span>
        Loading Status...
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        onClick={handleToggle}
        disabled={loading}
        title={isStoreOpen ? "Click to set Store Offline" : "Click to set Store Online"}
        className={cn(
          "relative flex items-center gap-2 px-3.5 py-1.5 rounded-full font-bold text-xs transition-all duration-300 border shadow-sm select-none active:scale-95",
          isStoreOpen
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",
          loading && "opacity-70 cursor-not-allowed"
        )}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span
            className={cn(
              "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
              isStoreOpen ? "bg-emerald-400" : "bg-rose-400"
            )}
          />
          <span
            className={cn(
              "relative inline-flex rounded-full h-2.5 w-2.5",
              isStoreOpen ? "bg-emerald-500" : "bg-rose-500"
            )}
          />
        </span>

        <span className="font-extrabold uppercase tracking-wider text-[11px]">
          {isStoreOpen ? "Store Open" : "Shop Closed"}
        </span>

        {/* Toggle Pill Switch visual */}
        <div
          className={cn(
            "w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-300 ml-1",
            isStoreOpen ? "bg-emerald-500" : "bg-rose-400"
          )}
        >
          <div
            className={cn(
              "bg-white w-3 h-3 rounded-full shadow-md transform transition-transform duration-300",
              isStoreOpen ? "translate-x-3" : "translate-x-0"
            )}
          />
        </div>
      </button>

      {isManualOverride && (
        <span className="hidden xl:inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md" title="Manual Toggle is overriding schedule">
          <Power className="w-3 h-3 text-amber-500" /> Manual Override
        </span>
      )}
    </div>
  );
};

export default SellerStatusToggle;
