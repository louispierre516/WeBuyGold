export default function Button({ children, className, ...props }) {
  return (
    <button
      className={`bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}