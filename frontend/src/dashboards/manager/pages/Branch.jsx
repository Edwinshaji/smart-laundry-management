import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { FiMapPin, FiSave, FiSearch } from "react-icons/fi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Branch = () => {
  const [form, setForm] = useState({ branch_name: "", address: "", latitude: "", longitude: "" });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const defaultCenter = useMemo(() => ({ lat: 10.8505, lng: 76.2711 }), []);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(9);
  const mapRef = useRef();

  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/manager/branch/`, { withCredentials: true })
      .then((res) => {
        setForm(res.data);
        const lat = Number(res.data.latitude);
        const lng = Number(res.data.longitude);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          setMapCenter({ lat, lng });
          setMapZoom(10);
        }
      })
      .catch(() => {});
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await axios.put(`${API_BASE_URL}/api/manager/branch/`, form, { withCredentials: true });
      toast.success("Branch updated");
    } catch {
      toast.error("Update failed");
    }
    setSaving(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
    const data = await res.json();
    setSearchResults(data.slice(0, 5));
  };

  const handleSelectLocation = (item) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    setForm({ ...form, latitude: lat, longitude: lon });
    setMapCenter({ lat, lng: lon });
    setMapZoom(10);
    setSearchResults([]);
    if (mapRef.current) {
      mapRef.current.setView([lat, lon], 10);
    }
  };

  function MapWithRef() {
    const map = useMap();
    useEffect(() => {
      mapRef.current = map;
    }, [map]);
    return null;
  }

  const LocationPicker = () => {
    useMapEvents({
      click(e) {
        setForm({ ...form, latitude: e.latlng.lat, longitude: e.latlng.lng });
        setMapCenter({ lat: e.latlng.lat, lng: e.latlng.lng });
        setMapZoom(10);
        if (mapRef.current) {
          mapRef.current.setView([e.latlng.lat, e.latlng.lng], 10);
        }
      },
    });
    return form.latitude && form.longitude ? (
      <Marker position={{ lat: Number(form.latitude), lng: Number(form.longitude) }} />
    ) : null;
  };

  return (
    <div className="flex justify-center items-start w-full">
      <div className="bg-white rounded-xl shadow-sm overflow-hidden max-w-3xl w-full">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <FiMapPin className="text-2xl text-white" />
            </div>
            <div className="text-white">
              <h3 className="text-xl font-bold">Branch Details</h3>
              <p className="text-purple-100 text-sm mt-0.5">Update your branch location and service address.</p>
            </div>
          </div>
        </div>

        <form className="p-6 space-y-4" onSubmit={handleSave}>
          <input
            className="w-full px-4 py-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
            placeholder="Branch Name"
            value={form.branch_name}
            onChange={(e) => setForm({ ...form, branch_name: e.target.value })}
          />
          <input
            className="w-full px-4 py-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />

          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex flex-col md:flex-row gap-2 mb-3">
              <input
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                placeholder="Search location (e.g., Chennai Central)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                type="button"
                onClick={handleSearch}
              >
                <FiSearch /> Search
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden">
                {searchResults.map((r, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50"
                    type="button"
                    onClick={() => handleSelectLocation(r)}
                  >
                    {r.display_name}
                  </button>
                ))}
              </div>
            )}
            <div className="h-64 md:h-80 rounded-xl overflow-hidden w-full">
              <MapContainer center={mapCenter} zoom={mapZoom} className="h-full w-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapWithRef />
                {form.latitude && form.longitude && (
                  <Marker position={{ lat: Number(form.latitude), lng: Number(form.longitude) }} />
                )}
                <LocationPicker />
              </MapContainer>
            </div>
          </div>

          {/* Hidden lat/lng fields to submit values */}
          <input type="hidden" value={form.latitude} />
          <input type="hidden" value={form.longitude} />

          <button
            className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            type="submit"
            disabled={saving}
          >
            <FiSave />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Branch;
