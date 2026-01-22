import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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
      <div className="bg-white rounded-xl shadow p-5 max-w-3xl w-full">
        <h3 className="font-semibold text-gray-800 mb-4">Branch Details</h3>
        <form className="space-y-3" onSubmit={handleSave}>
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Branch Name" value={form.branch_name} onChange={(e) => setForm({ ...form, branch_name: e.target.value })} />
          <input className="w-full border rounded-lg px-3 py-2" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />

          <div className="border rounded-lg p-3">
            <div className="flex flex-col md:flex-row gap-2 mb-3">
              <input
                className="border rounded px-3 py-2 flex-1"
                placeholder="Search location (e.g., Chennai Central)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="px-3 py-2 rounded bg-gray-900 text-white" type="button" onClick={handleSearch}>Search</button>
            </div>
            {searchResults.length > 0 && (
              <div className="border rounded mb-3">
                {searchResults.map((r, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                    type="button"
                    onClick={() => handleSelectLocation(r)}
                  >
                    {r.display_name}
                  </button>
                ))}
              </div>
            )}
            <div className="h-64 md:h-80 rounded overflow-hidden w-full">
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

          <button className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Branch;
