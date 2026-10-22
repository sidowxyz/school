import { useEffect, useState } from "react";
import { Plus, PencilSimple, Trash, Check, X } from '@phosphor-icons/react';

import { examTypesApi } from "../api/examTypesApi";
import type { ExamType } from "../types";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ExamTypesPanel() {
  const [examTypes, setExamTypes] = useState<ExamType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const load = () => {
    setLoading(true);
    examTypesApi
      .getAll()
      .then(setExamTypes)
      .catch(() => setError("Failed to load exam types."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const exam_type_no = newCode.trim() || `ET-${Date.now()}`;
      await examTypesApi.create({ exam_type_no, type_name: newName.trim() });
      setNewCode("");
      setNewName("");
      load();
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create exam type.";
      setError(message);
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (type: ExamType) => {
    setEditingId(type._id);
    setEditName(type.type_name);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await examTypesApi.update(id, { type_name: editName.trim() });
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this exam type? Exams already using it will keep the reference.")) return;
    await examTypesApi.delete(id);
    load();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Exam Types</h3>
        <p className="text-sm text-gray-500 mt-1">
          Manage the exam types admins can pick from when creating an exam (e.g. Month 1, Mid Exam, Final Exam).
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Code (optional)</label>
          <Input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="e.g. MONTH1"
            className="border rounded-lg px-3 py-2 text-sm w-40"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Type Name</label>
          <Input
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Month 1"
            className="border rounded-lg px-3 py-2 text-sm w-full"
          />
        </div>
        <Button variant="plain"
          type="submit"
          disabled={adding}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          <Plus size={16} /> Add
        </Button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">Loading exam typesâ€¦</p>
      ) : examTypes.length === 0 ? (
        <p className="text-sm text-gray-500">No exam types yet â€” add one above.</p>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {examTypes.map((type) => (
            <div key={type._id} className="flex items-center justify-between px-4 py-3">
              {editingId === type._id ? (
                <Input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-sm flex-1 mr-3"
                />
              ) : (
                <div>
                  <span className="text-sm font-medium text-gray-900">{type.type_name}</span>
                  <span className="text-xs text-gray-400 ml-2">{type.exam_type_no}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                {editingId === type._id ? (
                  <>
                    <Button variant="plain" onClick={() => saveEdit(type._id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-green-600">
                      <Check size={16} />
                    </Button>
                    <Button variant="plain" onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                      <X size={16} />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="plain" onClick={() => startEdit(type)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                      <PencilSimple size={16} />
                    </Button>
                    <Button variant="plain" onClick={() => handleDelete(type._id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                      <Trash size={16} />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}