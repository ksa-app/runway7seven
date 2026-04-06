import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "./supabaseClient";

type Candidate = {
  id: string;
  name: string;
  passport_no: string;
};

type Visa = {
  id: string;
  visa_issued: string;
  expiry_date?: string;
  visa_type: string;
  manpower: boolean;
  agent_name?: string;
  candidate_id: string;
  candidates?: {
    name: string;
    passport_no: string;
  };
};

export default function App() {
  const [tab, setTab] = useState<"dashboard" | "candidates" | "visas">("dashboard");

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [visas, setVisas] = useState<Visa[]>([]);

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Modals
  const [showVisaModal, setShowVisaModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [editingVisa, setEditingVisa] = useState<Visa | null>(null);

  // Forms
  const [visaForm, setVisaForm] = useState({
    name: "",
    passport_no: "",
    agent_name: "",
    visa_issued: "",
    visa_type: "Work",
    manpower: false,
  });

  const [candidateForm, setCandidateForm] = useState({
    name: "",
    passport_no: "",
  });

  /* ================= FETCH ================= */
  const fetchCandidates = async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("name", { ascending: true });
    if (error) console.error("Candidates fetch error:", error);
    setCandidates(data || []);
  };

  const fetchVisas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("visas")
      .select(`
        *,
        candidates!visas_candidate_id_fkey(name, passport_no)
      `)
      .order("visa_issued", { ascending: false });
    if (error) console.error("Visas fetch error:", error);
    setVisas(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCandidates();
    fetchVisas();
  }, []);

  /* ================= DASHBOARD STATS ================= */
  const totalCandidates = candidates.length;
  const totalVisas = visas.length;
  const manpowerVisas = visas.filter((v) => v.manpower).length;

  const expiringSoon = visas.filter((v) => {
    if (!v.expiry_date) return false;
    const expiry = new Date(v.expiry_date);
    const diffDays = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 3600 * 24));
    return diffDays > 0 && diffDays <= 30;
  }).length;

  const recentVisas = [...visas].slice(0, 5);

  /* ================= FILTERS ================= */
  const filteredVisas = visas.filter((v) =>
    `${v.candidates?.name || ""} ${v.candidates?.passport_no || ""} ${v.agent_name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredCandidates = candidates.filter((c) =>
    `${c.name} ${c.passport_no}`.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= CANDIDATE MODAL ================= */
  const openAddCandidateModal = () => {
    setCandidateForm({ name: "", passport_no: "" });
    setShowCandidateModal(true);
  };

  const saveCandidate = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("candidates").insert({
      name: candidateForm.name.trim(),
      passport_no: candidateForm.passport_no.toUpperCase().trim(),
    });

    if (error) {
      alert("Error adding candidate: " + error.message);
    } else {
      alert("✅ Candidate added successfully!");
      setShowCandidateModal(false);
      fetchCandidates();
    }
  };

  /* ================= VISA MODALS ================= */
  const openAddVisaModal = () => {
    setEditingVisa(null);
    setVisaForm({
      name: "",
      passport_no: "",
      agent_name: "",
      visa_issued: new Date().toISOString().split("T")[0],
      visa_type: "Work",
      manpower: false,
    });
    setShowVisaModal(true);
  };

  const openEditVisaModal = (visa: Visa) => {
    setEditingVisa(visa);
    setVisaForm({
      name: visa.candidates?.name || "",
      passport_no: visa.candidates?.passport_no || "",
      agent_name: visa.agent_name || "",
      visa_issued: visa.visa_issued,
      visa_type: visa.visa_type,
      manpower: visa.manpower,
    });
    setShowVisaModal(true);
  };

  const saveVisa = async (e: FormEvent) => {
    e.preventDefault();

    try {
      let passport = visaForm.passport_no.toUpperCase().trim();
      let { data: existing } = await supabase
        .from("candidates")
        .select("id")
        .eq("passport_no", passport)
        .single();

      let candidateId = existing?.id;

      if (!candidateId) {
        const { data: newCand, error: candError } = await supabase
          .from("candidates")
          .insert({
            name: visaForm.name.trim(),
            passport_no: passport,
          })
          .select("id")
          .single();

        if (candError || !newCand) throw candError || new Error("Failed to create candidate");
        candidateId = newCand.id;
      }

      const visaPayload = {
        candidate_id: candidateId,
        visa_issued: visaForm.visa_issued,
        visa_type: visaForm.visa_type,
        manpower: visaForm.manpower,
        agent_name: visaForm.agent_name?.trim() || null,
      };

      let error;
      if (editingVisa) {
        ({ error } = await supabase.from("visas").update(visaPayload).eq("id", editingVisa.id));
      } else {
        ({ error } = await supabase.from("visas").insert([visaPayload]));
      }

      if (error) throw error;

      alert(editingVisa ? "✅ Visa updated successfully!" : "✅ Visa added successfully!");
      setShowVisaModal(false);
      fetchVisas();
      fetchCandidates();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteVisa = async (id: string) => {
    if (!confirm("Are you sure you want to delete this visa?")) return;
    const { error } = await supabase.from("visas").delete().eq("id", id);
    if (error) alert("Delete failed: " + error.message);
    else {
      alert("✅ Visa deleted");
      fetchVisas();
    }
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="p-8 border-b border-zinc-800">
          <h1 className="text-3xl font-bold tracking-tight text-white">Visa<span className="text-blue-500">ERP</span></h1>
          <p className="text-zinc-500 text-sm mt-1">Manpower Management</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {[
            { id: "dashboard", label: "Dashboard", icon: "📊" },
            { id: "candidates", label: "Candidates", icon: "👥" },
            { id: "visas", label: "Visas", icon: "🛫" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-6 py-3.5 rounded-2xl text-left transition-all ${
                tab === item.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                  : "hover:bg-zinc-800 text-zinc-300"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="h-20 bg-zinc-900 border-b border-zinc-800 flex items-center px-10 justify-between">
          <h2 className="text-2xl font-semibold capitalize">{tab}</h2>

          <div className="flex items-center gap-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by name, passport or agent..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-96 bg-zinc-800 border border-zinc-700 focus:border-blue-500 rounded-2xl pl-12 py-3 text-sm focus:outline-none"
              />
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
            </div>

            {tab === "candidates" && (
              <button
                onClick={openAddCandidateModal}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-2xl font-medium transition"
              >
                + Add Candidate
              </button>
            )}

            {tab === "visas" && (
              <button
                onClick={openAddVisaModal}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-2xl font-medium transition"
              >
                + New Visa
              </button>
            )}
          </div>
        </div>

        {/* Dashboard Tab */}
        {tab === "dashboard" && (
          <div className="p-10 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[
                { label: "Total Candidates", value: totalCandidates, color: "text-white" },
                { label: "Total Visas", value: totalVisas, color: "text-white" },
                { label: "Manpower Visas", value: manpowerVisas, color: "text-emerald-400" },
                { label: "Expiring Soon", value: expiringSoon, color: "text-orange-400" },
              ].map((stat, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 hover:border-zinc-700 transition">
                  <p className="text-zinc-500 text-sm">{stat.label}</p>
                  <p className={`text-5xl font-semibold mt-4 tracking-tighter ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <h3 className="font-semibold text-xl mb-6">Recent Visas</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400 text-sm">
                      <th className="py-5 text-left">Candidate</th>
                      <th className="py-5 text-left">Passport</th>
                      <th className="py-5 text-left">Agent</th>
                      <th className="py-5 text-left">Issued</th>
                      <th className="py-5 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentVisas.map((v) => (
                      <tr key={v.id} className="border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition">
                        <td className="py-6 font-medium">{v.candidates?.name}</td>
                        <td className="py-6 font-mono text-zinc-400">{v.candidates?.passport_no}</td>
                        <td className="py-6">{v.agent_name || "—"}</td>
                        <td className="py-6">{v.visa_issued}</td>
                        <td className="py-6">
                          <span className="px-4 py-1 bg-zinc-800 rounded-full text-xs">{v.visa_type}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Candidates Tab */}
        {tab === "candidates" && (
          <div className="p-10 overflow-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-zinc-950">
                  <tr className="text-zinc-400 text-sm border-b border-zinc-800">
                    <th className="px-10 py-6 text-left w-16">SL</th>
                    <th className="px-10 py-6 text-left">Full Name</th>
                    <th className="px-10 py-6 text-left">Passport No</th>
                    <th className="px-10 py-6 text-left">Status</th>
                    <th className="px-10 py-6 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((c, i) => (
                    <tr key={c.id} className="hover:bg-zinc-800/70 border-b border-zinc-800 last:border-0">
                      <td className="px-10 py-6 text-zinc-500">{i + 1}</td>
                      <td className="px-10 py-6 font-medium">{c.name}</td>
                      <td className="px-10 py-6 font-mono text-blue-400">{c.passport_no}</td>
                      <td className="px-10 py-6">
                        <span className="px-5 py-1.5 bg-emerald-950 text-emerald-400 text-xs rounded-full font-medium">Active</span>
                      </td>
                      <td className="px-10 py-6 text-center text-blue-400 hover:underline cursor-pointer">View Details</td>
                    </tr>
                  ))}
                  {filteredCandidates.length === 0 && (
                    <tr><td colSpan={5} className="py-24 text-center text-zinc-500">No candidates found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Visas Tab */}
        {tab === "visas" && (
          <div className="p-10 overflow-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-zinc-950">
                  <tr className="text-zinc-400 text-sm border-b border-zinc-800">
                    <th className="px-10 py-6 text-left w-16">SL</th>
                    <th className="px-10 py-6 text-left">Candidate</th>
                    <th className="px-10 py-6 text-left">Passport</th>
                    <th className="px-10 py-6 text-left">Agent</th>
                    <th className="px-10 py-6 text-left">Received</th>
                    <th className="px-10 py-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="py-32 text-center">Loading visas...</td></tr>
                  ) : filteredVisas.length === 0 ? (
                    <tr><td colSpan={6} className="py-32 text-center text-zinc-500">No visas match your search</td></tr>
                  ) : (
                    filteredVisas.map((v, i) => (
                      <tr key={v.id} className="hover:bg-zinc-800/70 border-b border-zinc-800 last:border-0 transition">
                        <td className="px-10 py-6">{i + 1}</td>
                        <td className="px-10 py-6 font-medium">{v.candidates?.name}</td>
                        <td className="px-10 py-6 font-mono text-blue-400">{v.candidates?.passport_no}</td>
                        <td className="px-10 py-6">{v.agent_name || "—"}</td>
                        <td className="px-10 py-6 text-zinc-400">{v.visa_issued}</td>
                        <td className="px-10 py-6 text-center">
                          <button
                            onClick={() => openEditVisaModal(v)}
                            className="text-blue-400 hover:text-blue-300 mr-6 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteVisa(v.id)}
                            className="text-red-400 hover:text-red-500 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Candidate Modal */}
      {showCandidateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-3xl w-full max-w-md p-10 border border-zinc-700">
            <h2 className="text-2xl font-semibold mb-8">Add New Candidate</h2>
            <form onSubmit={saveCandidate} className="space-y-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Full Name</label>
                <input
                  type="text"
                  value={candidateForm.name}
                  onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Passport Number</label>
                <input
                  type="text"
                  value={candidateForm.passport_no}
                  onChange={(e) => setCandidateForm({ ...candidateForm, passport_no: e.target.value.toUpperCase() })}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCandidateModal(false)}
                  className="flex-1 py-4 border border-zinc-700 rounded-2xl hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-emerald-600 rounded-2xl hover:bg-emerald-700 font-medium transition"
                >
                  Add Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Visa Modal */}
      {showVisaModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-3xl w-full max-w-lg p-10 border border-zinc-700">
            <h2 className="text-2xl font-semibold mb-8">
              {editingVisa ? "Edit Visa" : "Create New Visa"}
            </h2>

            <form onSubmit={saveVisa} className="space-y-6">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Full Name</label>
                <input
                  type="text"
                  value={visaForm.name}
                  onChange={(e) => setVisaForm({ ...visaForm, name: e.target.value })}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Passport No</label>
                  <input
                    type="text"
                    value={visaForm.passport_no}
                    onChange={(e) => setVisaForm({ ...visaForm, passport_no: e.target.value.toUpperCase() })}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Agent Name</label>
                  <input
                    type="text"
                    value={visaForm.agent_name}
                    onChange={(e) => setVisaForm({ ...visaForm, agent_name: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Received Date</label>
                  <input
                    type="date"
                    value={visaForm.visa_issued}
                    onChange={(e) => setVisaForm({ ...visaForm, visa_issued: e.target.value })}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Visa Type</label>
                  <select
                    value={visaForm.visa_type}
                    onChange={(e) => setVisaForm({ ...visaForm, visa_type: e.target.value })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-5 py-3.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Work">Work Visa</option>
                    <option value="Tourist">Tourist Visa</option>
                    <option value="Student">Student Visa</option>
                    <option value="Business">Business Visa</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="manpower"
                  checked={visaForm.manpower}
                  onChange={(e) => setVisaForm({ ...visaForm, manpower: e.target.checked })}
                  className="w-5 h-5 accent-blue-600"
                />
                <label htmlFor="manpower" className="font-medium cursor-pointer">This is a Manpower Visa</label>
              </div>

              <div className="flex gap-4 pt-8">
                <button
                  type="button"
                  onClick={() => setShowVisaModal(false)}
                  className="flex-1 py-4 border border-zinc-700 rounded-2xl hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 rounded-2xl hover:bg-blue-700 font-medium transition"
                >
                  {editingVisa ? "Update Visa" : "Add Visa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}