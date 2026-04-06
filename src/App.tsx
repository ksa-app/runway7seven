import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

type Candidate = {
  id: string;
  name: string;
  passport_no: string;
};

type Visa = {
  id: string;
  vsl?: number | null;
  visa_issued: string;
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
  const [tab, setTab] = useState<"candidates" | "visas">("visas");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [visas, setVisas] = useState<Visa[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingVisa, setEditingVisa] = useState<Visa | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    passport_no: "",
    agent_name: "",
    visa_issued: "",
    visa_type: "Work",
    manpower: false,
  });

  /* ================= FETCH FUNCTIONS ================= */
  const fetchCandidates = async () => {
    const { data, error } = await supabase
      .from("candidates")
      .select("*")
      .order("name", { ascending: true });

    if (error) console.error("Candidates fetch error:", error.message);
    else setCandidates(data || []);
  };

  const fetchVisas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("visas")
      .select(`
        *,
        candidates!visas_candidate_id_fkey (
          name,
          passport_no
        )
      `)
      .order("visa_issued", { ascending: false });

    if (error) {
      console.error("Visas fetch error:", error.message);
    } else {
      setVisas(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCandidates();
    fetchVisas();
  }, []);

  /* ================= FILTERS ================= */
  const filteredVisas = visas.filter((v) =>
    `${v.candidates?.name || ""} ${v.candidates?.passport_no || ""} ${v.agent_name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredCandidates = candidates.filter((c) =>
    `${c.name} ${c.passport_no}`.toLowerCase().includes(search.toLowerCase())
  );

  /* ================= MODAL & FORM HANDLERS ================= */
  const resetForm = () => {
    setFormData({
      name: "",
      passport_no: "",
      agent_name: "",
      visa_issued: new Date().toISOString().split("T")[0],
      visa_type: "Work",
      manpower: false,
    });
  };

  const openAddModal = () => {
    setEditingVisa(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (visa: Visa) => {
    setEditingVisa(visa);
    setFormData({
      name: visa.candidates?.name || "",
      passport_no: visa.candidates?.passport_no || "",
      agent_name: visa.agent_name || "",
      visa_issued: visa.visa_issued,
      visa_type: visa.visa_type,
      manpower: visa.manpower,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingVisa(null);
  };

  /* ================= SAVE VISA (Add or Edit) ================= */
  const saveVisa = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Step 1: Find or Create Candidate
      let candidateId: string;

      const { data: existingCandidate } = await supabase
        .from("candidates")
        .select("id")
        .eq("passport_no", formData.passport_no)
        .single();

      if (existingCandidate) {
        candidateId = existingCandidate.id;
      } else {
        // Create new candidate
        const { data: newCandidate, error: candidateError } = await supabase
          .from("candidates")
          .insert({
            name: formData.name,
            passport_no: formData.passport_no,
          })
          .select("id")
          .single();

        if (candidateError || !newCandidate) {
          alert("Failed to create candidate: " + (candidateError?.message || ""));
          return;
        }
        candidateId = newCandidate.id;
      }

      // Step 2: Prepare Visa Payload
      const visaPayload = {
        candidate_id: candidateId,
        visa_issued: formData.visa_issued,
        visa_type: formData.visa_type,
        manpower: formData.manpower,
        agent_name: formData.agent_name || null,
      };

      let error;

      if (editingVisa) {
        // Update existing visa
        const { error: updateError } = await supabase
          .from("visas")
          .update(visaPayload)
          .eq("id", editingVisa.id);
        error = updateError;
      } else {
        // Insert new visa
        const { error: insertError } = await supabase
          .from("visas")
          .insert([visaPayload]);
        error = insertError;
      }

      if (error) {
        alert("Error saving visa: " + error.message);
      } else {
        alert(editingVisa ? "Visa updated successfully!" : "Visa added successfully!");
        closeModal();
        fetchVisas();   // Refresh visas
        fetchCandidates(); // Refresh candidates if new one was added
      }
    } catch (err: any) {
      alert("Unexpected error: " + err.message);
    }
  };

  /* ================= DELETE VISA ================= */
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this visa?")) return;

    const { error } = await supabase.from("visas").delete().eq("id", id);

    if (error) {
      alert("Delete failed: " + error.message);
    } else {
      alert("Visa deleted successfully");
      fetchVisas();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-blue-600">VisaERP</h1>
        </div>

        <nav className="flex-1 p-4">
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 mb-2">MAIN</div>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-left">
            📊 Dashboard
          </button>
          <button
            onClick={() => setTab("candidates")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
              tab === "candidates" ? "bg-blue-50 text-blue-600 font-medium" : "hover:bg-gray-100"
            }`}
          >
            👥 Candidates
          </button>
          <button
            onClick={() => setTab("visas")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition ${
              tab === "visas" ? "bg-blue-50 text-blue-600 font-medium" : "hover:bg-gray-100"
            }`}
          >
            🛫 Visas
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-left">
            📋 Reports
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
      <div className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <div className="h-16 bg-white border-b flex items-center px-8 justify-between">
          <h2 className="text-xl font-semibold text-gray-800">
            {tab === "candidates" ? "Candidates Management" : "Visas Management"}
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
                onClick={openAddModal}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl font-medium transition"
              >
                + Add New Visa
              </button>
            )}
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full min-w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-8 py-5 text-left w-12 text-sm font-medium text-gray-600">SL</th>
                  <th className="px-8 py-5 text-left text-sm font-medium text-gray-600">Name</th>
                  <th className="px-8 py-5 text-left text-sm font-medium text-gray-600">Passport No</th>
                  <th className="px-8 py-5 text-left text-sm font-medium text-gray-600">Agent</th>
                  <th className="px-8 py-5 text-left text-sm font-medium text-gray-600">Received Date</th>
                  {tab === "candidates" && <th className="px-8 py-5 text-left text-sm font-medium text-gray-600">Status</th>}
                  <th className="px-8 py-5 text-center text-sm font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {tab === "visas" ? (
                  loading ? (
                    <tr><td colSpan={6} className="py-20 text-center text-gray-500">Loading visas...</td></tr>
                  ) : filteredVisas.length === 0 ? (
                    <tr><td colSpan={6} className="py-20 text-center text-gray-500">No visas found</td></tr>
                  ) : (
                    filteredVisas.map((v, i) => (
                      <tr key={v.id} className="hover:bg-blue-50/50 transition">
                        <td className="px-8 py-5">{i + 1}</td>
                        <td className="px-8 py-5 font-medium">{v.candidates?.name || "-"}</td>
                        <td className="px-8 py-5 font-mono">{v.candidates?.passport_no || "-"}</td>
                        <td className="px-8 py-5">{v.agent_name || "-"}</td>
                        <td className="px-8 py-5">{v.visa_issued}</td>
                        <td className="px-8 py-5 text-center">
                          <button
                            onClick={() => openEditModal(v)}
                            className="text-blue-600 hover:text-blue-700 mr-5 font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(v.id)}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )
                ) : (
                  filteredCandidates.length === 0 ? (
                    <tr><td colSpan={7} className="py-20 text-center text-gray-500">No candidates found</td></tr>
                  ) : (
                    filteredCandidates.map((c, i) => (
                      <tr key={c.id} className="hover:bg-blue-50/50 transition">
                        <td className="px-8 py-5">{i + 1}</td>
                        <td className="px-8 py-5 font-medium">{c.name}</td>
                        <td className="px-8 py-5 font-mono">{c.passport_no}</td>
                        <td className="px-8 py-5 text-gray-500">-</td>
                        <td className="px-8 py-5 text-gray-500">-</td>
                        <td className="px-8 py-5">
                          <span className="px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">Active</span>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <button className="text-blue-600 hover:text-blue-700 font-medium">View</button>
                        </td>
                      </tr>
                    ))
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl">
            <div className="px-8 pt-8 pb-2">
              <h2 className="text-2xl font-semibold text-gray-900">
                {editingVisa ? "Edit Visa" : "Add New Visa"}
              </h2>
            </div>

            <form onSubmit={saveVisa} className="px-8 pb-8 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Passport No</label>
                  <input
                    type="text"
                    value={formData.passport_no}
                    onChange={(e) => setFormData({ ...formData, passport_no: e.target.value.toUpperCase() })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Agent Name</label>
                  <input
                    type="text"
                    value={formData.agent_name}
                    onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Received Date</label>
                  <input
                    type="date"
                    value={formData.visa_issued}
                    onChange={(e) => setFormData({ ...formData, visa_issued: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visa Type</label>
                  <select
                    value={formData.visa_type}
                    onChange={(e) => setFormData({ ...formData, visa_type: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500"
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
                  checked={formData.manpower}
                  onChange={(e) => setFormData({ ...formData, manpower: e.target.checked })}
                  className="w-5 h-5 accent-blue-600"
                />
                <label className="font-medium text-gray-700">This is a Manpower Visa</label>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3.5 border border-gray-300 rounded-2xl font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-medium transition"
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