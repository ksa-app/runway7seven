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
  agents?: { name: string };  // 🔥 FIXED: Single object
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
        *,
        agents!inner ( name )
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
      console.log("Fetched data:", data);
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

    try {
      if (editData) {
        const { error } = await supabase
          .from("candidates")
          .update({
            name: form.name,
            passport_no: form.passport_no,
            received_date: form.received_date || null,
            agent_id: form.agent_id || null,
          })
          .eq("id", editData.id);

        if (error) {
          console.error("Update error:", error);
          alert(`Update failed: ${error.message}`);
          return;
        }
      } else {
        const { error } = await supabase.from("candidates").insert([
          {
            name: form.name,
            passport_no: form.passport_no,
            received_date: form.received_date || null,
            agent_id: form.agent_id || null,
          },
        ]);

        if (error) {
          console.error("Insert error:", error);
          alert(`Insert failed: ${error.message}`);
          return;
        }
      }

      setModalOpen(false);
      setEditData(null);
      setForm({
        name: "",
        passport_no: "",
        received_date: "",
        agent_id: "",
      });

      await fetchData();
      alert(editData ? "Updated!" : "Added!");
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred");
    }
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        * {
          font-family: 'DM Sans', -apple-system, sans-serif;
        }
        
        .mono {
          font-family: 'JetBrains Mono', monospace;
        }

        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(99, 102, 241, 0.15);
        }

        .btn-primary {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          transition: all 0.3s ease;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
        }

        .input-modern {
          transition: all 0.2s ease;
        }

        .input-modern:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
          transform: translateY(-1px);
        }

        .modal-backdrop {
          animation: fadeIn 0.2s ease;
          backdrop-filter: blur(8px);
        }

        .modal-content {
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .table-row {
          transition: all 0.2s ease;
        }

        .table-row:hover {
          background: linear-gradient(to right, rgba(99, 102, 241, 0.04), transparent);
        }

        .badge {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-12 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                Candidate Registry
              </h1>
              <p className="text-gray-500 mt-1">
                Manage your candidate pipeline efficiently
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat-card rounded-2xl p-6 shadow-lg card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Candidates</p>
                <p className="text-4xl font-bold text-gray-900">{data.length}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="stat-card rounded-2xl p-6 shadow-lg card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Filtered</p>
                <p className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {filteredData.length}
                </p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="stat-card rounded-2xl p-6 shadow-lg card-hover">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Active Agents</p>
                <p className="text-4xl font-bold text-gray-900">{agents.length}</p>
              </div>
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-2xl p-6 shadow-xl mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="input-modern w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl bg-gray-50/50 text-gray-800 placeholder-gray-400 font-medium"
                placeholder="Search by name or passport..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <select
              className="input-modern px-5 py-3.5 border-2 border-gray-200 rounded-xl bg-gray-50/50 text-gray-700 font-medium min-w-[220px]"
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
              className="btn-primary px-8 py-3.5 text-white rounded-xl font-semibold shadow-lg flex items-center gap-2 whitespace-nowrap"
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Candidate
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    SL
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Candidate Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Passport No
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Received Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {paginatedData.map((item) => (
                  <tr key={item.id} className="table-row">
                    <td className="px-6 py-5">
                      <span className="mono text-sm font-semibold text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                        #{item.sl}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="font-semibold text-gray-900">{item.name}</div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <button
                        className="mono text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all"
                        onClick={() => {
                          navigator.clipboard.writeText(item.passport_no);
                          alert("Passport copied!");
                        }}
                      >
                        {item.passport_no}
                      </button>
                    </td>

                    <td className="px-6 py-5">
                      <span className="text-sm text-gray-600">
                        {item.received_date || "—"}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <span className="badge inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white shadow-md">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                        </svg>
                        {item.agents?.name || "N/A"}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <button
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-all"
                        onClick={() => openEdit(item)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && paginatedData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                        </div>
                        <p className="text-gray-500 font-medium">No candidates found</p>
                      </div>
                    </td>
                  </tr>
                )}

                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-gray-500 font-medium">Loading...</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-gray-100 px-6 py-5 bg-gradient-to-r from-gray-50/50 to-white">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 font-medium">
                  Showing <span className="font-bold text-gray-900">{(page - 1) * pageSize + 1}</span> to{" "}
                  <span className="font-bold text-gray-900">{Math.min(page * pageSize, filteredData.length)}</span> of{" "}
                  <span className="font-bold text-gray-900">{filteredData.length}</span> results
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    ← Previous
                  </button>

                  <div className="flex items-center px-5 py-2.5 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-xl border-2 border-indigo-200">
                    {page} / {totalPages}
                  </div>

                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-backdrop fixed inset-0 bg-gray-900/60 flex items-center justify-center p-4 z-50">
          <div className="modal-content bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-indigo-500 to-purple-600">
              <h2 className="text-2xl font-bold text-white">
                {editData ? "Edit Candidate" : "Add New Candidate"}
              </h2>
              <p className="text-indigo-100 text-sm mt-1">
                {editData ? "Update candidate information" : "Fill in the details below"}
              </p>
            </div>

            {/* Modal Body */}
            <div className="px-8 py-8 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  className="input-modern w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50/50 text-gray-800 font-medium"
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Passport Number *
                </label>
                <input
                  className="input-modern mono w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50/50 text-gray-800"
                  placeholder="A12345678"
                  value={form.passport_no}
                  onChange={(e) =>
                    setForm({ ...form, passport_no: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Received Date
                </label>
                <input
                  type="date"
                  className="input-modern w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50/50 text-gray-800"
                  value={form.received_date}
                  onChange={(e) =>
                    setForm({ ...form, received_date: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Assign Agent
                </label>
                <select
                  className="input-modern w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50/50 text-gray-800 font-medium"
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
            <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                className="px-6 py-3 text-gray-600 hover:bg-gray-200 rounded-xl font-semibold transition-all"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>

              <div className="flex gap-3">
                {editData && (
                  <button
                    className="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 shadow-lg transition-all"
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                )}

                <button
                  className="btn-primary px-8 py-3 text-white rounded-xl font-semibold shadow-lg"
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