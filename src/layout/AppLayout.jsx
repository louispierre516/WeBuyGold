import { useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { useStore } from "../context/StoreContext";

export default function AppLayout() {
  const [isOpen, setIsOpen] = useState(false);

  const { user, logout, role } = useAuth();
  const navigate = useNavigate();

  const {
    stores = [],
    activeStore,
    setActiveStore,
  } = useStore();

  /*
   * Find the currently selected store safely.
   *
   * activeStore may be:
   *
   * - "All"
   * - a store UUID
   * - temporarily undefined/null while loading
   */
  const selectedStore = stores.find(
    (store) => store.id === activeStore
  );

  /*
   * Display name for the top navigation.
   */
  const activeStoreName =
    activeStore === "All"
      ? "All Stores"
      : selectedStore?.name || "Select Store";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  /*
   * Handle store changes safely.
   */
  const handleStoreChange = (e) => {
    const value = e.target.value;

    setActiveStore(value);
  };

  return (
    <div className="min-h-screen bg-gray-100">

      {/* SIDEBAR */}
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

            {role === "admin" && (
              <>
                <Link
                  to="/karat-rates"
                  className="block hover:bg-gray-800 p-2 rounded"
                  onClick={() => setIsOpen(false)}
                >
                  Karats Rates
                </Link>

                <Link
                  to="/reconciliation"
                  className="block hover:bg-gray-800 p-2 rounded"
                  onClick={() => setIsOpen(false)}
                >
                  Reconciliation
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

      {/* MOBILE OVERLAY */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* MAIN AREA */}
      <div className="min-h-screen md:ml-64 flex flex-col">

        {/* TOP BAR */}
        <header className="sticky top-0 z-30 bg-white shadow-sm px-4 md:px-6 py-4">

          <div className="flex justify-between items-center gap-4">

            {/* LEFT SIDE */}
            <div className="flex items-center gap-3 min-w-0">

              {/* Mobile menu */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden text-xl shrink-0"
                aria-label="Open menu"
              >
                ☰
              </button>

              {/* Store name */}
              <h1 className="text-lg font-semibold truncate">
                {activeStoreName}
              </h1>

              {/* Store selector */}
              <select
                value={activeStore || "All"}
                onChange={handleStoreChange}
                className="border rounded-lg px-2 py-1 text-sm bg-white"
              >
                <option value="All">
                  All
                </option>

                {stores.map((store) => (
                  <option
                    key={store.id}
                    value={store.id}
                  >
                    {store.name}
                  </option>
                ))}
              </select>

            </div>

            {/* RIGHT SIDE */}
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

        {/* PAGE CONTENT */}
        <main className="flex-1 p-4 md:p-6 lg:p-10">
          <Outlet />
        </main>

      </div>

    </div>
  );
}
