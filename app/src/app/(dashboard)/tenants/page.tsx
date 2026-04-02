"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Tenant = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  creditScore: number | null;
  annualIncome: string | null;
  status: string | null;
};

type ToastState = {
  type: "success" | "error";
  text: string;
};

const PAGE_SIZE = 5;

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  creditScore: "",
  annualIncome: "",
  status: "applicant",
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tenants", { cache: "no-store" });
      const payload = (await response.json()) as Tenant[] | { error?: string };

      if (!response.ok) {
        const responseError = "error" in payload ? payload.error : "Failed to load tenants";
        throw new Error(responseError ?? "Failed to load tenants");
      }

      setTenants(Array.isArray(payload) ? payload : []);
    } catch (fetchError) {
      const fetchErrorMessage = fetchError instanceof Error ? fetchError.message : "Failed to load tenants";
      setError(fetchErrorMessage);
      setToast({ type: "error", text: fetchErrorMessage });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTenants();
  }, [fetchTenants]);

  const tenantsCount = useMemo(() => tenants.length, [tenants]);
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const statusMatch = statusFilter === "all" || (tenant.status ?? "applicant") === statusFilter;
      if (!statusMatch) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;

      return [tenant.name, tenant.email ?? "", tenant.phone ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [tenants, search, statusFilter]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredTenants.length / PAGE_SIZE));
  }, [filteredTenants.length]);

  const pagedTenants = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredTenants.slice(start, start + PAGE_SIZE);
  }, [filteredTenants, page]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function showToast(type: ToastState["type"], text: string) {
    setToast({ type, text });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          creditScore: form.creditScore || undefined,
          annualIncome: form.annualIncome || undefined,
          status: form.status,
        }),
      });

      const payload = (await response.json()) as Tenant | { error?: string };
      if (!response.ok) {
        const responseError = "error" in payload ? payload.error : "Failed to create tenant";
        throw new Error(responseError ?? "Failed to create tenant");
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      setMessage("Tenant created successfully.");
      showToast("success", "Tenant created successfully.");
      await fetchTenants();
    } catch (submitError) {
      const submitErrorMessage = submitError instanceof Error ? submitError.message : "Failed to create tenant";
      setError(submitErrorMessage);
      showToast("error", submitErrorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function startEdit(tenant: Tenant) {
    setEditingId(tenant.id);
    setForm({
      name: tenant.name,
      email: tenant.email ?? "",
      phone: tenant.phone ?? "",
      creditScore: tenant.creditScore !== null ? String(tenant.creditScore) : "",
      annualIncome: tenant.annualIncome ?? "",
      status: tenant.status ?? "applicant",
    });
    setError(null);
    setMessage(null);
  }

  async function handleUpdate() {
    if (!editingId) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/tenants/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || "",
          creditScore: form.creditScore || "",
          annualIncome: form.annualIncome || "",
          status: form.status,
        }),
      });

      const payload = (await response.json()) as Tenant | { error?: string };
      if (!response.ok) {
        const responseError = "error" in payload ? payload.error : "Failed to update tenant";
        throw new Error(responseError ?? "Failed to update tenant");
      }

      setEditingId(null);
      setForm(EMPTY_FORM);
      setMessage("Tenant updated successfully.");
      showToast("success", "Tenant updated successfully.");
      await fetchTenants();
    } catch (updateError) {
      const updateErrorMessage = updateError instanceof Error ? updateError.message : "Failed to update tenant";
      setError(updateErrorMessage);
      showToast("error", updateErrorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(tenantId: string) {
    const shouldDelete = window.confirm("Delete this tenant? This cannot be undone.");
    if (!shouldDelete) return;

    setDeletingId(tenantId);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/tenants/${tenantId}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete tenant");
      }

      if (editingId === tenantId) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }

      setMessage("Tenant deleted successfully.");
      showToast("success", "Tenant deleted successfully.");
      await fetchTenants();
    } catch (deleteError) {
      const deleteErrorMessage = deleteError instanceof Error ? deleteError.message : "Failed to delete tenant";
      setError(deleteErrorMessage);
      showToast("error", deleteErrorMessage);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="fixed right-4 top-4 z-50">
          <div
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-lg ${
              toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
            }`}
          >
            {toast.text}
          </div>
        </div>
      ) : null}

      <div className="glass-card flex items-center justify-between p-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--ink-900)]">Tenants</h1>
          <p className="mt-1 text-sm text-[var(--ink-500)]">Track tenant records, contact channels, and lease alignment.</p>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--ink-600)]">
          {tenantsCount} {tenantsCount === 1 ? "tenant" : "tenants"}
        </span>
      </div>

      <form className="glass-card grid gap-4 p-6 md:grid-cols-2" onSubmit={handleSubmit}>
        <input
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm md:col-span-2"
          placeholder="Search by name, email, or phone"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm md:col-span-2"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="applicant">Applicant</option>
          <option value="active">Active</option>
          <option value="past">Past</option>
        </select>
        <input
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm"
          placeholder="Tenant name"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          required
        />
        <input
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          required
        />
        <input
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm"
          placeholder="Phone"
          value={form.phone}
          onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
        />
        <input
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm"
          placeholder="Credit score"
          type="number"
          min={300}
          max={850}
          value={form.creditScore}
          onChange={(event) => setForm((prev) => ({ ...prev, creditScore: event.target.value }))}
        />
        <input
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm"
          placeholder="Annual income"
          type="number"
          min={0}
          step="0.01"
          value={form.annualIncome}
          onChange={(event) => setForm((prev) => ({ ...prev, annualIncome: event.target.value }))}
        />
        <select
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm"
          value={form.status}
          onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
        >
          <option value="applicant">Applicant</option>
          <option value="active">Active</option>
          <option value="past">Past</option>
        </select>
        <div className="md:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[var(--mint-500)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--mint-600)] disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Save Tenant" : "+ Add Tenant"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
              className="rounded-xl border border-white/50 bg-white/70 px-4 py-2 text-sm font-semibold text-[var(--ink-700)]"
            >
              Cancel Edit
            </button>
          ) : null}
          {editingId ? (
            <button
              type="button"
              onClick={handleUpdate}
              disabled={saving}
              className="rounded-xl bg-[var(--ink-700)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Updating..." : "Update Tenant"}
            </button>
          ) : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>
      </form>

      <div className="glass-card p-6">
        {loading ? <p className="text-sm text-[var(--ink-500)]">Loading tenants...</p> : null}
        {!loading && filteredTenants.length === 0 ? (
          <p className="text-sm text-[var(--ink-500)]">No tenants yet. Create a tenant profile to get started.</p>
        ) : null}
        {!loading && filteredTenants.length > 0 ? (
          <div className="grid gap-3">
            {pagedTenants.map((tenant) => (
              <div key={tenant.id} className="rounded-xl border border-white/40 bg-white/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--ink-900)]">{tenant.name}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void startEdit(tenant)}
                      className="rounded-lg border border-white/50 bg-white/80 px-2 py-1 text-xs font-semibold text-[var(--ink-700)]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(tenant.id)}
                      disabled={deletingId === tenant.id}
                      className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {deletingId === tenant.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-500)]">
                  {tenant.email ?? "No email"} | {tenant.phone ?? "No phone"}
                </p>
                <p className="mt-1 text-xs text-[var(--ink-500)]">
                  Status: {tenant.status ?? "applicant"} | Credit: {tenant.creditScore ?? "N/A"} | Income: {tenant.annualIncome ?? "N/A"}
                </p>
              </div>
            ))}

            <div className="mt-2 flex items-center justify-between rounded-xl border border-white/40 bg-white/70 px-3 py-2 text-xs text-[var(--ink-600)]">
              <span>
                Page {page} of {totalPages} ({filteredTenants.length} results)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-white/50 bg-white/80 px-2 py-1 font-semibold disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                  className="rounded-lg border border-white/50 bg-white/80 px-2 py-1 font-semibold disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

