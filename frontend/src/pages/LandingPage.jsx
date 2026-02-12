import { Link } from "react-router-dom";
import WashMateLogo from "../assets/WashMate_logo.png";
import Illustration from "../assets/login-illustration.png";

const LandingPage = () => {
	return (
		<div className="min-h-screen bg-gray-50">
			<header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur">
				<div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 md:px-6">
					<Link to="/" className="flex items-center gap-3">
						<img src={WashMateLogo} alt="WashMate" className="h-9 w-auto object-contain" />
						<span className="text-sm font-semibold text-gray-900">WashMate</span>
					</Link>
					<nav className="flex items-center gap-1 sm:gap-2">
						<Link
							to="/login"
							className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
						>
							Login
						</Link>
						<Link
							to="/register"
							className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-gray-900"
						>
							Register
						</Link>
						<Link
							to="/staff/login"
							className="ml-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:from-purple-700 hover:to-indigo-700"
						>
							Staff Login
						</Link>
					</nav>
				</div>
			</header>

			<main className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-14">
				<div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
					<div>
						<div className="inline-flex items-center rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
							SMART LAUNDRY MANAGEMENT
						</div>
						<h1 className="mt-5 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
							WashMate
						</h1>
						<p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600 md:text-lg">
							Manage subscriptions, automate daily orders, track deliveries, and handle payments in one clean system.
						</p>
						<div className="mt-7">
							<Link
								to="/register"
								className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:from-purple-700 hover:to-indigo-700"
							>
								Get Started
							</Link>
							<div className="mt-3 text-sm text-gray-600">
								Already have an account?{" "}
								<Link to="/login" className="font-semibold text-purple-700 hover:text-purple-800">
									Login
								</Link>
							</div>
						</div>
					</div>

					<div className="relative">
						<div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-br from-purple-600/15 to-indigo-600/15 blur-2xl" />
						<div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
							<img src={Illustration} alt="WashMate" className="w-full rounded-2xl" />
						</div>
					</div>
				</div>
			</main>
		</div>
	);
};

export default LandingPage;
