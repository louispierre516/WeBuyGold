import React from "react";
import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white shadow-md p-6 flex flex-col">
      <h2 className="text-2xl font-bold mb-6 text-yellow-600">We Buy Gold</h2>
      <nav className="flex flex-col space-y-3">
        <Link to="/dashboard" className="hover:text-yellow-600">Dashboard</Link>
        <Link to="/transactions" className="hover:text-yellow-600">Transactions</Link>
        <Link to="/users" className="hover:text-yellow-600">Users</Link>
        <Link to="/stores" className="hover:text-yellow-600">Stores</Link>
        <Link to="/login" className="mt-auto text-red-500 hover:text-red-700">Logout</Link>
      </nav>
    </aside>
  );
}