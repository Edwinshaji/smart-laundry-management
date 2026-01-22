import WashMateLogo from "../../assets/WashMate_logo.png";
import illustration from "../../assets/login-illustration.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex h-screen bg-gray-50 flex-col md:flex-row overflow-hidden">
      <div className="w-full md:w-5/12 flex flex-col justify-center items-center h-screen px-8 md:px-16 lg:px-24 py-8 md:py-12 bg-white shadow-lg md:rounded-none rounded-2xl border md:border-none mx-auto md:mx-0">
        <div className="mb-4 flex flex-col items-center">
          <img
            src={WashMateLogo}
            alt="WashMate Logo"
            className="w-80 h-32 object-contain rounded"
          />
        </div>
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">
            Welcome to your Dashboard
          </h1>
          <p className="text-gray-500">
            Here you can view your laundry orders, subscriptions, and more.
          </p>
        </div>
        <div className="w-full max-w-sm space-y-4">
          <div className="bg-purple-100 rounded-lg p-4 shadow">
            <h2 className="font-semibold text-lg text-purple-700 mb-2">
              Quick Actions
            </h2>
            <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
              <li>View your orders</li>
              <li>Check subscription status</li>
              <li>Track pickups & deliveries</li>
              <li>See payment history</li>
            </ul>
          </div>
          <button
            onClick={handleLogout}
            className="w-full mt-6 bg-purple-700 text-white py-2 rounded-lg font-semibold hover:bg-purple-800 transition"
          >
            Logout
          </button>
          <div className="text-center text-gray-500 text-xs mt-6">
            &copy; {new Date().getFullYear()} WashMate. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
