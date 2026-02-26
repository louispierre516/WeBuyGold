import { useState } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

export default function PaymentMethods() {
  const [methods, setMethods] = useState([
    { id: 1, name: "Cash", type: "Cash", active: true },
    { id: 2, name: "Republic Bank", type: "Bank", active: true },
    { id: 3, name: "Credit Card - Visa", type: "Card", active: true },
  ]);

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");

  const addMethod = () => {
    if (!name.trim()) return;

    setMethods([
      ...methods,
      { id: Date.now(), name, type, active: true },
    ]);

    setIsOpen(false);
    setName("");
    setType("");
  };

  const archive = (id) => {
    setMethods((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, active: false } : m
      )
    );
  };

  const activeMethods = methods.filter((m) => m.active);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">
            Payment Methods
          </h1>
          <Button onClick={() => setIsOpen(true)}>
            + Add Method
          </Button>
        </div>

        <Card>
          <CardContent>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-sm text-gray-500">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeMethods.map((m) => (
                  <tr key={m.id} className="border-b">
                    <td className="py-3">{m.name}</td>
                    <td className="py-3">{m.type}</td>
                    <td className="py-3 text-right">
                      <Button onClick={() => archive(m.id)}>
                        Archive
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <h2 className="text-xl font-semibold mb-4">
            New Payment Method
          </h2>

          <div className="space-y-4">
            <Input
              placeholder="Method Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              placeholder="Type (Cash, Bank, Card)"
              value={type}
              onChange={(e) => setType(e.target.value)}
            />

            <Button className="w-full" onClick={addMethod}>
              Save
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}