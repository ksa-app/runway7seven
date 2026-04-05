import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

type Agent = {
  id: string;
  name: string;
};

type Candidate = {
  id: string;
  sl: number;
  name: string;
  passport_no: string;
  received_date: string;
  agent_id: string;
  agents?: { name: string }[];
};

export default function App() {
  const [data, setData] = useState<Candidate[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");

  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<Candidate | null>(null);

  const [form, setForm] = useState({
    name: "",
    passport_no: "",
    received_date: "",
    agent_id: "",
  });

  // 📡 FETCH CANDIDATES
  const fetchData = async () => {
    setLoading(true);

    let query = supabase
      .from("candidates")
      .select(`
        id,
        sl,
        name,
        passport_no,
        received_date,
        agent_id,
        agents ( name )
      `)
      .order("sl", { ascending: true });

    if (selectedAgent) {
      query = query.eq("agent_id", selectedAgent);
    }

    const { data, error } = await query;

    if (error) {
      console.log("FETCH ERROR:", error);
      setData([]);
    } else {
      setData(data as Candidate[]);
    }

    setLoading(false);
  };

  // 📡 FETCH AGENTS
  const fetchAgents = async () => {
    const { data, error } = await supabase.from("agents").select("id, name");

    if (!error) setAgents(data || []);
  };

  useEffect(() => {
    fetchData();
    fetchAgents();
  }, [selectedAgent]);

  // 🔍 SEARCH FILTER
  const filteredData = data.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.passport_no.toLowerCase().includes(search.toLowerCase())
  );

  // 📄 PAGINATION
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // 💾 SAVE (INSERT / UPDATE)
  const handleSubmit = async () => {
    if (!form.name || !form.passport_no) {
      alert("Name & Passport required");
      return;
    }

    if (editData) {
      const { error } = await supabase
        .from("candidates")
        .update(form)
        .eq("id", editData.id);

      if (error) console.log(error);
    } else {
      const { error } = await supabase.from("candidates").insert([form]);

      if (error) console.log(error);
    }

    setModalOpen(false);
    setEditData(null);
    setForm({
      name: "",
      passport_no: "",
      received_date: "",
      agent_id: "",
    });

    fetchData();
  };

  // ❌ DELETE
  const handleDelete = async () => {
    if (!editData) return;

    if (!confirm("Are you sure?")) return;

    const { error } = await supabase
      .from("candidates")
      .delete()
      .eq("id", editData.id);

    if (error) console.log(error);

    setModalOpen(false);
    fetchData();
  };

  // ✏️ OPEN EDIT
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600&display=swap');
        
        * {
          font-family: 'Inter', -apple-system, sans-serif;
        }
        
        h1, h2, h3 {
          font-family: 'Outfit', sans-serif;
        }

        .table-row {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .table-row:hover {
          background: linear-gradient(to right, rgba(59, 130, 246, 0.04), rgba(59, 130, 246, 0.02));
          transform: translateX(2px);
        }

        .btn {
          transition: all 0.2s ease;
        }

        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .btn:active {
          transform: translateY(0);
        }

        .input-field {
          transition: all 0.2s ease;
        }

        .input-field:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .modal-backdrop {
          animation: fadeIn 0.2s ease;
        }

        .modal-content {
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }

        .stat-badge {
          backdrop-filter: blur(10px);
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2 tracking-tight">
            Candidate Registry
          </h1>
          <p className="text-slate-500 font-light">
            Manage and track candidate applications
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="stat-badge bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500 mb-1">Total Candidates</div>
            <div className="text-3xl font-bold text-slate-800">{data.length}</div>
          </div>
          <div className="stat-badge bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500 mb-1">Filtered Results</div>
            <div className="text-3xl font-bold text-blue-600">{filteredData.length}</div>
          </div>
          <div className="stat-badge bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-5 shadow-sm">
            <div className="text-sm font-medium text-slate-500 mb-1">Active Agents</div>
            <div className="text-3xl font-bold text-slate-800">{agents.length}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                className="input-field w-full px-4 py-3 border border-slate-200 rounded-xl bg-white/50 text-slate-700 placeholder-slate-400"
                placeholder="Search by name or passport..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="input-field px-4 py-3 border border-slate-200 rounded-xl bg-white/50 text-slate-700 min-w-[200px]"
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
              className="btn px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-sm"
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
              + New Candidate
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/60 bg-slate-50/50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    SL
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Passport
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Received
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((item) => (
                  <tr key={item.id} className="table-row">
                    <td className="px-6 py-4 text-sm text-slate-500 font-mono">
                      {item.sl}
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{item.name}</div>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        className="font-mono text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                        onClick={() => {
                          navigator.clipboard.writeText(item.passport_no);
                          alert("Passport copied!");
                        }}
                      >
                        {item.passport_no}
                      </button>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-600">
                      {item.received_date || "—"}
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {item.agents?.[0]?.name || "N/A"}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                        onClick={() => openEdit(item)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-slate-400 font-light">
                        No candidates found
                      </div>
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="text-slate-400 font-light">
                        Loading...
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-slate-200/60 px-6 py-4 bg-slate-50/30">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-500">
                  Showing {(page - 1) * pageSize + 1} to{" "}
                  {Math.min(page * pageSize, filteredData.length)} of{" "}
                  {filteredData.length} results
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>

                  <div className="flex items-center px-4 py-2 text-sm font-medium text-slate-700">
                    {page} / {totalPages}
                  </div>

                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-backdrop fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="modal-content bg-white rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-2xl font-semibold text-slate-800">
                {editData ? "Edit Candidate" : "New Candidate"}
              </h2>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Name
                </label>
                <input
                  className="input-field w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700"
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Passport Number
                </label>
                <input
                  className="input-field w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700 font-mono"
                  placeholder="A12345678"
                  value={form.passport_no}
                  onChange={(e) =>
                    setForm({ ...form, passport_no: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Received Date
                </label>
                <input
                  type="date"
                  className="input-field w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700"
                  value={form.received_date}
                  onChange={(e) =>
                    setForm({ ...form, received_date: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Agent
                </label>
                <select
                  className="input-field w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50/50 text-slate-700"
                  value={form.agent_id}
                  onChange={(e) =>
                    setForm({ ...form, agent_id: e.target.value })
                  }
                >
                  <option value="">Select an agent</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-5 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                className="btn px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>

              <div className="flex gap-3">
                {editData && (
                  <button
                    className="btn px-5 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600"
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                )}

                <button
                  className="btn px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-sm"
                  onClick={handleSubmit}
                >
                  {editData ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
