import React from "react";
import WashMateLogo from "../../assets/WashMate_logo.png";
import { FiMenu } from "react-icons/fi";

const CustomerNavbar = ({ items, activeKey, onNavigate, mobileOpen, onToggle, onClose, onLogout }) => {
  const handleNavigate = (key) => {
    onNavigate(key);
    onClose();
  };

  return (
    <>
      <header className="h-16 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src={WashMateLogo}
            alt="WashMate Logo"
            className="h-20 md:h-21 w-auto drop-shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="md:hidden p-2 rounded-xl bg-white/10 hover:bg-white/15 ring-1 ring-white/20 transition"
            onClick={onToggle}
            aria-label="Open menu"
          >
            <FiMenu className="text-white" />
          </button>
          <nav className="hidden md:flex items-center gap-2">
            {items.map((item) => (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={[
                  "px-3 py-1.5 rounded-xl text-sm font-semibold transition ring-1",
                  activeKey === item.key
                    ? "bg-white/15 text-white ring-white/20"
                    : "text-white/85 hover:text-white bg-transparent hover:bg-white/10 ring-transparent",
                ].join(" ")}>
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={onLogout}
              className="ml-2 px-3 py-1.5 rounded-xl text-sm font-semibold bg-white text-purple-700 hover:bg-white/90 transition"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <div
        className={`fixed inset-0 bg-black/40 z-40 md:hidden ${mobileOpen ? "block" : "hidden"}`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 left-0 h-screen w-64 bg-white z-50 p-4 md:hidden transform transition-transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b">
          <img src={WashMateLogo} alt="WashMate Logo" className="h-10 w-auto" />
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
            Close
          </button>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.key}
              onClick={() => handleNavigate(item.key)}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-semibold transition ${
                activeKey === item.key ? "bg-purple-100 text-purple-700" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onLogout}
            className="w-full mt-3 px-3 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default CustomerNavbar;
