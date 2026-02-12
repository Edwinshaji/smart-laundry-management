import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { FiMapPin } from "react-icons/fi";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

const Branches = () => {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    city_id: "",
    branch_name: "",
    address: "",
    latitude: "",
    longitude: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [cities, setCities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const pageSize = 6;

  // Kerala default center
  const defaultCenter = useMemo(() => ({ lat: 10.8505, lng: 76.2711 }), []);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(9);
  const mapRef = useRef();

  const fetchBranches = async () => {
    setLoading(true);
    const res = await axios.get(`${API_BASE_URL}/api/admin/branches/`, { withCredentials: true });
    setRows(res.data);
    setLoading(false);
  };

  const fetchCities = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/admin/cities/`, { withCredentials: true });
    setCities(res.data);
  };

  useEffect(() => {
    fetchBranches();
    fetchCities();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [rows.length]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const handleCreateOrUpdate = async () => {
    if (!form.city_id && !editingId) return;
    try {
      if (editingId) {
        await axios.put(`${API_BASE_URL}/api/admin/branches/${editingId}/`, form, { withCredentials: true });
        setEditingId(null);
      } else {
        await axios.post(`${API_BASE_URL}/api/admin/branches/`, form, { withCredentials: true });
      }
      setForm({ city_id: "", branch_name: "", address: "", latitude: "", longitude: "" });
      fetchBranches();
    } catch (err) {
      alert(`Branch update failed: ${err.response?.status} ${err.response?.data?.detail || ""}`);
    }
  };

  const handleEdit = (branch) => {
    setEditingId(branch.id);
    setForm({
      city_id: branch.city_id || cities.find(c => c.name === branch.city)?.id || "",
      branch_name: branch.name,
      address: branch.address,
      latitude: branch.latitude || "",
      longitude: branch.longitude || "",
    });

    if (branch.latitude && branch.longitude) {
      const lat = Number(branch.latitude);
      const lng = Number(branch.longitude);
      setMapCenter({ lat, lng });
      setMapZoom(10);
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 10);
      }
    }
  };

  const handleDelete = async (id) => {
    try {
      // Ensure backend has /api/admin/branches/<id>/ endpoint (DELETE)
      await axios.delete(`${API_BASE_URL}/api/admin/branches/${id}/`, { withCredentials: true });
      fetchBranches();
    } catch (err) {
      alert("Branch delete failed. Backend endpoint /api/admin/branches/<id>/ not found (404).");
      // Optionally, show a toast or error UI here
    }
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
    // Pan/zoom the map to the selected location
    if (mapRef.current) {
      mapRef.current.setView([lat, lon], 10);
    }
  };

  // Custom MapContainer to get map instance
  function MapWithRef(props) {
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
    <div className="space-y-6">
      {/* Form card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-orange-100">
              <FiMapPin className="text-orange-600 text-xl" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Branches</h3>
              <p className="text-sm text-gray-500 mt-0.5">Create and manage branch locations.</p>
            </div>
          </div>
          <button
            className="px-4 py-2.5 text-sm rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium hover:from-purple-700 hover:to-indigo-700"
            onClick={handleCreateOrUpdate}
          >
            {editingId ? "Update Branch" : "Add Branch"}
          </button>
        </div>

        <div className="p-6">

        <div className="grid gap-3 mb-4">
          <select
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 w-full text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            value={form.city_id}
            onChange={e => setForm({ ...form, city_id: e.target.value })}
          >
            <option value="">Select City</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}, {c.state}</option>
            ))}
          </select>
          <input
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 w-full text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            placeholder="Branch Name"
            value={form.branch_name}
            onChange={e => setForm({ ...form, branch_name: e.target.value })}
          />
          <input
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 w-full text-sm focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
            placeholder="Address"
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
          />
        </div>

        <div className="border border-gray-100 rounded-xl p-4">
          <div className="flex flex-col md:flex-row gap-2 mb-3">
            <input
              className="border border-gray-200 rounded-lg px-3 py-2.5 flex-1 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              placeholder="Search location (e.g., Chennai Central)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="px-4 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium" onClick={handleSearch}>
              Search
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden">
              {searchResults.map((r, idx) => (
                <button
                  key={idx}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
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
        </div>
      </div>

      {/* Listing card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-800">Branch List</h3>
            <p className="text-sm text-gray-500 mt-0.5">All branches in the system.</p>
          </div>
          <div className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
            {rows.length} branches
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[780px]">
              <thead className="text-left text-gray-500 bg-gray-50">
                <tr>
                  <th className="py-3 px-4 font-medium">Branch</th>
                  <th className="py-3 px-4 font-medium">City</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {pagedRows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{r.address || ""}</div>
                    </td>
                    <td className="py-3 px-4">{r.city}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          r.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 justify-end">
                        <button
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                          onClick={() => handleEdit(r)}
                        >
                          Update
                        </button>
                        <button
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium"
                          onClick={() => handleDelete(r.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pagedRows.length === 0 && (
                  <tr>
                    <td className="py-10 px-4 text-center text-gray-500" colSpan={4}>
                      No branches found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between p-4 border-t border-gray-100">
          <button
            className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors bg-white text-gray-700 border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <button
            className="px-4 py-2 rounded-xl text-sm font-semibold border transition-colors bg-white text-gray-700 border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Branches;
