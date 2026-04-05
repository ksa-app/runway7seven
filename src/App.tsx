import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

type Candidate = {
  id: string;
  sl: number;
  name: string;
  passport_no: string;
  received_date: string;
  agent_id: string;
  agents?: { name: string };
};

type Agent = {
  id: string;
  name: string;
};

export default function App() {
  const [data, setData] = useState<Candidate[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 5;

  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);

  const [form, setForm] = useState({
    name: "",
    passport_no: "",
    received_date: "",
    agent_id: "",
  });

  // 📡 Load Data
  const fetchData = async () => {
    setLoading(true);

    let query = supabase
      .from("candidates")
      .select(
        `
        id, sl, name, passport_no, received_date, agent_id,
        agents ( name )
      `
      )
      .order("sl", { ascending: true });

    if (selectedAgent) {
      query = query.eq("agent_id", selectedAgent);
    }

    const { data, error } = await query;

    if (!error) setData(data || []);
    setLoading(false);
  };

  const fetchAgents = async () => {
    const { data } = await supabase.from("agents").select("id, name");
    setAgents(data || []);
  };

  useEffect(() => {
    fetchData();
    fetchAgents();
  }, [selectedAgent]);

  // 🔍 Filter
  const filteredData = data.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.passport_no.toLowerCase().includes(search.toLowerCase())
  );

  // 📄 Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // ➕ Add / ✏️ Update
  const handleSubmit = async () => {
    if (!form.name || !form.passport_no) {
      alert("Name & Passport required");
      return;
    }

    if (editData) {
      await supabase
        .from("candidates")
        .update(form)
        .eq("id", editData.id);
    } else {
      await supabase.from("candidates").insert([form]);
    }

    setModalOpen(false);
    setEditData(null);
    setForm({ name: "", passport_no: "", received_date: "", agent_id: "" });

    fetchData();
  };

  // ❌ Delete
  const handleDelete = async () => {
    if (!editData) return;
    if (!confirm("Are you sure?")) return;

    await supabase.from("candidates").delete().eq("id", editData.id);

    setModalOpen(false);
    fetchData();
  };

  // ✏️ Edit Open
  const openEdit = (item: Candidate) => {
    setEditData(item);
    setForm({
      name: item.name,
      passport_no: item.passport_no,
      received_date: item.received_date,
      agent_id: item.agent_id,
    });
    setModalOpen(true);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Candidate Dashboard</h1>

      {/* 🔍 Filters */}
      <div className="flex gap-2 mb-4">
        <input
          placeholder="Search..."
          className="border p-2 rounded"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border p-2 rounded"
          value={selectedAgent}
          onChange={(e) => setSelectedAgent(e.target.value)}
        >
          <option value="">All Agents</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <button
          className="bg-green-500 text-white px-3 rounded"
          onClick={() => {
            setEditData(null);
            setForm({
              name: "",
              passport_no: "",
              received_date: "",
              agent_id: "",
            });
            setModalOpen(true);
          }}
        >
          + Add test
        </button>
      </div>

      {/* 📊 Table */}
      <div className="border rounded overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">SL</th>
              <th className="p-2">Name</th>
              <th className="p-2">Passport</th>
              <th className="p-2">Date</th>
              <th className="p-2">Agent</th>
              <th className="p-2">Action</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.sl}</td>
                <td className="p-2">{item.name}</td>
                <td
                  className="p-2 text-blue-600 cursor-pointer"
                  onClick={() => {
                    navigator.clipboard.writeText(item.passport_no);
                    alert("Copied!");
                  }}
                >
                  {item.passport_no}
                </td>
                <td className="p-2">{item.received_date}</td>
                <td className="p-2">{item.agents?.name || "N/A"}</td>
                <td className="p-2">
                  <button
                    className="text-blue-500"
                    onClick={() => openEdit(item)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}

            {!loading && paginatedData.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-4">
                  No Data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 📄 Pagination */}
      <div className="flex justify-end mt-3 gap-2">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Prev
        </button>
        <span>
          {page} / {totalPages || 1}
        </span>
        <button
          disabled={page === totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next
        </button>
      </div>

      {/* 🪟 Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white p-4 rounded w-80">
            <h2 className="font-bold mb-3">
              {editData ? "Edit" : "Add"} Candidate
            </h2>

            <input
              placeholder="Name"
              className="border p-2 w-full mb-2"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />

            <input
              placeholder="Passport"
              className="border p-2 w-full mb-2"
              value={form.passport_no}
              onChange={(e) =>
                setForm({ ...form, passport_no: e.target.value })
              }
            />

            <input
              type="date"
              className="border p-2 w-full mb-2"
              value={form.received_date}
              onChange={(e) =>
                setForm({ ...form, received_date: e.target.value })
              }
            />

            <select
              className="border p-2 w-full mb-2"
              value={form.agent_id}
              onChange={(e) =>
                setForm({ ...form, agent_id: e.target.value })
              }
            >
              <option value="">Select Agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>

            <div className="flex justify-between mt-3">
              <button
                className="bg-blue-500 text-white px-3 py-1 rounded"
                onClick={handleSubmit}
              >
                Save
              </button>

              {editData && (
                <button
                  className="bg-red-500 text-white px-3 py-1 rounded"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              )}
            </div>

            <button
              className="mt-2 text-sm"
              onClick={() => setModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}