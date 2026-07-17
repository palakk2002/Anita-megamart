import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Truck } from "lucide-react";
import { useSettings } from "@core/context/SettingsContext";

const Splash = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const appName = settings?.appName || "App";

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/delivery/login");
    }, 2500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center text-gray-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      {/* Content */}
      <div className="z-10 flex flex-col items-center animate-fade-in-up">
        <div className="bg-primary/10 p-6 rounded-3xl mb-6 animate-bounce-subtle">
          <Truck size={64} className="text-primary" strokeWidth={1.5} />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-2 text-primary">{appName}</h1>
        <p className="text-lg font-medium text-gray-600">
          Quick Commerce Delivery
        </p>
      </div>

      <div className="absolute bottom-12 text-center w-full z-10 px-6 bg-white">
        <p className="text-xl font-bold mb-1 text-gray-900">Deliver Faster.</p>
        <p className="text-xl font-bold text-gray-500">Earn Better.</p>

        {/* Minimal Loading Animation */}
        <div className="mt-8 flex justify-center space-x-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-100" />
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-200" />
        </div>
      </div>
    </div>
  );
};

export default Splash;
