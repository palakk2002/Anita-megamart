import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Landmark, CreditCard, AlertTriangle, CheckCircle2 } from "lucide-react";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import Input from "@/shared/components/ui/Input";
import { useAuth } from "@core/context/AuthContext";
import { deliveryApi } from "../../services/deliveryApi";
import { toast } from "sonner";

const BankAccount = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [editForm, setEditForm] = useState({
    accountHolder: "",
    accountNumber: "",
    confirmAccountNumber: "",
    ifsc: "",
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!editForm.accountHolder.trim()) {
      newErrors.accountHolder = "Account holder name is required";
    }
    if (!editForm.accountNumber.trim()) {
      newErrors.accountNumber = "Account number is required";
    } else {
      const accRegex = /^\d{9,18}$/;
      if (!accRegex.test(editForm.accountNumber.trim())) {
        newErrors.accountNumber = "Account number must be 9 to 18 digits";
      }
    }
    if (editForm.accountNumber !== editForm.confirmAccountNumber) {
      newErrors.confirmAccountNumber = "Account numbers do not match";
    }
    if (!editForm.ifsc.trim()) {
      newErrors.ifsc = "IFSC Code is required";
    } else {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(editForm.ifsc.trim())) {
        newErrors.ifsc = "Invalid IFSC Code (e.g., HDFC0123456)";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (user) {
      setEditForm((prev) => ({
        ...prev,
        accountHolder: user.accountHolder || "",
        ifsc: user.ifsc || "",
      }));
    }
  }, [user]);

  const bankDetails = {
    accountHolder: user?.accountHolder || "Not Specified",
    accountNumber: user?.accountNumber
      ? user.accountNumber.length > 4
        ? "XXXXXXXX" + user.accountNumber.slice(-4)
        : user.accountNumber
      : "Not Specified",
    ifsc: user?.ifsc || "Not Specified",
    bankName: user?.ifsc ? "Verified Bank Partner" : "N/A",
    status: user?.isVerified ? "Verified" : "Pending",
  };

  const handleUpdate = async () => {
    if (!validate()) {
      return toast.error("Please fix the errors before updating");
    }

    try {
      const response = await deliveryApi.updateProfile({
        accountHolder: editForm.accountHolder,
        accountNumber: editForm.accountNumber,
        ifsc: editForm.ifsc,
      });

      if (response.data.success) {
        await refreshUser();
        setEditForm((prev) => ({
          ...prev,
          accountNumber: "",
          confirmAccountNumber: "",
        }));
        toast.success("Bank details updated successfully!");
      } else {
        toast.error(response.data.message || "Failed to update bank details");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error updating bank details");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-48 pt-[72px]">
      {/* Header */}
      <div className="bg-white shadow-sm fixed top-0 w-full max-w-md inset-x-0 mx-auto z-30">
        <div className="flex items-center p-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-2"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="ds-h3 text-gray-900">Bank Account</h1>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Bank Card Visual */}
        <div className="bg-gradient-to-br from-brand-900 to-brand-800 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex justify-between items-start mb-8 relative z-10">
            <Landmark size={32} className="text-white/80" />
            <span className="bg-brand-500/20 text-brand-300 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-brand-500/30 flex items-center">
              <CheckCircle2 size={12} className="mr-1" /> Active
            </span>
          </div>

          <div className="space-y-1 relative z-10">
            <p className="text-brand-200 text-xs uppercase tracking-wider">Account Number</p>
            <p className="font-mono text-2xl tracking-widest">{bankDetails.accountNumber}</p>
          </div>

          <div className="flex justify-between items-end mt-8 relative z-10">
            <div>
              <p className="text-brand-200 text-xs uppercase tracking-wider mb-1">Account Holder</p>
              <p className="font-bold text-lg">{bankDetails.accountHolder}</p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold">{bankDetails.bankName}</p>
              <p className="text-brand-200 text-xs">{bankDetails.ifsc}</p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex items-start">
          <AlertTriangle size={20} className="text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-yellow-800 font-bold text-sm mb-1">Payment Information</h4>
            <p className="text-xs text-yellow-700 leading-relaxed">
              Your weekly earnings will be deposited to this account every Tuesday. 
              Changes to bank details may delay your next payout by up to 7 days.
            </p>
          </div>
        </div>

        {/* Change Request Form */}
        <div className="pt-4">
          <h3 className="ds-h4 text-gray-900 mb-4">Request Change</h3>
          <div className="space-y-4">
            <Input 
              label="Account Holder Name" 
              placeholder="Enter name"
              value={editForm.accountHolder}
              onChange={(e) => {
                setEditForm({ ...editForm, accountHolder: e.target.value });
                if (errors.accountHolder) setErrors({ ...errors, accountHolder: null });
              }}
              icon={CreditCard}
              error={errors.accountHolder}
            />
            <Input 
              label="New Account Number" 
              placeholder="Enter account number" 
              value={editForm.accountNumber}
              onChange={(e) => {
                setEditForm({ ...editForm, accountNumber: e.target.value.replace(/\D/g, '') });
                if (errors.accountNumber) setErrors({ ...errors, accountNumber: null });
              }}
              icon={CreditCard}
              maxLength={18}
              error={errors.accountNumber}
            />
            <Input 
              label="Confirm Account Number" 
              placeholder="Re-enter account number" 
              value={editForm.confirmAccountNumber}
              onChange={(e) => {
                setEditForm({ ...editForm, confirmAccountNumber: e.target.value.replace(/\D/g, '') });
                if (errors.confirmAccountNumber) setErrors({ ...errors, confirmAccountNumber: null });
              }}
              icon={CreditCard}
              maxLength={18}
              error={errors.confirmAccountNumber}
            />
            <Input 
              label="IFSC Code" 
              placeholder="Enter IFSC code" 
              value={editForm.ifsc}
              onChange={(e) => {
                setEditForm({ ...editForm, ifsc: e.target.value.toUpperCase() });
                if (errors.ifsc) setErrors({ ...errors, ifsc: null });
              }}
              icon={Landmark}
              maxLength={11}
              error={errors.ifsc}
            />
            <Button className="w-full mt-2" onClick={handleUpdate}>
              Verify & Update
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankAccount;
