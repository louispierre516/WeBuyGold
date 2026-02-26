import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();

  const handleLogin = (e) => {
    // Temporary — allow any login
    e.preventDefault();
    console.log("Login:", username, password);
    login(username);
    navigate("/");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form 
        className="bg-white p-8 rounded shadow-md w-full max-w-sm"
        onSubmit={handleLogin}
      >
        <h2 className="text-2xl font-bold mb-6 text-yellow-600 text-center">We Buy Gold</h2>
        <Input 
          label="Username" 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
        />
        <Input 
          label="Password" 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
        />
        <Button className="w-full mt-4" type="submit">Login</Button>
        <p className="text-xs mt-4 text-gray-500">
          Use admin@test.com for Admin access
        </p>
      </form>
    </div>
  );
}