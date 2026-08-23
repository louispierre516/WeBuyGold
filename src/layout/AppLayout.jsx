import { useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useStore } from "../context/StoreContext";

export default function AppLayout() {
  const [isOpen, setIsOpen] = useState(false);

  const { user, logout, role } = useAuth();
  const navigate = useNavigate();

  const { stores, activeStore, setActiveStore } = useStore();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50
          h-screen w-64
          bg-black text-white
          flex flex-col
          overflow-y-auto
          transition-transform duration-300

          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
      >
        <div className="p-6">
          <h2 className="text-xl font-bold text-yellow-600 mb-6">
            weTrack Gold
          </h2>

          <p className="text-sm text-gray-500 mb-6 break-words">
            {user?.email} ({role})
          </p>

          <nav className="space-y-3">
            <Link
              to="/"
              className="block hover:bg-gray-800 p-2 rounded"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>

            <Link
              to="/transactions"
              className="block hover:bg-gray-800 p-2 rounded"
              onClick={() => setIsOpen(false)}
            >
              Transactions
            </Link>
            <Link
                to="/float"
                className="block hover:bg-gray-800 p-2 rounded"
                onClick={() => setIsOpen(false)}
                >
                Float Management
            </Link>

            <Link
              to="/reports"
              className="block hover:bg-gray-800 p-2 rounded"
              onClick={() => setIsOpen(false)}
            >
              Reports
            </Link>

            <Link
              to="/confirmations"
              className="block hover:bg-gray-800 p-2 rounded"
              onClick={() => setIsOpen(false)}
            >
              Confirmations
            </Link>

            {role === "admin" && (
              <>
                <Link
                  to="/categories"
                  className="block hover:bg-gray-800 p-2 rounded"
                  onClick={() => setIsOpen(false)}
                >
                  Categories
                </Link>

                <Link
                  to="/karat-rates"
                  className="block hover:bg-gray-800 p-2 rounded"
                  onClick={() => setIsOpen(false)}
                >
                  Karats Rates
                </Link>

                <Link
                  to="/users"
                  className="block hover:bg-gray-800 p-2 rounded"
                  onClick={() => setIsOpen(false)}
                >
                  Users
                </Link>

                <Link
                  to="/stores"
                  className="block hover:bg-gray-800 p-2 rounded"
                  onClick={() => setIsOpen(false)}
                >
                  Stores
                </Link>

                <Link
                  to="/audit"
                  className="block hover:bg-gray-800 p-2 rounded"
                  onClick={() => setIsOpen(false)}
                >
                  Audit Log
                </Link>

                <Link
                  to="/reconciliation"
                  className="block hover:bg-gray-800 p-2 rounded"
                  onClick={() => setIsOpen(false)}
                >
                  Reconciliation
                </Link>
              </>
            )}

            <button
              onClick={handleLogout}
              className="mt-10 text-red-500 text-sm"
            >
              Logout
            </button>
          </nav>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main area */}
      <div className="min-h-screen md:ml-64 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white shadow-sm px-4 md:px-6 py-4">
          <div className="flex justify-between items-center gap-4">
            {/* Left */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden text-xl shrink-0"
                aria-label="Open menu"
              >
                ☰
              </button>

              <h1 className="text-lg font-semibold truncate">
                {activeStore} Store
              </h1>

              <select
                value={activeStore}
                onChange={(e) => setActiveStore(e.target.value)}
                className="border rounded-lg px-2 py-1 text-sm"
              >
                <option value="All">All</option>

                {stores.map((store) => (
                  <option key={store.id} value={store.name}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Right */}
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">
                  {user?.email}
                </p>

                <p className="text-xs text-gray-500">
                  {role}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="text-red-500 text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}