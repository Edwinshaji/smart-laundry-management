import React from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import { toast } from "react-toastify";
import App from "./App";
import "./index.css";

// IMPORTANT: Set axios defaults globally
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || "";
axios.defaults.withCredentials = true;

// Django CSRF support
axios.defaults.xsrfCookieName = "csrftoken";
axios.defaults.xsrfHeaderName = "X-CSRFToken";

const getCookie = (name) => {
	if (typeof document === "undefined") return null;
	const parts = document.cookie.split(";").map((c) => c.trim());
	for (const part of parts) {
		if (part.startsWith(`${name}=`)) {
			return decodeURIComponent(part.substring(name.length + 1));
		}
	}
	return null;
};

const MUTATION_METHODS = new Set(["post", "put", "patch", "delete"]);
const shouldToastForConfig = (config) => {
	const url = config?.url || "";
	const method = (config?.method || "").toLowerCase();
	if (!MUTATION_METHODS.has(method)) return false;

	// Only auto-toast customer-side mutations (covers all customer dashboard pages)
	if (!url.includes("/api/customer/")) return false;

	// Avoid double-toasts where pages already show explicit messages
	if (url.includes("/api/customer/profile/")) return false;
	if (url.includes("/api/customer/addresses/")) return false;

	return true;
};

axios.interceptors.request.use((config) => {
	if (typeof navigator !== "undefined" && navigator.onLine === false) {
		return Promise.reject(new Error("offline"));
	}

	// Ensure CSRF header is present for unsafe methods (SessionAuthentication)
	const method = (config?.method || "").toLowerCase();
	if (MUTATION_METHODS.has(method)) {
		const csrf = getCookie("csrftoken");
		if (csrf) {
			config.headers = config.headers || {};
			if (!config.headers["X-CSRFToken"]) config.headers["X-CSRFToken"] = csrf;
		}
	}
	return config;
});

axios.interceptors.response.use(
	(res) => {
		if (shouldToastForConfig(res.config)) {
			const method = (res.config.method || "").toLowerCase();
			if (method === "post") toast.success("Created successfully");
			else if (method === "delete") toast.success("Deleted successfully");
			else toast.success("Updated successfully");
		}
		return res;
	},
	(err) => {
		const cfg = err?.config || {};
		if (shouldToastForConfig(cfg)) {
			const msg =
				err?.message === "offline"
					? "You are offline"
					: err?.response?.data?.detail ||
					  err?.response?.data?.non_field_errors?.[0] ||
					  "Request failed";
			toast.error(msg);
		}
		return Promise.reject(err);
	}
);

ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
);

// Prime CSRF cookie for SPA POST/PUT/DELETE calls
axios.get("/api/accounts/csrf/").catch(() => {
	// ignore - some environments might block it; requests will fail with 403 until CSRF cookie exists
});
