import { useEffect, useState, useCallback, FormEvent } from "react";
import { supabase } from "./supabaseClient";

type Candidate = {
  id: string;
  name: string;
  passport_no: string;
};

type VisaWithCandidate = {
  id: string;
  visa_issued: string;
  visa_type: string;
  manpower: boolean;
  agent_name?: string | null;
  candidate_id: string;
  candidates: {
    name: string;
    passport_no: string;
  } | null;
};

export default function App() {
  const [tab, setTab] = useState<"dashboard" | "candidates" | "visas">("dashboard");

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [visas, setVisas] = useState<VisaWithCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Dashboard Stats
  const [stats, setStats] = useState({
    totalCandidates: 0,
    totalVisas: 0,
    manpowerVisas: 0,
    thisMonthVisas: 0,
  });

  // Modals
  const [showVisaModal, setShowVisaModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [editingVisa, setEditingVisa] = useState<VisaWithCandidate | null>(null);
  const [saving, setSaving] = useState(false);

  // Forms
  const [visaForm, setVisaForm] = useState({
    candidate_id: "",
    agent_name: "",
    visa_issued: new Date().toISOString().split("T")[0],
    visa_type: "Work",
    manpower: false,
  });

  const [candidateForm, setCandidateForm] = useState({
    name: "",
    passport_no: "",
  });

  /* ================= FETCH DATA ================= */
  const fetchCandidates = useCallback(async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("name", { ascending: true });

    if (error) console.error("Candidates fetch error:", error);
    else setCandidates(data || []);
  }, []);

  const fetchVisas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("visas")
      .select(`
        *,
        candidates!inner(name, passport_no)
      `)
      .order("visa_issued", { ascending: false });

    if (error) console.error("Visas fetch error:", error);
    else setVisas((data as VisaWithCandidate[]) || []);

    setLoading(false);
  }, []);

  const calculateStats = useCallback(() => {
    const totalVisas = visas.length;
    const manpowerVisas = visas.filter((v) => v.manpower).length;

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const thisMonthVisasCount = visas.filter((v) => {
      const d = new Date(v.visa_issued);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    setStats({
      totalCandidates: candidates.length,
      totalVisas,
      manpowerVisas,
      thisMonthVisas: thisMonthVisasCount,
    });
  }, [candidates.length, visas]);

  useEffect(() => {
    fetchCandidates();
    fetchVisas();
  }, [fetchCandidates, fetchVisas]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  /* ================= FILTERS ================= */
  const filteredVisas = visas.filter((v) =>
    `${v.candidates?.name || ""} ${v.candidates?.passport_no || ""} ${v.agent_name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredCandidates = candidates.filter((c) =>
    `${c.name} ${c.passport_no}`.toLowerCase().includes(search.toLowerCase())
  );

  const recentVisas = visas.slice(0, 6);

  /* ================= CANDIDATE HANDLERS ================= */
  const openAddCandidateModal = () => {
    setCandidateForm({ name: "", passport_no: "" });
    setShowCandidateModal(true);
  };

  const saveCandidate = async (e: FormEvent) => {
    e.preventDefault();
    if (!candidateForm.name.trim() || !candidateForm.passport_no.trim()) {
      alert("Name and Passport Number are required");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("candidates").insert([candidateForm]);

    if (error) alert("Failed to add candidate: " + error.message);
    else {
      alert("Candidate added successfully!");
      setShowCandidateModal(false);
      fetchCandidates();
      fetchVisas();
    }
    setSaving(false);
  };

  /* ================= VISA HANDLERS ================= */
  const openAddVisaModal = () => {
    setEditingVisa(null);
    setVisaForm({
      candidate_id: "",
      agent_name: "",
      visa_issued: new Date().toISOString().split("T")[0],
      visa_type: "Work",
      manpower: false,
    });
    setShowVisaModal(true);
  };

  const openEditVisaModal = (visa: VisaWithCandidate) => {
    setEditingVisa(visa);
    setVisaForm({
      candidate_id: visa.candidate_id,
      agent_name: visa.agent_name || "",
      visa_issued: visa.visa_issued,
      visa_type: visa.visa_type,
      manpower: visa.manpower,
    });
    setShowVisaModal(true);
  };

  const saveVisa = async (e: FormEvent) => {
    e.preventDefault();
    if (!visaForm.candidate_id) {
      alert("Please select a candidate");
      return;
    }

    setSaving(true);

    const payload = {
      candidate_id: visaForm.candidate_id,
      visa_issued: visaForm.visa_issued,
      visa_type: visaForm.visa_type,
      manpower: visaForm.manpower,
      agent_name: visaForm.agent_name || null,
    };

    let error;
    if (editingVisa) {
      const { error: updateError } = await supabase
        .from("visas")
        .update(payload)
        .eq("id", editingVisa.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from("visas").insert([payload]);
      error = insertError;
    }

    if (error) {
      alert("Error saving visa: " + error.message);
    } else {
      alert(editingVisa ? "Visa updated successfully!" : "Visa added successfully!");
      setShowVisaModal(false);
      fetchVisas();
    }
    setSaving(false);
  };

  const handleDeleteVisa = async (id: string) => {
    if (!confirm("Are you sure you want to delete this visa?")) return;

    const { error } = await supabase.from("visas").delete().eq("id", id);
    if (error) alert("Delete failed: " + error.message);
    else {
      alert("Visa deleted successfully");
      fetchVisas();
    }
  };

  const quickCreateCandidate = async () => {
    const name = prompt("Enter candidate full name:");
    const passport = prompt("Enter passport number:");

    if (!name || !passport) return;

    const { data, error } = await supabase
      .from("candidates")
      .insert({
        name: name.trim(),
        passport_no: passport.trim().toUpperCase(),
      })
      .select("id")
      .single();

    if (error) {
      alert("Failed to create candidate: " + error.message);
    } else if (data) {
      alert("Candidate created successfully!");
      await fetchCandidates();
      setVisaForm((prev) => ({ ...prev, candidate_id: data.id }));
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-3xl font-bold text-blue-600">VisaERP</h1>
          <p className="text-xs text-gray-500 mt-1">Manpower & Visa Management</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 mb-3">MAIN</div>
          <button
            onClick={() => setTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all ${
              tab === "dashboard" ? "bg-blue-50 text-blue-600 font-medium" : "hover:bg-gray-100"
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setTab("candidates")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all ${
              tab === "candidates" ? "bg-blue-50 text-blue-600 font-medium" : "hover:bg-gray-100"
            }`}
          >
            👥 Candidates
          </button>
          <button
            onClick={() => setTab("visas")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all ${
              tab === "visas" ? "bg-blue-50 text-blue-600 font-medium" : "hover:bg-gray-100"
            }`}
          >
            🛫 Visas
          </button>
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-100 rounded-2xl">
            <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">S</div>
            <div>
              <p className="font-medium text-sm">Seven</p>
              <p className="text-xs text-gray-500">Administrator</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <div className="h-16 bg-white border-b flex items-center px-8 justify-between">
          <h2 className="text-2xl font-semibold text-gray-800">
            {tab === "dashboard" && "Dashboard Overview"}
            {tab === "candidates" && "Candidates Management"}
            {tab === "visas" && "Visas Management"}
          </h2>

          <div className="flex items-center gap-4">
            <div className="relative w-80">
              <input
                type="text"
                placeholder="Search by name, passport or agent..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute left-4 top-3.5 text-gray-400">🔍</span>
            </div>

            {tab === "visas" && (
              <button
                onClick={openAddVisaModal}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl font-medium transition"
              >
                + Add New Visa
              </button>
            )}

            {tab === "candidates" && (
              <button
                onClick={openAddCandidateModal}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-2xl font-medium transition"
              >
                + Add New Candidate
              </button>
            )}
          </div>
        </div>

        {/* Dashboard */}
        {tab === "dashboard" && (
          <div className="flex-1 p-8 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <div className="bg-white rounded-3xl p-6 shadow-sm border">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-4xl font-bold">{stats.totalCandidates}</p>
                <p className="text-gray-500">Total Candidates</p>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-sm border">
                <div className="text-4xl mb-3">🛫</div>
                <p className="text-4xl font-bold">{stats.totalVisas}</p>
                <p className="text-gray-500">Total Visas</p>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-sm border">
                <div className="text-4xl mb-3">🏢</div>
                <p className="text-4xl font-bold">{stats.manpowerVisas}</p>
                <p className="text-gray-500">Manpower Visas</p>
              </div>
              <div className="bg-white rounded-3xl p-6 shadow-sm border">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-4xl font-bold">{stats.thisMonthVisas}</p>
                <p className="text-gray-500">This Month</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border overflow-hidden">
                <div className="px-8 py-6 border-b flex justify-between items-center">
                  <h3 className="font-semibold text-lg">Recent Visas</h3>
                  <button onClick={() => setTab("visas")} className="text-blue-600 hover:underline text-sm">
                    View All →
                  </button>
                </div>
                <div className="divide-y">
                  {recentVisas.length === 0 ? (
                    <p className="py-20 text-center text-gray-500">No visas yet</p>
                  ) : (
                    recentVisas.map((v) => (
                      <div key={v.id} className="px-8 py-5 flex items-center justify-between hover:bg-gray-50">
                        <div>
                          <p className="font-medium">{v.candidates?.name || "-"}</p>
                          <p className="text-sm text-gray-500 font-mono">{v.candidates?.passport_no}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{v.visa_type} Visa</p>
                          <p className="text-xs text-gray-500">{v.visa_issued}</p>
                        </div>
                        <div>
                          {v.manpower && <span className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded-full">Manpower</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border p-8">
                <h3 className="font-semibold text-lg mb-6">Quick Actions</h3>
                <div className="space-y-4">
                  <button
                    onClick={openAddVisaModal}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-medium"
                  >
                    + Issue New Visa
                  </button>
                  <button
                    onClick={openAddCandidateModal}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-medium"
                  >
                    + Add New Candidate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Candidates & Visas Table */}
        {(tab === "candidates" || tab === "visas") && (
          <div className="flex-1 p-8 overflow-auto">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-8 py-5 text-left w-12">SL</th>
                    <th className="px-8 py-5 text-left">Name</th>
                    <th className="px-8 py-5 text-left">Passport No</th>
                    <th className="px-8 py-5 text-left">Agent</th>
                    <th className="px-8 py-5 text-left">Visa Issued</th>
                    {tab === "candidates" && <th className="px-8 py-5 text-left">Status</th>}
                    <th className="px-8 py-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {tab === "visas" ? (
                    loading ? (
                      <tr><td colSpan={6} className="py-20 text-center">Loading...</td></tr>
                    ) : filteredVisas.length === 0 ? (
                      <tr><td colSpan={6} className="py-20 text-center text-gray-500">No visas found</td></tr>
                    ) : (
                      filteredVisas.map((v, i) => (
                        <tr key={v.id} className="hover:bg-blue-50/50">
                          <td className="px-8 py-5">{i + 1}</td>
                          <td className="px-8 py-5 font-medium">{v.candidates?.name || "-"}</td>
                          <td className="px-8 py-5 font-mono">{v.candidates?.passport_no || "-"}</td>
                          <td className="px-8 py-5">{v.agent_name || "-"}</td>
                          <td className="px-8 py-5">{v.visa_issued}</td>
                          <td className="px-8 py-5 text-center">
                            <button onClick={() => openEditVisaModal(v)} className="text-blue-600 hover:text-blue-700 mr-4">Edit</button>
                            <button onClick={() => handleDeleteVisa(v.id)} className="text-red-600 hover:text-red-700">Delete</button>
                          </td>
                        </tr>
                      ))
                    )
                  ) : filteredCandidates.length === 0 ? (
                    <tr><td colSpan={7} className="py-20 text-center text-gray-500">No candidates found</td></tr>
                  ) : (
                    filteredCandidates.map((c, i) => (
                      <tr key={c.id} className="hover:bg-blue-50/50">
                        <td className="px-8 py-5">{i + 1}</td>
                        <td className="px-8 py-5 font-medium">{c.name}</td>
                        <td className="px-8 py-5 font-mono">{c.passport_no}</td>
                        <td className="px-8 py-5 text-gray-500">-</td>
                        <td className="px-8 py-5 text-gray-500">-</td>
                        <td className="px-8 py-5">
                          <span className="px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Active</span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <button className="text-blue-600 hover:text-blue-700">View</button>
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

      {/* Visa Modal */}
      {showVisaModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg">
            <div className="px-8 pt-8 pb-4">
              <h2 className="text-2xl font-semibold">{editingVisa ? "Edit Visa" : "Add New Visa"}</h2>
            </div>
            <form onSubmit={saveVisa} className="px-8 pb-8 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">Candidate</label>
                <div className="flex gap-2">
                  <select
                    value={visaForm.candidate_id}
                    onChange={(e) => setVisaForm({ ...visaForm, candidate_id: e.target.value })}
                    required
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select Candidate</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.passport_no}
                      </option>
                    ))}
                  </select>
                  {!editingVisa && (
                    <button
                      type="button"
                      onClick={quickCreateCandidate}
                      className="px-5 py-3 bg-gray-100 hover:bg-gray-200 rounded-2xl text-sm"
                    >
                      + New
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Agent Name</label>
                <input
                  type="text"
                  value={visaForm.agent_name}
                  onChange={(e) => setVisaForm({ ...visaForm, agent_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium mb-1">Visa Issued Date</label>
                  <input
                    type="date"
                    value={visaForm.visa_issued}
                    onChange={(e) => setVisaForm({ ...visaForm, visa_issued: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Visa Type</label>
                  <select
                    value={visaForm.visa_type}
                    onChange={(e) => setVisaForm({ ...visaForm, visa_type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
                  >
                    <option value="Work">Work Visa</option>
                    <option value="Tourist">Tourist Visa</option>
                    <option value="Student">Student Visa</option>
                    <option value="Business">Business Visa</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={visaForm.manpower}
                  onChange={(e) => setVisaForm({ ...visaForm, manpower: e.target.checked })}
                  className="w-5 h-5 accent-blue-600"
                />
                <label className="font-medium">This is a Manpower Visa</label>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowVisaModal(false)}
                  className="flex-1 py-3.5 border border-gray-300 rounded-2xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-2xl font-medium"
                >
                  {saving ? "Saving..." : editingVisa ? "Update Visa" : "Add Visa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Modal */}
      {showCandidateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md">
            <div className="px-8 pt-8 pb-4">
              <h2 className="text-2xl font-semibold">Add New Candidate</h2>
            </div>
            <form onSubmit={saveCandidate} className="px-8 pb-8 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={candidateForm.name}
                  onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Passport Number</label>
                <input
                  type="text"
                  value={candidateForm.passport_no}
                  onChange={(e) => setCandidateForm({ ...candidateForm, passport_no: e.target.value.toUpperCase() })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl font-mono"
                />
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowCandidateModal(false)}
                  className="flex-1 py-3.5 border border-gray-300 rounded-2xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-2xl font-medium"
                >
                  {saving ? "Adding..." : "Add Candidate"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}