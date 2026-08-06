import React, { useState, useEffect } from 'react';
import { sellerApi } from '../services/sellerApi';
import { toast } from 'sonner';
import { Clock, Save, Power, Check, RefreshCw } from 'lucide-react';
import Card from '@shared/components/ui/Card';
import Button from '@shared/components/ui/Button';

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const DEFAULT_SCHEDULE = DAYS.map((day) => ({
  day,
  openTime: '09:00',
  closeTime: '21:00',
  isOpen: true,
}));

const StoreHoursManager = () => {
  const [enabled, setEnabled] = useState(false);
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStoreHours();
  }, []);

  const fetchStoreHours = async () => {
    try {
      setLoading(true);
      const res = await sellerApi.getProfile();
      if (res.data.success) {
        const seller = res.data.result;
        setIsManualOverride(Boolean(seller.isManualOverride));
        if (seller.storeHours) {
          setEnabled(Boolean(seller.storeHours.enabled));
          if (Array.isArray(seller.storeHours.schedule) && seller.storeHours.schedule.length > 0) {
            // Merge with default schedule to ensure all days exist
            const existingMap = new Map(seller.storeHours.schedule.map(s => [s.day, s]));
            const merged = DAYS.map(day => existingMap.get(day) || {
              day,
              openTime: '09:00',
              closeTime: '21:00',
              isOpen: true
            });
            setSchedule(merged);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load store hours:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDayChange = (index, field, value) => {
    setSchedule(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async (resetOverride = false) => {
    setSaving(true);
    try {
      const res = await sellerApi.updateStoreHours({
        enabled,
        schedule,
        resetManualOverride: resetOverride
      });
      if (res.data.success) {
        toast.success(resetOverride ? "Auto-schedule updated & Manual Override reset!" : "Store operating hours saved successfully!");
        fetchStoreHours();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save operating hours");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse flex items-center justify-between">
          <div className="h-6 w-48 bg-slate-200 rounded"></div>
          <div className="h-6 w-24 bg-slate-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 border border-slate-200/80 shadow-sm bg-white rounded-2xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-slate-900">Store Operating Hours & Schedule</h2>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Automatically set your store Online & Offline based on weekly opening hours.
          </p>
        </div>

        {/* Schedule Enable Toggle */}
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
          <span className="text-xs font-bold text-slate-700">Auto-Schedule Mode:</span>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
              enabled ? 'bg-primary' : 'bg-slate-300'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Manual Override Status Banner */}
      {isManualOverride && (
        <div className="my-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-amber-800 font-semibold">
            <Power className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Manual Override Active: You recently used the header toggle. Click below to re-align with Auto-Schedule.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="text-xs font-bold border-amber-300 bg-white hover:bg-amber-100 text-amber-900 whitespace-nowrap"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Reset to Schedule
          </Button>
        </div>
      )}

      {/* Weekly Days Schedule List */}
      <div className={`mt-6 space-y-3 transition-opacity ${enabled ? 'opacity-100' : 'opacity-60 pointer-events-none'}`}>
        {schedule.map((item, idx) => (
          <div
            key={item.day}
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl border ${
              item.isOpen ? 'bg-slate-50/50 border-slate-200/60' : 'bg-rose-50/30 border-rose-100'
            }`}
          >
            <div className="flex items-center gap-3 w-36">
              <input
                type="checkbox"
                id={`day-open-${idx}`}
                checked={item.isOpen}
                onChange={(e) => handleDayChange(idx, 'isOpen', e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
              />
              <label htmlFor={`day-open-${idx}`} className="text-sm font-bold text-slate-800 cursor-pointer select-none">
                {item.day}
              </label>
            </div>

            {item.isOpen ? (
              <div className="flex items-center gap-2 mt-2 sm:mt-0 text-xs font-medium">
                <span className="text-slate-500">Open:</span>
                <input
                  type="time"
                  value={item.openTime || '09:00'}
                  onChange={(e) => handleDayChange(idx, 'openTime', e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-primary"
                />
                <span className="text-slate-400 mx-1">to</span>
                <span className="text-slate-500">Close:</span>
                <input
                  type="time"
                  value={item.closeTime || '21:00'}
                  onChange={(e) => handleDayChange(idx, 'closeTime', e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none focus:border-primary"
                />
              </div>
            ) : (
              <span className="text-xs font-bold text-rose-500 uppercase tracking-wide mt-2 sm:mt-0">
                Closed All Day
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving Schedule..." : "Save Operating Hours"}
        </Button>
      </div>
    </Card>
  );
};

export default StoreHoursManager;
