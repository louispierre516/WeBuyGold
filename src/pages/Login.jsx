import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const { login } = useAuth();

  const handleLogin = async(e) => {
    e.preventDefault();
    
    const { data, error } = await login(username, password);

    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        setErrorMessage("Please confirm your email before logging in.");
      } else {
        setErrorMessage("Invalid email or password.");
      }
      
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setLoading(false);
      return;
    }

    navigate("/");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form 
        className={`bg-white p-8 rounded shadow-md w-full max-w-sm ${
          shake ? "shake" : ""
        }`}
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
        {errorMessage && (
          <p className="text-red-500 text-sm mt-2">
            {errorMessage}
          </p>
        )}
        <Button className="w-full mt-4" type="submit" disabled={loading}>{loading ? "Logging in..." : "Login"}</Button>
        <p className="text-xs mt-4 text-gray-500">
          Use admin@test.com for Admin access
        </p>
      </form>
    </div>
  );
}