import { useState } from "react";

export default function Users() {
  const [users, setUsers] = useState([
    { id: 1, name: "Admin User", email: "admin@test.com", role: "Admin" }
  ]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("User");

  const addUser = () => {
    const newUser = {
      id: Date.now(),
      name,
      email,
      role
    };

    setUsers([...users, newUser]);
    setName("");
    setEmail("");
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Users</h1>

      {/* Add User */}
      <div className="bg-white p-4 rounded-xl shadow mb-6">
        <h2 className="font-medium mb-4">Add User</h2>

        <div className="grid md:grid-cols-3 gap-4">
          <input
            className="border p-2 rounded"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="border p-2 rounded"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <select
            className="border p-2 rounded"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option>User</option>
            <option>Admin</option>
          </select>
        </div>

        <button
          onClick={addUser}
          className="mt-4 bg-yellow-600 text-white px-4 py-2 rounded"
        >
          Add User
        </button>
      </div>

      {/* User List */}
      <div className="bg-white p-4 rounded-xl shadow">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex justify-between border-b py-3"
          >
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <span className="text-sm">{user.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}