import { useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useStore } from "../context/StoreContext";


export default function AppLayout() {
    const [isOpen, setIsOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { stores, activeStore, setActiveStore } = useStore();    

    return (
        <div className="flex min-h-screen bg-gray-100">


            {/* Sidebar */}
            <aside
                className={`
          fixed md:static
          top-0 left-0
          h-screen
          w-64
          bg-black text-white
          transform
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
          transition-transform duration-300
          z-50
          flex flex-col
        `}>
                <h2 className="text-xl font-bold text-yellow-600 mb-6">
                    weTrack Gold
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    {user?.email} ({user?.role})
                </p>
                <nav className="space-y-3">
                    <Link to="/" className="block hover:bg-gray-800 p-2 rounded">Dashboard</Link>
                    <Link to="/transactions" className="block hover:bg-gray-800 p-2 rounded">Transactions</Link>
                    <Link to="/reports" className="block hover:bg-gray-800 p-2 rounded">Reports</Link>
                    <Link to="/confirmations" className="block hover:bg-gray-800 p-2 rounded">Confirmations</Link>
                    {user?.role === "Admin" && (<>

                        <Link to="/categories" className="block hover:bg-gray-800 p-2 rounded">
                            Categories
                        </Link>
                        <Link to="/payment-methods" className="block hover:bg-gray-800 p-2 rounded">
                            Payment Methods
                        </Link>
                        <Link to="/users" className="block hover:bg-gray-800 p-2 rounded">
                            Users
                        </Link>
                        <Link to="/stores" className="block hover:bg-gray-800 p-2 rounded">Stores</Link>
                        <Link to="/audit" className="block hover:bg-gray-800 p-2 rounded">Audit Log</Link>
                        <Link to="/reconciliation" className="block hover:bg-gray-800 p-2 rounded">Reconciliation</Link>
                    </>
                    )}
                    <button
                        onClick={() => {
                            logout();
                            navigate("/login");
                        }}
                        className="mt-10 text-red-500 text-sm"
                    >
                        Logout
                    </button>
                </nav>
            </aside>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Main Section */}
            <div className="flex-1 flex flex-col">
                {/* TOP BAR */}
                <header className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">

                    {/* Left side */}
                    <div className="flex items-center gap-4">

                        {/* Mobile menu button */}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="md:hidden text-xl"
                        >
                            ☰
                        </button>

                        <h1 className="text-lg font-semibold">
                            {activeStore} Store
                        </h1>

                        {/* Store selector */}
                        <select
                            value={activeStore}
                            onChange={(e) =>
                                setActiveStore(e.target.value)
                            }
                            className="border rounded-lg px-2 py-1 text-sm"
                        >
                            <option key={"All"}>All</option>
                            {stores.map((store) => (
                                <option key={store}>{store}</option>
                            ))}
                        </select>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-4">

                        <div className="text-right">
                            <p className="text-sm font-medium">
                                {user?.email}
                            </p>
                            <p className="text-xs text-gray-500">
                                {user?.role}
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                logout();
                                navigate("/login");
                            }}
                            className="text-red-500 text-sm"
                        >
                            Logout
                        </button>

                    </div>
                </header>
                {/* Main */}
                <main className="flex-1 p-6 md:p-10 mt-16 md:mt-0">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}