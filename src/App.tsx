import { useEffect, useState } from "react";
import type { FormEvent } from "react";   // ← এখানে type-only import করা হয়েছে
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
    const { data } = await supabase.from("candidates").select("*").order("name");
    setCandidates(data || []);
  };

  const fetchVisas = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("visas")
      .select(`
        *,
        candidates!visas_candidate_id_fkey(name, passport_no)
      `)
      .order("visa_issued", { ascending: false });
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
    const { error } = await supabase
      .from("candidates")
      .insert({
        name: candidateForm.name,
        passport_no: candidateForm.passport_no.toUpperCase(),
      });

    if (error) alert("Error: " + error.message);
    else {
      alert("Candidate added successfully!");
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
      let { data: existing } = await supabase
        .from("candidates")
        .select("id")
        .eq("passport_no", visaForm.passport_no)
        .single();

      let candidateId = existing?.id;

      if (!candidateId) {
        const { data: newCand, error: candError } = await supabase
          .from("candidates")
          .insert({
            name: visaForm.name,
            passport_no: visaForm.passport_no.toUpperCase(),
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
        agent_name: visaForm.agent_name || null,
      };

      let error;
      if (editingVisa) {
        ({ error } = await supabase.from("visas").update(visaPayload).eq("id", editingVisa.id));
      } else {
        ({ error } = await supabase.from("visas").insert([visaPayload]));
      }

      if (error) throw error;

      alert(editingVisa ? "Visa updated!" : "Visa added successfully!");
      setShowVisaModal(false);
      fetchVisas();
      fetchCandidates();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleDeleteVisa = async (id: string) => {
    if (!confirm("Delete this visa?")) return;
    const { error } = await supabase.from("visas").delete().eq("id", id);
    if (error) alert("Delete failed");
    else {
      alert("Visa deleted");
      fetchVisas();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-blue-600">VisaERP</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${tab === "dashboard" ? "bg-blue-50 text-blue-600 font-medium" : "hover:bg-gray-100"}`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setTab("candidates")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${tab === "candidates" ? "bg-blue-50 text-blue-600 font-medium" : "hover:bg-gray-100"}`}
          >
            👥 Candidates
          </button>
          <button
            onClick={() => setTab("visas")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left ${tab === "visas" ? "bg-blue-50 text-blue-600 font-medium" : "hover:bg-gray-100"}`}
          >
            🛫 Visas
          </button>
        </nav>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-16 bg-white border-b flex items-center px-8 justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            {tab === "dashboard" && "Dashboard"}
            {tab === "candidates" && "Candidates"}
            {tab === "visas" && "Visas"}
          </h2>

          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-80 pl-11 py-2.5 bg-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {tab === "candidates" && (
              <button
                onClick={openAddCandidateModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl font-medium"
              >
                + Add Candidate
              </button>
            )}
            {tab === "visas" && (
              <button
                onClick={openAddVisaModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-medium"
              >
                + Add Visa
              </button>
            )}
          </div>
        </div>

        {/* Dashboard */}
        {tab === "dashboard" && (
          <div className="p-8 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
              <div className="bg-white p-6 rounded-3xl shadow-sm border">
                <p className="text-gray-500">Total Candidates</p>
                <p className="text-4xl font-bold mt-2">{totalCandidates}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border">
                <p className="text-gray-500">Total Visas</p>
                <p className="text-4xl font-bold mt-2">{totalVisas}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border">
                <p className="text-gray-500">Manpower Visas</p>
                <p className="text-4xl font-bold text-emerald-600 mt-2">{manpowerVisas}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border">
                <p className="text-gray-500">Expiring Soon</p>
                <p className="text-4xl font-bold text-orange-600 mt-2">{expiringSoon}</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border p-6">
              <h3 className="font-semibold text-lg mb-4">Recent Visas</h3>
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3">Name</th>
                    <th className="text-left py-3">Passport</th>
                    <th className="text-left py-3">Agent</th>
                    <th className="text-left py-3">Issued</th>
                    <th className="text-left py-3">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVisas.map((v) => (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-4">{v.candidates?.name || "-"}</td>
                      <td className="py-4 font-mono">{v.candidates?.passport_no || "-"}</td>
                      <td className="py-4">{v.agent_name || "-"}</td>
                      <td className="py-4">{v.visa_issued}</td>
                      <td className="py-4">{v.visa_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Candidates Table */}
        {tab === "candidates" && (
          <div className="p-8">
            <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-8 py-5 text-left">SL</th>
                    <th className="px-8 py-5 text-left">Name</th>
                    <th className="px-8 py-5 text-left">Passport No</th>
                    <th className="px-8 py-5 text-left">Status</th>
                    <th className="px-8 py-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map((c, i) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-8 py-5">{i + 1}</td>
                      <td className="px-8 py-5 font-medium">{c.name}</td>
                      <td className="px-8 py-5 font-mono">{c.passport_no}</td>
                      <td className="px-8 py-5">
                        <span className="px-4 py-1 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
                      </td>
                      <td className="px-8 py-5 text-center">View</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Visas Table */}
        {tab === "visas" && (
          <div className="p-8">
            <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-8 py-5 text-left w-12">SL</th>
                    <th className="px-8 py-5 text-left">Name</th>
                    <th className="px-8 py-5 text-left">Passport</th>
                    <th className="px-8 py-5 text-left">Agent</th>
                    <th className="px-8 py-5 text-left">Received Date</th>
                    <th className="px-8 py-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="py-20 text-center">Loading...</td></tr>
                  ) : filteredVisas.length === 0 ? (
                    <tr><td colSpan={6} className="py-20 text-center text-gray-500">No visas found</td></tr>
                  ) : (
                    filteredVisas.map((v, i) => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-8 py-5">{i + 1}</td>
                        <td className="px-8 py-5 font-medium">{v.candidates?.name}</td>
                        <td className="px-8 py-5 font-mono">{v.candidates?.passport_no}</td>
                        <td className="px-8 py-5">{v.agent_name || "-"}</td>
                        <td className="px-8 py-5">{v.visa_issued}</td>
                        <td className="px-8 py-5 text-center">
                          <button onClick={() => openEditVisaModal(v)} className="text-blue-600 mr-4">Edit</button>
                          <button onClick={() => handleDeleteVisa(v.id)} className="text-red-600">Delete</button>
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

      {/* Modals */}
      {/* Add Candidate Modal */}
      {showCandidateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl w-full max-w-md p-8">
            <h2 className="text-2xl font-semibold mb-6">Add New Candidate</h2>
            <form onSubmit={saveCandidate} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={candidateForm.name}
                  onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Passport No</label>
                <input
                  type="text"
                  value={candidateForm.passport_no}
                  onChange={(e) => setCandidateForm({ ...candidateForm, passport_no: e.target.value.toUpperCase() })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowCandidateModal(false)} className="flex-1 py-3 border rounded-2xl hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700">
                  Add Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Visa Modal */}
      {showVisaModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8">
            <h2 className="text-2xl font-semibold mb-6">{editingVisa ? "Edit Visa" : "Add New Visa"}</h2>
            <form onSubmit={saveVisa} className="space-y-5">
              {/* Form fields same as previous version */}
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  value={visaForm.name}
                  onChange={(e) => setVisaForm({ ...visaForm, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium mb-1">Passport No</label>
                  <input
                    type="text"
                    value={visaForm.passport_no}
                    onChange={(e) => setVisaForm({ ...visaForm, passport_no: e.target.value.toUpperCase() })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Agent Name</label>
                  <input
                    type="text"
                    value={visaForm.agent_name}
                    onChange={(e) => setVisaForm({ ...visaForm, agent_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium mb-1">Received Date</label>
                  <input
                    type="date"
                    value={visaForm.visa_issued}
                    onChange={(e) => setVisaForm({ ...visaForm, visa_issued: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Visa Type</label>
                  <select
                    value={visaForm.visa_type}
                    onChange={(e) => setVisaForm({ ...visaForm, visa_type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500"
                  >
                    <option value="Work">Work Visa</option>
                    <option value="Tourist">Tourist</option>
                    <option value="Student">Student</option>
                    <option value="Business">Business</option>
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
                <label className="font-medium">Manpower Visa</label>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowVisaModal(false)}
                  className="flex-1 py-3 border rounded-2xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700"
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