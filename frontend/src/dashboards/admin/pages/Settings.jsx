import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Settings = () => {
  const [profile, setProfile] = useState({ full_name: "", email: "", phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "" });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_BASE_URL}/api/admin/profile/`, { withCredentials: true })
      .then(res => {
        setProfile(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleProfileChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API_BASE_URL}/api/admin/profile/`, profile, { withCredentials: true });
      toast.success("Profile updated");
    } catch (err) {
      toast.error("Failed to update profile");
    }
    setSaving(false);
  };

  const handlePwChange = (e) => {
    setPwForm({ ...pwForm, [e.target.name]: e.target.value });
  };

  const handlePwSave = async (e) => {
    e.preventDefault();
    setPwSaving(true);
    try {
      await axios.post(`${API_BASE_URL}/api/admin/change-password/`, pwForm, { withCredentials: true });
      toast.success("Password changed");
      setPwForm({ old_password: "", new_password: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Password change failed");
    }
    setPwSaving(false);
  };

  if (loading) {
    return <div className="text-sm text-gray-500 flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="flex justify-center items-center min-h-[70vh]">
      <div className="bg-white rounded-xl shadow p-5 w-full max-w-4xl">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 mb-4">Edit Profile</h3>
            <form className="space-y-3" onSubmit={handleProfileSave}>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Full Name</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  name="full_name"
                  value={profile.full_name}
                  onChange={handleProfileChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleProfileChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Phone</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  name="phone"
                  value={profile.phone}
                  onChange={handleProfileChange}
                  required
                />
              </div>
              <button
                className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
          <div className="flex-1 border-t md:border-t-0 md:border-l md:pl-8 pt-8 md:pt-0">
            <h3 className="font-semibold text-gray-800 mb-4">Change Password</h3>
            <form className="space-y-3" onSubmit={handlePwSave}>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Old Password</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  name="old_password"
                  type="password"
                  value={pwForm.old_password}
                  onChange={handlePwChange}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">New Password</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  name="new_password"
                  type="password"
                  value={pwForm.new_password}
                  onChange={handlePwChange}
                  required
                  minLength={6}
                />
              </div>
              <button
                className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm"
                type="submit"
                disabled={pwSaving}
              >
                {pwSaving ? "Saving..." : "Change Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
