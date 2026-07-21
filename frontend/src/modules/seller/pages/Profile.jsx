import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Store,
  Shield,
  Edit2,
  Save,
  X,
  Rocket,
  Globe,
  MapPin,
  CheckCircle,
} from "lucide-react";
import { sellerApi } from "../services/sellerApi";
import { toast } from "sonner";
import Card from "@shared/components/ui/Card";
import Button from "@shared/components/ui/Button";
import MapPicker from "../../../shared/components/MapPicker";

const SellerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    shopName: "",
    phone: "",
    email: "",
    lat: null,
    lng: null,
    radius: 5,
    address: "",
    profileImage: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await sellerApi.getProfile();
      const data = response.data.result;
      setProfile(data);
      setFormData({
        name: data.name,
        shopName: data.shopName,
        phone: data.phone,
        email: data.email,
        lat: data.location?.coordinates[1] || null,
        lng: data.location?.coordinates[0] || null,
        radius: data.serviceRadius || 5,
        address: data.address || "",
        profileImage: data.profileImage || "",
      });
    } catch (error) {
      toast.error("Failed to fetch profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = (location) => {
    setFormData((prev) => ({
      ...prev,
      lat: location.lat,
      lng: location.lng,
      radius: location.radius,
      address: location.address,
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profileImage: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "name") {
      // Disallow numbers and special characters in seller name
      const cleaned = value.replace(/[^a-zA-Z\s]/g, "");
      setFormData({ ...formData, [name]: cleaned });
    } else if (name === "phone") {
      // Allow only digits, max 10 characters
      const digitsOnly = value.replace(/[^0-9]/g, "").slice(0, 10);
      setFormData({ ...formData, [name]: digitsOnly });
    } else if (name === "email") {
      // Convert to lowercase and trim spaces
      setFormData({ ...formData, [name]: value.trimStart().toLowerCase() });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFocus = (e) => {
    // Small delay to allow the mobile keyboard to fully open before scrolling
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Basic phone validation: must be exactly 10 digits
    if (!/^[0-9]{10}$/.test(formData.phone)) {
      toast.error("Please enter a valid 10-digit phone number.");
      return;
    }
    // Basic email validation
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        lat: formData.lat,
        lng: formData.lng,
        radius: formData.radius,
      };
      await sellerApi.updateProfile(payload);
      toast.success("Profile updated successfully");
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async () => {
    try {
      const newStatus = !profile.isActive;
      await sellerApi.updateProfile({ isActive: newStatus });
      setProfile((prev) => ({ ...prev, isActive: newStatus }));
      toast.success(`Shop is now ${newStatus ? "Active" : "Inactive"}`);
    } catch (error) {
      toast.error("Failed to update shop status");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 font-sans pb-64 md:pb-8">
      {/* Header Section */}
      <div className="mb-6 md:mb-12">
        <div className="pt-6 md:pt-0">
          {/* Profile Info Row */}
          <div className="pb-6 md:pb-0 grid grid-cols-1 md:grid-cols-[144px_minmax(0,1fr)_auto] items-center md:items-end gap-6">
          {/* Avatar Container */}
          <div className="h-32 w-32 md:h-36 md:w-36 rounded-full bg-slate-50 p-1 flex-shrink-0 mx-auto md:mx-0 relative group cursor-pointer" onClick={() => isEditing && document.getElementById("profileImageInput").click()}>
            <div className="h-full w-full rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200 overflow-hidden relative">
              {formData.profileImage ? (
                <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl font-bold text-slate-800">
                  {profile?.name?.charAt(0)}
                </span>
              )}
              {isEditing && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Edit2 className="text-white mb-2" size={24} />
                  <span className="text-white text-xs font-bold">Upload Image</span>
                </div>
              )}
            </div>
            {isEditing && (
              <input 
                id="profileImageInput" 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload} 
              />
            )}
          </div>

          {/* Info Block */}
          <div className="min-w-0 pb-2 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
              <span className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-semibold uppercase tracking-wide rounded-full">
                {profile?.role}
              </span>
              <button
                onClick={toggleStatus}
                className={`group flex items-center gap-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide rounded-full transition-all hover:scale-105 active:scale-95 ${
                  profile?.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}>
                <div
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    profile?.isActive ? "bg-emerald-200" : "bg-rose-200"
                  }`}
                />
                {profile?.isActive ? "Active" : "Inactive"}
              </button>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1 break-words">
              {profile?.name}
            </h1>
            <p className="text-slate-500 font-medium text-sm">
              {profile?.shopName}
            </p>
          </div>

          {/* Action Button */}
          <div className="pb-2 w-full md:w-auto">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                className="w-full md:w-auto bg-slate-900 text-white hover:bg-black transition-all rounded-lg px-6 py-2.5 flex items-center justify-center gap-2 font-semibold text-sm whitespace-nowrap">
                <Edit2 size={16} /> Edit Profile
              </Button>
            ) : (
              <div className="w-full md:w-auto flex gap-3 justify-center md:justify-end">
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  className="h-10 w-10 flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-lg transition-all">
                  <X size={20} />
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="min-w-0 max-w-full bg-slate-900 text-white hover:bg-black rounded-lg px-6 py-2.5 font-semibold text-sm flex items-center gap-2 h-10 whitespace-nowrap">
                  {isSaving ? (
                    "Updating..."
                  ) : (
                    <>
                      <Save size={16} /> Save Changes
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-12">
          <div className="pt-4 border-t border-slate-200/50">
            <h3 className="text-lg font-bold text-slate-900 mb-6">
              Business Profile
            </h3>

            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 ml-1 block">
                    Seller Identity
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                      <User size={16} />
                    </div>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      onFocus={handleFocus}
                      disabled={!isEditing}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/20 transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 ml-1 block">
                    Store Name
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                      <Store size={16} />
                    </div>
                    <input
                      type="text"
                      name="shopName"
                      value={formData.shopName}
                      onChange={handleChange}
                      onFocus={handleFocus}
                      disabled={!isEditing}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/20 transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 ml-1 block">
                    Contact Number
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                      <Phone size={16} />
                    </div>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      onFocus={handleFocus}
                      disabled={!isEditing}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/20 transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 ml-1 block">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500 transition-colors">
                      <Mail size={16} />
                    </div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onFocus={handleFocus}
                      disabled={!isEditing}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/20 transition-all disabled:opacity-60"
                    />
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Location & Radius Settings */}
          <div className="pt-6 border-t border-slate-200/50">
            <div className="flex justify-between items-center mb-6 pb-2">
              <h3 className="text-lg font-bold text-slate-900">
                Location & Service Settings
              </h3>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg px-4 py-2 text-xs font-semibold">
                  Manage
                </Button>
              )}
            </div>

            <div className="space-y-6">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                        formData.lat
                          ? "bg-brand-100 text-brand-600 shadow-[0_8px_20px_-6px_rgba(16,185,129,0.3)]"
                          : "bg-white text-slate-400 shadow-sm"
                      }`}>
                      <MapPin size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900">
                        {formData.lat
                          ? "Store Location Pin"
                          : "Location Not Defined"}
                      </p>
                      <p className="text-xs text-slate-500 font-medium max-w-[400px] leading-relaxed">
                        {formData.address ||
                          "Click change to precisely mark your shop location on the map for delivery accuracy."}
                      </p>
                    </div>
                  </div>
                  {isEditing && (
                    <Button
                      type="button"
                      onClick={() => setIsMapOpen(true)}
                      className="w-full sm:w-auto bg-white text-slate-900 border-2 border-slate-200 hover:border-slate-900 rounded-lg px-6 py-3 text-xs font-bold tracking-wide shadow-sm hover:shadow-md transition-all whitespace-nowrap">
                      CHANGE PIN
                    </Button>
                  )}
                </div>

                {formData.lat && (
                  <div className="pt-4 border-t border-slate-200/60 flex flex-wrap gap-6">
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500 block">
                        Service Radius
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900">
                          {formData.radius}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-md">
                          KM
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500 block">
                        Latitude
                      </span>
                      <span className="text-sm font-semibold text-slate-700 tabular-nums">
                        {formData.lat.toFixed(6)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-slate-500 block">
                        Longitude
                      </span>
                      <span className="text-sm font-semibold text-slate-700 tabular-nums">
                        {formData.lng.toFixed(6)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 p-4 bg-amber-50/50 rounded-xl">
                <Shield size={16} className="text-amber-600 mt-0.5" />
                <p className="text-xs text-amber-700 font-medium leading-relaxed">
                  Your shop location and service radius determine which
                  customers can view your products. Ensure the marker is placed
                  exactly at your physical storefront for accurate delivery
                  assignments.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 pt-4 border-t border-slate-200/50 md:border-none md:pt-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-6">
              Security & Trust
            </h4>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                  <Shield size={18} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Verification
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {profile?.isVerified
                      ? "Verified Merchant"
                      : "Verification Pending"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                  <Rocket size={18} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Partner Tier
                  </p>
                  <p className="text-sm font-bold text-slate-800">Standard Growth</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                  <Globe size={18} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500">
                    Region
                  </p>
                  <p className="text-sm font-bold text-slate-800">Pan India Reach</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isMapOpen && (
        <MapPicker
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          onConfirm={handleLocationSelect}
          initialLocation={
            formData.lat ? { lat: formData.lat, lng: formData.lng } : null
          }
          initialRadius={formData.radius}
        />
      )}
    </div>
  );
};

export default SellerProfile;
