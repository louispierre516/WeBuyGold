export default function Input({ label, ...props }) {
  return (
    <div className="flex flex-col mb-4">
      {label && <label className="mb-1 font-medium">{label}</label>}
      <input 
        className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-yellow-300"
        {...props} 
      />
    </div>
  );
}