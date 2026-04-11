import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

/* ================= TYPES ================= */

type Candidate = {
  id: string;
  name: string;
  passport_no: string;
  received_date: string | null;
  agent_id?: string;
  agents?: { name: string };
};

type Visa = {
  id: string;
  visa_issued: string | null;
  expiry_date: string | null;
  manpower: boolean;
  candidate_id: string;
  agency: string | null;

  candidates?: {
    name: string;
    passport_no: string;
    agents?: { name: string };
  };

  agency?: {
    name: string;
  };
};

type Agent = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
};

type Agency = {
  id: string;
  name: string;
  contact?: string;
  address?: string;
};

/* ================= APP ================= */

export default function App() {
  const [tab, setTab] = useState("dashboard");

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [visas, setVisas] = useState<Visa[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  /* ================= FETCH ================= */

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cRes, vRes, aRes, agRes] = await Promise.all([
        supabase.from("candidates").select(`*, agents!agent_id (name)`),
        supabase
          .from("visas")
          .select(`
            *,
            candidates!candidate_id (
              name, passport_no,
              agents!agent_id (name)
            ),
            agency:agency (name)
          `)
          .order("visa_issued", { ascending: false }),
        supabase.from("agents").select("*"),
        supabase.from("agency").select("*"),
      ]);

      if (cRes.error) console.error("Candidates error:", cRes.error);
      if (vRes.error) console.error("Visas error:", vRes.error);
      if (aRes.error) console.error("Agents error:", aRes.error);
      if (agRes.error) console.error("Agency error:", agRes.error);

      setCandidates(cRes.data || []);
      setVisas(vRes.data || []);
      setAgents(aRes.data || []);
      setAgencies(agRes.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
      alert("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  /* ================= VISA OPERATIONS ================= */

  const [visaForm, setVisaForm] = useState({
    id: "",
    candidate_id: "",
    visa_issued: "",
    expiry_date: "",
    agency: "",
  });

  const resetVisaForm = () => {
    setVisaForm({
      id: "",
      candidate_id: "",
      visa_issued: "",
      expiry_date: "",
      agency: "",
    });
  };

  const addOrUpdateVisa = async () => {
    if (!visaForm.candidate_id) return alert("Please select a candidate");
    if (!visaForm.visa_issued) return alert("Please enter visa issue date");

    try {
      if (visaForm.id) {
        // Update
        const { error } = await supabase
          .from("visas")
          .update({
            candidate_id: visaForm.candidate_id,
            visa_issued: visaForm.visa_issued,
            expiry_date: visaForm.expiry_date || null,
            agency: visaForm.agency || null,
          })
          .eq("id", visaForm.id);

        if (error) throw error;
        alert("Visa updated ✅");
      } else {
        // Insert
        const { error } = await supabase.from("visas").insert([
          {
            candidate_id: visaForm.candidate_id,
            visa_issued: visaForm.visa_issued,
            expiry_date: visaForm.expiry_date || null,
            agency: visaForm.agency || null,
          },
        ]);

        if (error) throw error;
        alert("Visa added ✅");
      }
      resetVisaForm();
      fetchAll();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const editVisa = (visa: Visa) => {
    setVisaForm({
      id: visa.id,
      candidate_id: visa.candidate_id,
      visa_issued: visa.visa_issued || "",
      expiry_date: visa.expiry_date || "",
      agency: visa.agency || "",
    });
  };

  const deleteVisa = async (id: string) => {
    if (!confirm("Are you sure you want to delete this visa?")) return;

    try {
      const { error } = await supabase.from("visas").delete().eq("id", id);
      if (error) throw error;
      alert("Visa deleted ✅");
      fetchAll();
    } catch (error: any) {
      alert(error.message);
    }
  };

  /* ================= CANDIDATE OPERATIONS ================= */

  const [candidateForm, setCandidateForm] = useState({
    id: "",
    name: "",
    passport_no: "",
    received_date: "",
    agent_id: "",
  });

  const resetCandidateForm = () => {
    setCandidateForm({
      id: "",
      name: "",
      passport_no: "",
      received_date: "",
      agent_id: "",
    });
  };

  const addOrUpdateCandidate = async () => {
    if (!candidateForm.name) return alert("Please enter candidate name");
    if (!candidateForm.passport_no) return alert("Please enter passport number");

    try {
      if (candidateForm.id) {
        // Update
        const { error } = await supabase
          .from("candidates")
          .update({
            name: candidateForm.name,
            passport_no: candidateForm.passport_no,
            received_date: candidateForm.received_date || null,
            agent_id: candidateForm.agent_id || null,
          })
          .eq("id", candidateForm.id);

        if (error) throw error;
        alert("Candidate updated ✅");
      } else {
        // Insert
        const { error } = await supabase.from("candidates").insert([
          {
            name: candidateForm.name,
            passport_no: candidateForm.passport_no,
            received_date: candidateForm.received_date || null,
            agent_id: candidateForm.agent_id || null,
          },
        ]);

        if (error) throw error;
        alert("Candidate added ✅");
      }
      resetCandidateForm();
      fetchAll();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const editCandidate = (candidate: Candidate) => {
    setCandidateForm({
      id: candidate.id,
      name: candidate.name,
      passport_no: candidate.passport_no,
      received_date: candidate.received_date || "",
      agent_id: candidate.agent_id || "",
    });
  };

  const deleteCandidate = async (id: string) => {
    if (!confirm("Are you sure? This will also delete associated visas.")) return;

    try {
      const { error } = await supabase.from("candidates").delete().eq("id", id);
      if (error) throw error;
      alert("Candidate deleted ✅");
      fetchAll();
    } catch (error: any) {
      alert(error.message);
    }
  };

  /* ================= AGENT OPERATIONS ================= */

  const [agentForm, setAgentForm] = useState({
    id: "",
    name: "",
    phone: "",
    email: "",
  });

  const resetAgentForm = () => {
    setAgentForm({ id: "", name: "", phone: "", email: "" });
  };

  const addOrUpdateAgent = async () => {
    if (!agentForm.name) return alert("Please enter agent name");

    try {
      if (agentForm.id) {
        // Update
        const { error } = await supabase
          .from("agents")
          .update({
            name: agentForm.name,
            phone: agentForm.phone || null,
            email: agentForm.email || null,
          })
          .eq("id", agentForm.id);

        if (error) throw error;
        alert("Agent updated ✅");
      } else {
        // Insert
        const { error } = await supabase.from("agents").insert([
          {
            name: agentForm.name,
            phone: agentForm.phone || null,
            email: agentForm.email || null,
          },
        ]);

        if (error) throw error;
        alert("Agent added ✅");
      }
      resetAgentForm();
      fetchAll();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const editAgent = (agent: Agent) => {
    setAgentForm({
      id: agent.id,
      name: agent.name,
      phone: agent.phone || "",
      email: agent.email || "",
    });
  };

  const deleteAgent = async (id: string) => {
    if (!confirm("Are you sure? This may affect associated candidates.")) return;

    try {
      const { error } = await supabase.from("agents").delete().eq("id", id);
      if (error) throw error;
      alert("Agent deleted ✅");
      fetchAll();
    } catch (error: any) {
      alert(error.message);
    }
  };

  /* ================= AGENCY OPERATIONS ================= */

  const [agencyForm, setAgencyForm] = useState({
    id: "",
    name: "",
    contact: "",
    address: "",
  });

  const resetAgencyForm = () => {
    setAgencyForm({ id: "", name: "", contact: "", address: "" });
  };

  const addOrUpdateAgency = async () => {
    if (!agencyForm.name) return alert("Please enter agency name");

    try {
      if (agencyForm.id) {
        // Update
        const { error } = await supabase
          .from("agency")
          .update({
            name: agencyForm.name,
            contact: agencyForm.contact || null,
            address: agencyForm.address || null,
          })
          .eq("id", agencyForm.id);

        if (error) throw error;
        alert("Agency updated ✅");
      } else {
        // Insert
        const { error } = await supabase.from("agency").insert([
          {
            name: agencyForm.name,
            contact: agencyForm.contact || null,
            address: agencyForm.address || null,
          },
        ]);

        if (error) throw error;
        alert("Agency added ✅");
      }
      resetAgencyForm();
      fetchAll();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const editAgency = (agency: Agency) => {
    setAgencyForm({
      id: agency.id,
      name: agency.name,
      contact: agency.contact || "",
      address: agency.address || "",
    });
  };

  const deleteAgency = async (id: string) => {
    if (!confirm("Are you sure? This may affect associated visas.")) return;

    try {
      const { error } = await supabase.from("agency").delete().eq("id", id);
      if (error) throw error;
      alert("Agency deleted ✅");
      fetchAll();
    } catch (error: any) {
      alert(error.message);
    }
  };

  /* ================= FILTERING ================= */

  const filteredCandidates = candidates.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.passport_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredVisas = visas.filter(
    (v) =>
      v.candidates?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.candidates?.passport_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAgents = agents.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAgencies = agencies.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ================= DASHBOARD STATS ================= */

  const activeVisas = visas.filter((v) => {
    if (!v.expiry_date) return true;
    return new Date(v.expiry_date) > new Date();
  }).length;

  const expiredVisas = visas.filter((v) => {
    if (!v.expiry_date) return false;
    return new Date(v.expiry_date) <= new Date();
  }).length;

  const expiringVisas = visas.filter((v) => {
    if (!v.expiry_date) return false;
    const expiry = new Date(v.expiry_date);
    const today = new Date();
    const daysUntilExpiry = Math.floor(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  });

  /* ================= UI ================= */

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      {/* SIDEBAR */}
      <div className="w-64 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 space-y-2 border-r border-zinc-800 shadow-xl">
        <h1 className="text-2xl font-bold mb-8 text-blue-400">Visa Manager</h1>
        {["dashboard", "candidates", "visas", "agents", "agency"].map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setSearchTerm("");
            }}
            className={`block w-full text-left p-3 rounded-lg font-medium transition-all capitalize ${
              tab === t
                ? "bg-blue-600 shadow-lg shadow-blue-600/50"
                : "hover:bg-zinc-800 hover:translate-x-1"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-8 overflow-auto">
        {/* DASHBOARD */}
        {tab === "dashboard" && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Dashboard Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-xl shadow-lg">
                <div className="text-sm opacity-90">Total Candidates</div>
                <div className="text-4xl font-bold mt-2">{candidates.length}</div>
              </div>

              <div className="bg-gradient-to-br from-green-600 to-green-700 p-6 rounded-xl shadow-lg">
                <div className="text-sm opacity-90">Active Visas</div>
                <div className="text-4xl font-bold mt-2">{activeVisas}</div>
              </div>

              <div className="bg-gradient-to-br from-yellow-600 to-yellow-700 p-6 rounded-xl shadow-lg">
                <div className="text-sm opacity-90">Expiring Soon (30d)</div>
                <div className="text-4xl font-bold mt-2">{expiringVisas.length}</div>
              </div>

              <div className="bg-gradient-to-br from-red-600 to-red-700 p-6 rounded-xl shadow-lg">
                <div className="text-sm opacity-90">Expired Visas</div>
                <div className="text-4xl font-bold mt-2">{expiredVisas}</div>
              </div>

              <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-6 rounded-xl shadow-lg">
                <div className="text-sm opacity-90">Total Agents</div>
                <div className="text-4xl font-bold mt-2">{agents.length}</div>
              </div>

              <div className="bg-gradient-to-br from-pink-600 to-pink-700 p-6 rounded-xl shadow-lg">
                <div className="text-sm opacity-90">Total Agencies</div>
                <div className="text-4xl font-bold mt-2">{agencies.length}</div>
              </div>
            </div>

            {/* EXPIRING VISAS ALERT */}
            {expiringVisas.length > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 text-yellow-400">
                  ⚠️ Visas Expiring Soon
                </h3>
                <div className="space-y-2">
                  {expiringVisas.slice(0, 5).map((v) => {
                    const daysLeft = Math.floor(
                      (new Date(v.expiry_date!).getTime() - new Date().getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                    return (
                      <div
                        key={v.id}
                        className="bg-yellow-900/20 p-3 rounded flex justify-between items-center"
                      >
                        <span>
                          {v.candidates?.name} ({v.candidates?.passport_no})
                        </span>
                        <span className="text-yellow-300 font-bold">
                          {daysLeft} days left
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CANDIDATES */}
        {tab === "candidates" && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Candidates Management</h2>

            {/* ADD/EDIT FORM */}
            <div className="bg-zinc-900 p-6 rounded-lg mb-6 shadow-xl">
              <h3 className="text-xl font-bold mb-4">
                {candidateForm.id ? "Edit Candidate" : "Add New Candidate"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <input
                  type="text"
                  placeholder="Name *"
                  value={candidateForm.name}
                  onChange={(e) =>
                    setCandidateForm({ ...candidateForm, name: e.target.value })
                  }
                  className="bg-zinc-800 p-3 rounded border border-zinc-700 focus:border-blue-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="Passport Number *"
                  value={candidateForm.passport_no}
                  onChange={(e) =>
                    setCandidateForm({ ...candidateForm, passport_no: e.target.value })
                  }
                  className="bg-zinc-800 p-3 rounded border border-zinc-700 focus:border-blue-500 outline-none"
                />
                <input
                  type="date"
                  placeholder="Received Date"
                  value={candidateForm.received_date}
                  onChange={(e) =>
                    setCandidateForm({ ...candidateForm, received_date: e.target.value })
                  }
                  className="bg-zinc-800 p-3 rounded border border-zinc-700 focus:border-blue-500 outline-none"
                />
                <select
                  value={candidateForm.agent_id}
                  onChange={(e) =>
                    setCandidateForm({ ...candidateForm, agent_id: e.target.value })
                  }
                  className="bg-zinc-800 p-3 rounded border border-zinc-700 focus:border-blue-500 outline-none"
                >
                  <option value="">Select Agent</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    onClick={addOrUpdateCandidate}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded font-bold transition"
                  >
                    {candidateForm.id ? "Update" : "Add"}
                  </button>
                  {candidateForm.id && (
                    <button
                      onClick={resetCandidateForm}
                      className="bg-zinc-700 hover:bg-zinc-600 px-4 py-3 rounded transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SEARCH */}
            <input
              type="text"
              placeholder="🔍 Search by name or passport..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-800 p-3 rounded mb-4 border border-zinc-700 focus:border-blue-500 outline-none"
            />

            {/* TABLE */}
            <div className="bg-zinc-900 rounded-lg overflow-hidden shadow-xl">
              <table className="w-full">
                <thead className="bg-zinc-800">
                  <tr>
                    <th className="p-4 text-left">Name</th>
                    <th className="p-4 text-left">Passport</th>
                    <th className="p-4 text-left">Received Date</th>
                    <th className="p-4 text-left">Agent</th>
                    <th className="p-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-500">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-zinc-500">
                        No candidates found
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((c) => (
                      <tr key={c.id} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                        <td className="p-4">{c.name}</td>
                        <td className="p-4">{c.passport_no}</td>
                        <td className="p-4">{c.received_date || "-"}</td>
                        <td className="p-4">{c.agents?.name || "-"}</td>
                        <td className="p-4">
                          <button
                            onClick={() => editCandidate(c)}
                            className="text-blue-400 hover:text-blue-300 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteCandidate(c.id)}
                            className="text-red-400 hover:text-red-300"
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

        {/* VISAS */}
        {tab === "visas" && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Visas Management</h2>

            {/* ADD/EDIT FORM */}
            <div className="bg-zinc-900 p-6 rounded-lg mb-6 shadow-xl">
              <h3 className="text-xl font-bold mb-4">
                {visaForm.id ? "Edit Visa" : "Add New Visa"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <select
                  value={visaForm.candidate_id}
                  onChange={(e) => setVisaForm({ ...visaForm, candidate_id: e.target.value })}
                  className="bg-zinc-800 p-3 rounded border border-zinc-700 focus:border-blue-500 outline-none"
                >
                  <option value="">Select Candidate *</option>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.passport_no}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  placeholder="Issue Date"
                  value={visaForm.visa_issued}
                  onChange={(e) => setVisaForm({ ...visaForm, visa_issued: e.target.value })}
                  className="bg-zinc-800 p-3 rounded border border-zinc-700 focus:border-blue-500 outline-none"
                />

                <input
                  type="date"
                  placeholder="Expiry Date"
                  value={visaForm.expiry_date}
                  onChange={(e) => setVisaForm({ ...visaForm, expiry_date: e.target.value })}
                  className="bg-zinc-800 p-3 rounded border border-zinc-700 focus:border-blue-500 outline-none"
                />

                <select
                  value={visaForm.agency}
                  onChange={(e) => setVisaForm({ ...visaForm, agency: e.target.value })}
                  className="bg-zinc-800 p-3 rounded border border-zinc-700 focus:border-blue-500 outline-none"
                >
                  <option value="">Select Agency</option>
                  {agencies.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button
                    onClick={addOrUpdateVisa}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded font-bold transition"
                  >
                    {visaForm.id ? "Update" : "Add"}
                  </button>
                  {visaForm.id && (
                    <button
                      onClick={resetVisaForm}
                      className="bg-zinc-700 hover:bg-zinc-600 px-4 py-3 rounded transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SEARCH */}
            <input
              type="text"
              placeholder="🔍 Search by name or passport..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-800 p-3 rounded mb-4 border border-zinc-700 focus:border-blue-500 outline-none"
            />

            {/* TABLE */}
            <div className="bg-zinc-900 rounded-lg overflow-hidden shadow-xl">
              <table className="w-full">
                <thead className="bg-zinc-800">
                  <tr>
                    <th className="p-4 text-left">Name</th>
                    <th className="p-4 text-left">Passport</th>
                    <th className="p-4 text-left">Agent</th>
                    <th className="p-4 text-left">Agency</th>
                    <th className="p-4 text-left">Issue Date</th>
                    <th className="p-4 text-left">Expiry Date</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-zinc-500">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredVisas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-zinc-500">
                        No visas found
                      </td>
                    </tr>
                  ) : (
                    filteredVisas.map((v) => {
                      const isExpired =
                        v.expiry_date && new Date(v.expiry_date) <= new Date();
                      const daysUntilExpiry = v.expiry_date
                        ? Math.floor(
                            (new Date(v.expiry_date).getTime() - new Date().getTime()) /
                              (1000 * 60 * 60 * 24)
                          )
                        : null;
                      const isExpiringSoon =
                        daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30;

                      return (
                        <tr key={v.id} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                          <td className="p-4">{v.candidates?.name || "-"}</td>
                          <td className="p-4">{v.candidates?.passport_no || "-"}</td>
                          <td className="p-4">{v.candidates?.agents?.name || "-"}</td>
                          <td className="p-4">{v.agency?.name || "-"}</td>
                          <td className="p-4">{v.visa_issued || "-"}</td>
                          <td className="p-4">{v.expiry_date || "-"}</td>
                          <td className="p-4">
                            {isExpired ? (
                              <span className="bg-red-600/20 text-red-400 px-3 py-1 rounded-full text-sm">
                                Expired
                              </span>
                            ) : isExpiringSoon ? (
                              <span className="bg-yellow-600/20 text-yellow-400 px-3 py-1 rounded-full text-sm">
                                Expiring ({daysUntilExpiry}d)
                              </span>
                            ) : (
                              <span className="bg-green-600/20 text-green-400 px-3 py-1 rounded-full text-sm">
                                Active
                              </span>
                            )}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => editVisa(v)}
                              className="text-blue-400 hover:text-blue-300 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteVisa(v.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AGENTS */}
        {tab === "agents" && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Agents Management</h2>

            {/* ADD/EDIT FORM */}
            <div className="bg-zinc-900 p-6 rounded-lg mb-6 shadow-xl">
              <h3 className="text-xl font-bold mb-4">
                {agentForm.id ? "Edit Agent" : "Add New Agent"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Agent Name *"
                  value={agentForm.name}
                  onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                  className="bg-zinc-800 p-3 rounded border border-zinc-700 focus:border-blue-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="Phone"
                  value={agentForm.phone}
                  onChange={(e) => setAgentForm({ ...agentForm, phone: e.target.value })}
                  className="bg-zinc-800 p-3 rounded border border-zinc-700 focus:border-blue-500 outline-none"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={agentForm.email}
                  onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
                  className="bg-zinc-800 p-3 rounded border border-zinc-700 focus:border-blue-500 outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addOrUpdateAgent}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded font-bold transition"
                  >
                    {agentForm.id ? "Update" : "Add"}
                  </button>
                  {agentForm.id && (
                    <button
                      onClick={resetAgentForm}
                      className="bg-zinc-700 hover:bg-zinc-600 px-4 py-3 rounded transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SEARCH */}
            <input
              type="text"
              placeholder="🔍 Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-800 p-3 rounded mb-4 border border-zinc-700 focus:border-blue-500 outline-none"
            />

            {/* TABLE */}
            <div className="bg-zinc-900 rounded-lg overflow-hidden shadow-xl">
              <table className="w-full">
                <thead className="bg-zinc-800">
                  <tr>
                    <th className="p-4 text-left">Name</th>
                    <th className="p-4 text-left">Phone</th>
                    <th className="p-4 text-left">Email</th>
                    <th className="p-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-500">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredAgents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-500">
                        No agents found
                      </td>
                    </tr>
                  ) : (
                    filteredAgents.map((a) => (
                      <tr key={a.id} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                        <td className="p-4">{a.name}</td>
                        <td className="p-4">{a.phone || "-"}</td>
                        <td className="p-4">{a.email || "-"}</td>
                        <td className="p-4">
                          <button
                            onClick={() => editAgent(a)}
                            className="text-blue-400 hover:text-blue-300 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteAgent(a.id)}
                            className="text-red-400 hover:text-red-300"
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

        {/* AGENCY */}
        {tab === "agency" && (
          <div>
            <h2 className="text-3xl font-bold mb-6">Agency Management</h2>

            {/* ADD/EDIT FORM */}
            <div className="bg-zinc-900 p-6 rounded-lg mb-6 shadow-xl">
              <h3 className="text-xl font-bold mb-4">
                {agencyForm.id ? "Edit Agency" : "Add New Agency"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Agency Name *"
                  value={agencyForm.name}
                  onChange={(e) => setAgencyForm({ ...agencyForm, name: e.target.value })}
                  className="bg-zinc-800 p-3 rounded border border-zinc-700 focus:border-blue-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="Contact"
                  value={agencyForm.contact}
                  onChange={(e) => setAgencyForm({ ...agencyForm, contact: e.target.value })}
                  className="bg-zinc-800 p-3 rounded border border-zinc-700 focus:border-blue-500 outline-none"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={agencyForm.address}
                  onChange={(e) => setAgencyForm({ ...agencyForm, address: e.target.value })}
                  className="bg-zinc-800 p-3 rounded border border-zinc-700 focus:border-blue-500 outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addOrUpdateAgency}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded font-bold transition"
                  >
                    {agencyForm.id ? "Update" : "Add"}
                  </button>
                  {agencyForm.id && (
                    <button
                      onClick={resetAgencyForm}
                      className="bg-zinc-700 hover:bg-zinc-600 px-4 py-3 rounded transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* SEARCH */}
            <input
              type="text"
              placeholder="🔍 Search agencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-800 p-3 rounded mb-4 border border-zinc-700 focus:border-blue-500 outline-none"
            />

            {/* TABLE */}
            <div className="bg-zinc-900 rounded-lg overflow-hidden shadow-xl">
              <table className="w-full">
                <thead className="bg-zinc-800">
                  <tr>
                    <th className="p-4 text-left">Name</th>
                    <th className="p-4 text-left">Contact</th>
                    <th className="p-4 text-left">Address</th>
                    <th className="p-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-500">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredAgencies.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-zinc-500">
                        No agencies found
                      </td>
                    </tr>
                  ) : (
                    filteredAgencies.map((a) => (
                      <tr key={a.id} className="border-t border-zinc-800 hover:bg-zinc-800/50">
                        <td className="p-4">{a.name}</td>
                        <td className="p-4">{a.contact || "-"}</td>
                        <td className="p-4">{a.address || "-"}</td>
                        <td className="p-4">
                          <button
                            onClick={() => editAgency(a)}
                            className="text-blue-400 hover:text-blue-300 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteAgency(a.id)}
                            className="text-red-400 hover:text-red-300"
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
    </div>
  );
}