import { useState } from "react";
import Card, { CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

export default function Categories() {
  const [categories, setCategories] = useState([
    { id: 1, name: "Groceries", budget: 5000, active: true },
    { id: 2, name: "Fuel", budget: 2500, active: true },
    { id: 3, name: "Utilities", budget: 4000, active: true },
  ]);

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");

  const openNew = () => {
    setEditing(null);
    setName("");
    setBudget("");
    setIsOpen(true);
  };

  const openEdit = (category) => {
    setEditing(category);
    setName(category.name);
    setBudget(category.budget);
    setIsOpen(true);
  };

  const saveCategory = () => {
    if (!name.trim()) return;

    if (editing) {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === editing.id
            ? { ...cat, name, budget: Number(budget) }
            : cat
        )
      );
    } else {
      const newCategory = {
        id: Date.now(),
        name,
        budget: Number(budget),
        active: true,
      };
      setCategories([...categories, newCategory]);
    }

    setIsOpen(false);
  };

  const archiveCategory = (id) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === id ? { ...cat, active: false } : cat
      )
    );
  };

  const activeCategories = categories.filter((c) => c.active);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Categories</h1>
          <Button onClick={openNew}>+ Add Category</Button>
        </div>

        <Card>
          <CardContent>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b text-sm text-gray-500">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Monthly Budget</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeCategories.map((cat) => (
                  <tr key={cat.id} className="border-b">
                    <td className="py-3 font-medium">{cat.name}</td>
                    <td className="py-3">
                      ${cat.budget.toFixed(2)}
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <Button onClick={() => openEdit(cat)}>
                        Edit
                      </Button>
                      <Button onClick={() => archiveCategory(cat.id)}>
                        Archive
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Modal */}
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <h2 className="text-xl font-semibold mb-4">
            {editing ? "Edit Category" : "New Category"}
          </h2>

          <div className="space-y-4">
            <Input
              placeholder="Category Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              type="number"
              placeholder="Monthly Budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />

            <Button className="w-full" onClick={saveCategory}>
              Save
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}