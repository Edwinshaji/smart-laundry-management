import React from "react";

const DeliverySidebar = ({ items, activeKey, onNavigate, mobileOpen, onClose, onLogout }) => {
  const handleNavigate = (key) => {
    onNavigate(key);
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/40 z-40 md:hidden ${mobileOpen ? "block" : "hidden"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 left-0 h-screen w-64 bg-gradient-to-b from-purple-700 to-purple-500 z-50 flex flex-col transform transition-transform
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:block`}
      >
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <span className="text-lg font-bold text-white">WashMate</span>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavigate(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition
              ${activeKey === item.key ? "bg-white/20 text-white" : "text-white/80 hover:bg-white/10"}`}
            >
              <item.icon className="text-lg" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 mt-auto">
          <button
            type="button"
            onClick={onLogout}
            aria-label="Logout"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white/20 text-white hover:bg-white/30 transition"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default DeliverySidebar;
