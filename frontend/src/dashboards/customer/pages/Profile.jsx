import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiUser, FiMail, FiPhone, FiMapPin, FiLock, FiCheck, FiPlus, FiTrash2, FiEdit2, FiSave } from "react-icons/fi";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Profile = () => {
  const [profile, setProfile] = useState({ full_name: "", email: "", phone: "" });
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwords, setPasswords] = useState({ old_password: "", new_password: "", confirm_password: "" });

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    address_label: "Home",
    full_address: "",
    pincode: "",
    latitude: "",
    longitude: "",
  });
  const [mapCenter, setMapCenter] = useState({ lat: 10.8505, lng: 76.2711 });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/customer/profile/`, { withCredentials: true });
      setProfile(res.data);
    } catch {
      setError("Failed to load profile");
    }
  };

  const fetchAddresses = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/customer/addresses/`, { withCredentials: true });
      setAddresses(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAddresses([]);
    }
  };

  useEffect(() => {
    Promise.all([fetchProfile(), fetchAddresses()]).finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await axios.put(`${API_BASE_URL}/api/customer/profile/`, profile, { withCredentials: true });
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm_password) {
      setError("Passwords don't match");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await axios.post(`${API_BASE_URL}/api/accounts/customer/change-password/`, {
        old_password: passwords.old_password,
        new_password: passwords.new_password,
      }, { withCredentials: true });
      setSuccess("Password changed successfully!");
      setPasswords({ old_password: "", new_password: "", confirm_password: "" });
      setShowPasswordForm(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.slice(0, 5));
    } catch {
      setSearchResults([]);
    }
  };

  const handleSelectLocation = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    setAddressForm((prev) => ({ ...prev, latitude: lat, longitude: lon }));
    setMapCenter({ lat, lng: lon });
    setSearchResults([]);
  };

  const LocationPicker = () => {
    useMapEvents({
      click(e) {
        setAddressForm((prev) => ({ ...prev, latitude: e.latlng.lat, longitude: e.latlng.lng }));
        setMapCenter({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    return addressForm.latitude && addressForm.longitude ? (
      <Marker position={{ lat: Number(addressForm.latitude), lng: Number(addressForm.longitude) }} />
    ) : null;
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!addressForm.full_address || !addressForm.pincode) {
      setError("Address and pincode are required");
      return;
    }

    if (addressForm.latitude == null || addressForm.latitude === "" || addressForm.longitude == null || addressForm.longitude === "") {
      setError("Please pick the location on the map (latitude/longitude required).");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (editingAddressId) {
        await axios.put(
          `${API_BASE_URL}/api/customer/addresses/${editingAddressId}/`,
          addressForm,
          { withCredentials: true }
        );
        setSuccess("Address updated successfully!");
      } else {
        await axios.post(`${API_BASE_URL}/api/customer/addresses/`, addressForm, { withCredentials: true });
        setSuccess("Address added successfully!");
      }

      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm({ address_label: "Home", full_address: "", pincode: "", latitude: "", longitude: "" });
      await fetchAddresses();
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError(editingAddressId ? "Failed to update address" : "Failed to add address");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/customer/addresses/${id}/`, { withCredentials: true });
      fetchAddresses();
    } catch {
      setError("Failed to delete address");
    }
  };

  const closeAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddressId(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const openAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({ address_label: "Home", full_address: "", pincode: "", latitude: "", longitude: "" });
    setSearchQuery("");
    setSearchResults([]);
    setShowAddressForm(true);
  };

  const openEditAddress = (addr) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      address_label: addr.address_label || addr.address_line || "Home",
      full_address: addr.full_address || "",
      pincode: addr.pincode || "",
      latitude: addr.latitude || "",
      longitude: addr.longitude || "",
    });

    const lat = parseFloat(addr.latitude);
    const lng = parseFloat(addr.longitude);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) setMapCenter({ lat, lng });

    setSearchQuery("");
    setSearchResults([]);
    setShowAddressForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-emerald-50 text-emerald-700 rounded-xl p-4 flex items-center gap-3">
          <FiCheck className="text-lg" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 rounded-xl p-4">{error}</div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <FiUser className="text-3xl text-white" />
            </div>
            <div className="text-white">
              <h2 className="text-xl font-bold">{profile.full_name || "Your Name"}</h2>
              <p className="text-purple-200">{profile.email}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <div className="relative">
              <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <FiSave />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Password Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FiLock className="text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-800">Password</h3>
          </div>
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            {showPasswordForm ? "Cancel" : "Change Password"}
          </button>
        </div>

        {showPasswordForm && (
          <form onSubmit={handleChangePassword} className="space-y-4 mt-4 pt-4 border-t">
            <input
              type="password"
              placeholder="Current Password"
              className="w-full px-4 py-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              value={passwords.old_password}
              onChange={(e) => setPasswords({ ...passwords, old_password: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="New Password"
              className="w-full px-4 py-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              value={passwords.new_password}
              onChange={(e) => setPasswords({ ...passwords, new_password: e.target.value })}
              required
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              className="w-full px-4 py-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              value={passwords.confirm_password}
              onChange={(e) => setPasswords({ ...passwords, confirm_password: e.target.value })}
              required
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? "Changing..." : "Update Password"}
            </button>
          </form>
        )}
      </div>

      {/* Addresses Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <FiMapPin className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Saved Addresses</h3>
              <p className="text-xs text-gray-500 mt-0.5">Add, edit, and manage your pickup addresses</p>
            </div>
          </div>

          <button
            onClick={() => (showAddressForm ? closeAddressForm() : openAddAddress())}
            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
          >
            <FiPlus className="text-sm" />
            {showAddressForm ? "Close" : "Add New"}
          </button>
        </div>

        {showAddressForm && (
          <form onSubmit={handleSaveAddress} className="space-y-4 mb-6 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-gray-800">
                {editingAddressId ? "Edit Address" : "Add Address"}
              </div>
              {editingAddressId ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingAddressId(null);
                    setAddressForm({ address_label: "Home", full_address: "", pincode: "", latitude: "", longitude: "" });
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Switch to Add
                </button>
              ) : null}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Place Name</label>
              <input
                type="text"
                placeholder="Home / Office / Hostel"
                className="w-full px-4 py-2.5 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                value={addressForm.address_label}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, address_label: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Address</label>
              <input
                type="text"
                placeholder="House/Street, Area, City"
                className="w-full px-4 py-2.5 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                value={addressForm.full_address}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, full_address: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
              <input
                type="text"
                placeholder="6-digit pincode"
                className="w-full px-4 py-2.5 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                value={addressForm.pincode}
                onChange={(e) =>
                  setAddressForm((prev) => ({ ...prev, pincode: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search location (e.g., MG Road, Kochi)"
                  className="flex-1 px-4 py-2.5 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleSearchLocation}
                  className="px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-black"
                >
                  Search
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm max-h-44 overflow-y-auto">
                  {searchResults.map((r, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0"
                      onClick={() => handleSelectLocation(r)}
                    >
                      {r.display_name}
                    </button>
                  ))}
                </div>
              )}

              <div className="h-64 rounded-xl overflow-hidden">
                <MapContainer center={mapCenter} zoom={10} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationPicker />
                </MapContainer>
              </div>
              <p className="text-xs text-gray-500">Click on the map to pin the exact pickup location</p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeAddressForm}
                  className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <FiSave />
                  {saving ? "Saving..." : editingAddressId ? "Save Changes" : "Add Address"}
                </button>
              </div>
            </div>
          </form>
        )}

        {addresses.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl">
            <FiMapPin className="text-4xl text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No addresses saved yet</p>
            <p className="text-sm text-gray-500 mt-1">Add an address to place an order faster.</p>
            <button
              onClick={openAddAddress}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
            >
              <FiPlus /> Add Address
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {addresses.map((addr) => {
              const placeName =
                addr.address_line ||
                addr.address_label ||
                addr.label ||
                "Saved Address";

              const region = [addr.city, addr.state].filter(Boolean).join(", ");

              return (
                <div
                  key={addr.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2 bg-purple-100 rounded-xl">
                        <FiMapPin className="text-purple-600" />
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold text-gray-800 truncate">{placeName}</div>
                        <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {addr.full_address}
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          {region ? (
                            <span>{region}</span>
                          ) : null}
                          {addr.pincode ? (
                            <span>{region ? " • " : ""}PIN: {addr.pincode}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditAddress(addr)}
                        className="p-2 text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                        title="Edit address"
                      >
                        <FiEdit2 />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="p-2 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete address"
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
