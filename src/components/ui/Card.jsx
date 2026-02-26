import React from "react";

export default function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-white p-6 rounded-2xl shadow-sm border border-gray-100 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}