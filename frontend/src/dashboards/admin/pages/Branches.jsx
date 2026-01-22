import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Branches</h3>
          <button className="px-3 py-2 text-sm rounded-lg bg-purple-600 text-white" onClick={handleCreateOrUpdate}>
            {editingId ? "Update Branch" : "Add Branch"}
          </button>
        </div>

        <div className="grid gap-3 mb-4">
          <select className="border rounded px-3 py-2 w-full" value={form.city_id} onChange={e => setForm({ ...form, city_id: e.target.value })}>
            <option value="">Select City</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}, {c.state}</option>
            ))}
          </select>
          <input className="border rounded px-3 py-2 w-full" placeholder="Branch Name" value={form.branch_name} onChange={e => setForm({ ...form, branch_name: e.target.value })} />
          <input className="border rounded px-3 py-2 w-full" placeholder="Address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
        </div>

        <div className="border rounded-lg p-3">
          <div className="flex flex-col md:flex-row gap-2 mb-3">
            <input
              className="border rounded px-3 py-2 flex-1"
              placeholder="Search location (e.g., Chennai Central)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="px-3 py-2 rounded bg-gray-900 text-white" onClick={handleSearch}>Search</button>
          </div>
          {searchResults.length > 0 && (
            <div className="border rounded mb-3">
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

      {/* Listing card */}
      <div className="bg-white rounded-xl shadow p-5">
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px] border">
              <thead className="text-left text-gray-500 bg-gray-50">
                <tr>
                  <th className="py-2 px-3 border-b">Branch</th>
                  <th className="py-2 px-3 border-b">City</th>
                  <th className="py-2 px-3 border-b">Status</th>
                  <th className="py-2 px-3 border-b">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 divide-y">
                {pagedRows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 px-3">{r.name}</td>
                    <td className="py-2 px-3">{r.city}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-1 rounded text-xs ${r.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 flex gap-2">
                      <button
                        className="px-2 py-1 rounded bg-blue-600 text-white text-xs"
                        onClick={() => handleEdit(r)}
                      >
                        Update
                      </button>
                      <button
                        className="px-2 py-1 rounded bg-red-600 text-white text-xs"
                        onClick={() => handleDelete(r.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between mt-4">
          <button
            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Prev
          </button>
          <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
          <button
            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
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
