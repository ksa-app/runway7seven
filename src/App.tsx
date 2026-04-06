import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

/* ================= TYPES ================= */

type Candidate = {
  id: string;
  name: string;
  passport_no: string;
  received_date: string | null;
  agents?: { name: string };
};

type Visa = {
  id: string;
  visa_issu: string | null;
  expiry_date: string | null;
  manpower: boolean;

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
};

type Agency = {
  id: string;
  name: string;
};

/* ================= APP ================= */

export default function App() {
  const [tab, setTab] = useState("dashboard");

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [visas, setVisas] = useState<Visa[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);

  const [loading, setLoading] = useState(false);

  /* ================= FETCH ================= */

  const fetchAll = async () => {
    setLoading(true);

    const [cRes, vRes, aRes, agRes] = await Promise.all([
      supabase
        .from("candidates")
        .select(`*, agents!agent_id (name)`),

      supabase
        .from("visas")
        .select(`
          *,
          candidates!candidate_id (
            name, passport_no,
            agents!agent_id (name)
          ),
          agency!agency (name)
        `)
        .order("visa_issu", { ascending: false }),

      supabase.from("agents").select("*"),
      supabase.from("agency").select("*"),
    ]);

    if (vRes.error) console.log(vRes.error);

    setCandidates(cRes.data || []);
    setVisas(vRes.data || []);
    setAgents(aRes.data || []);
    setAgencies(agRes.data || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  /* ================= ADD ================= */

  const [form, setForm] = useState({
    candidate_id: "",
    visa_issu: "",
    expiry_date: "",
    agency: "",
  });

  const addVisa = async () => {
    if (!form.candidate_id) return alert("Select candidate");

    const { error } = await supabase.from("visas").insert([
      {
        candidate_id: form.candidate_id,
        visa_issu: form.visa_issu,
        expiry_date: form.expiry_date || null,
        agency: form.agency || null,
      },
    ]);

    if (error) alert(error.message);
    else {
      alert("Added ✅");
      fetchAll();
    }
  };

  const deleteVisa = async (id: string) => {
    await supabase.from("visas").delete().eq("id", id);
    fetchAll();
  };

  /* ================= UI ================= */

  return (
    <div className="flex h-screen bg-black text-white">

      {/* SIDEBAR */}
      <div className="w-60 bg-zinc-900 p-5 space-y-2">
        {["dashboard","candidates","visas","agents","agency"].map(t => (
          <button key={t}
            onClick={()=>setTab(t)}
            className={`block w-full text-left p-3 rounded ${tab===t?"bg-blue-600":"hover:bg-zinc-800"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-6 overflow-auto">

        {/* DASHBOARD */}
        {tab==="dashboard" && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-zinc-800 p-6 rounded">Candidates: {candidates.length}</div>
            <div className="bg-zinc-800 p-6 rounded">Visas: {visas.length}</div>
            <div className="bg-zinc-800 p-6 rounded">Agents: {agents.length}</div>
          </div>
        )}

        {/* CANDIDATES */}
        {tab==="candidates" && (
          <table className="w-full">
            <thead className="bg-zinc-800">
              <tr>
                <th className="p-3">Name</th>
                <th>Passport</th>
                <th>Agent</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map(c=>(
                <tr key={c.id} className="border-t">
                  <td className="p-3">{c.name}</td>
                  <td>{c.passport_no}</td>
                  <td>{c.agents?.name || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* VISAS */}
        {tab==="visas" && (
          <>
            <div className="mb-4 flex gap-2">
              <select onChange={e=>setForm({...form,candidate_id:e.target.value})} className="bg-zinc-800 p-2">
                <option value="">Candidate</option>
                {candidates.map(c=>(
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <input type="date" onChange={e=>setForm({...form,visa_issu:e.target.value})} className="bg-zinc-800 p-2"/>
              <input type="date" onChange={e=>setForm({...form,expiry_date:e.target.value})} className="bg-zinc-800 p-2"/>

              <select onChange={e=>setForm({...form,agency:e.target.value})} className="bg-zinc-800 p-2">
                <option value="">Agency</option>
                {agencies.map(a=>(
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>

              <button onClick={addVisa} className="bg-blue-600 px-4">Add</button>
            </div>

            <table className="w-full">
              <thead className="bg-zinc-800">
                <tr>
                  <th className="p-3">Name</th>
                  <th>Passport</th>
                  <th>Agent</th>
                  <th>Agency</th>
                  <th>Issued</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-6 text-center">Loading...</td></tr>
                ) : visas.map(v=>(
                  <tr key={v.id} className="border-t">
                    <td className="p-3">{v.candidates?.name}</td>
                    <td>{v.candidates?.passport_no}</td>
                    <td>{v.candidates?.agents?.name || "-"}</td>
                    <td>{v.agency?.name || "-"}</td>
                    <td>{v.visa_issu}</td>
                    <td>
                      <button onClick={()=>deleteVisa(v.id)} className="text-red-400">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* AGENTS */}
        {tab==="agents" && (
          <ul>
            {agents.map(a=>(
              <li key={a.id}>{a.name}</li>
            ))}
          </ul>
        )}

        {/* AGENCY */}
        {tab==="agency" && (
          <ul>
            {agencies.map(a=>(
              <li key={a.id}>{a.name}</li>
            ))}
          </ul>
        )}

      </div>
    </div>
  );
}