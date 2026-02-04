import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiMapPin, FiUser, FiShield, FiPhone, FiMail } from "react-icons/fi";

// NEW: keep these components at module scope so they don't get recreated on every render
const Card = ({ title, icon: Icon, right, children }) => (
  <div className="bg-white rounded-xl shadow border border-gray-100">
    <div className="px-5 py-4 border-b flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="text-gray-700" /> : null}
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      {right}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Field = ({ label, icon: Icon, children }) => (
  <div className="rounded-lg border border-gray-200 p-3">
    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
      {Icon ? <Icon className="text-gray-500" /> : null}
      <span>{label}</span>
    </div>
    <div className="text-sm text-gray-800 font-medium break-words">{children}</div>
  </div>
);

const DeliveryProfile = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  const [editForm, setEditForm] = useState({ full_name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ old_password: "", new_password: "" });
  const [pwSaving, setPwSaving] = useState(false);

  const fetchProfile = () => {
    setLoading(true);
    axios
      .get(`/api/delivery/profile/`, { withCredentials: true })
      .then((res) => {
        setProfile(res.data);
        setEditForm({
          full_name: res.data?.full_name || "",
          phone: res.data?.phone || "",
          email: res.data?.email || "",
        });
        setLoading(false);
      })
      .catch(() => {
        setProfile(null);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const availabilityPill = useMemo(() => {
    if (!profile) return "bg-gray-100 text-gray-600";
    return profile.is_available ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700";
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`/api/delivery/profile/`, editForm, { withCredentials: true });
      toast.success("Profile updated");
      fetchProfile();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwSaving(true);
    try {
      await axios.post(`/api/delivery/change-password/`, pwForm, { withCredentials: true });
      toast.success("Password changed");
      setPwForm({ old_password: "", new_password: "" });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Password change failed");
    } finally {
      setPwSaving(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Loading...</div>;
  if (!profile) return <div className="text-sm text-gray-500">Unable to load profile.</div>;

  return (
    <div className="space-y-6">
      {/* 1) Work details card (first) */}
      <Card
        title="Work Details"
        icon={FiMapPin}
        right={
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${availabilityPill}`}>
            {profile.is_available ? "Available" : "Unavailable"}
          </span>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Branch">
            {profile.branch?.name || "-"}
            {profile.branch?.city ? (
              <div className="text-xs font-normal text-gray-500 mt-1">
                {profile.branch.city}
                {profile.branch.state ? `, ${profile.branch.state}` : ""}
              </div>
            ) : null}
          </Field>

          <Field label="Service Zone">
            {profile.zone?.zone_name || "Unassigned"}
            {profile.zone?.pincodes?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {profile.zone.pincodes.slice(0, 10).map((p) => (
                  <span key={p} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px]">
                    {p}
                  </span>
                ))}
                {profile.zone.pincodes.length > 10 ? (
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[11px]">
                    +{profile.zone.pincodes.length - 10} more
                  </span>
                ) : null}
              </div>
            ) : null}
          </Field>

          <Field label="Branch Address">
            <span className="font-normal text-gray-700">
              {profile.branch?.address || "-"}
            </span>
          </Field>
        </div>
      </Card>

      {/* 2) Edit profile + password (below) */}
      <Card title="Profile Settings" icon={FiUser}>
        <form className="space-y-6" onSubmit={handleSave}>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Full Name</label>
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                <FiUser className="text-gray-400" />
                <input
                  className="w-full outline-none text-sm"
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, full_name: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone</label>
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                <FiPhone className="text-gray-400" />
                <input
                  className="w-full outline-none text-sm"
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, phone: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                <FiMail className="text-gray-400" />
                <input
                  type="email"
                  className="w-full outline-none text-sm"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, email: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <button
            className="w-full md:w-auto px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold disabled:opacity-50"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>

        <div className="my-6 border-t" />

        <div className="flex items-center gap-2 mb-3">
          <FiShield className="text-gray-700" />
          <h4 className="font-semibold text-gray-800">Change Password</h4>
        </div>

        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleChangePassword}>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Old Password</label>
            <input
              type="password"
              className="border rounded-lg px-3 py-2 w-full text-sm"
              value={pwForm.old_password}
              onChange={(e) =>
                setPwForm((p) => ({ ...p, old_password: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">New Password</label>
            <input
              type="password"
              className="border rounded-lg px-3 py-2 w-full text-sm"
              value={pwForm.new_password}
              onChange={(e) =>
                setPwForm((p) => ({ ...p, new_password: e.target.value }))
              }
              required
              minLength={6}
            />
          </div>

          <button
            className="md:col-span-2 w-full md:w-auto px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold disabled:opacity-50"
            type="submit"
            disabled={pwSaving}
          >
            {pwSaving ? "Saving..." : "Update Password"}
          </button>
        </form>
      </Card>
    </div>
  );
};

export default DeliveryProfile;
