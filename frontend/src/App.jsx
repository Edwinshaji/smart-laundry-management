import AppRoutes from "./routes/AppRoutes";
import { ToastContainer } from "react-toastify";
import { AuthProvider } from "./context/AuthContext";
import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <ToastContainer position="top-center" autoClose={2000} />
    </AuthProvider>
  );
}

export default App;