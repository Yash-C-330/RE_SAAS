"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Property = {
  id: string;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  unitsCount: number | null;
  type: string | null;
  units?: Array<{ id: string }>;
};

type ToastState = {
  type: "success" | "error";
  text: string;
};

const PAGE_SIZE = 5;

const EMPTY_FORM = {
  address: "",
  city: "",
  state: "",
  zip: "",
  unitsCount: "1",
  type: "single_family",
};

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/properties", { cache: "no-store" });
      const payload = await parseJsonSafe<Property[] | { error?: string }>(response);

      if (!response.ok) {
        const responseError = payload && "error" in payload ? payload.error : "Failed to load properties";
        throw new Error(responseError ?? "Failed to load properties");
      }

      setProperties(Array.isArray(payload) ? payload : []);
    } catch (fetchError) {
      const fetchErrorMessage = fetchError instanceof Error ? fetchError.message : "Failed to load properties";
      setError(fetchErrorMessage);
      setToast({ type: "error", text: fetchErrorMessage });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProperties();
  }, [fetchProperties]);

  const totalProperties = useMemo(() => properties.length, [properties]);
  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const typeMatch = typeFilter === "all" || (property.type ?? "") === typeFilter;
      if (!typeMatch) return false;

      const q = search.trim().toLowerCase();
      if (!q) return true;

      return [property.address, property.city ?? "", property.state ?? "", property.zip ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [properties, search, typeFilter]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredProperties.length / PAGE_SIZE));
  }, [filteredProperties.length]);

  const pagedProperties = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProperties.slice(start, start + PAGE_SIZE);
  }, [filteredProperties, page]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter]);

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
      const response = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: form.address,
          city: form.city || undefined,
          state: form.state || undefined,
          zip: form.zip || undefined,
          unitsCount: form.unitsCount || "1",
          type: form.type || undefined,
        }),
      });

      const payload = await parseJsonSafe<Property | { error?: string }>(response);

      if (!response.ok) {
        const responseError = payload && "error" in payload ? payload.error : "Failed to create property";
        throw new Error(responseError ?? "Failed to create property");
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      setMessage("Property created successfully.");
      showToast("success", "Property created successfully.");
      await fetchProperties();
    } catch (submitError) {
      const submitErrorMessage = submitError instanceof Error ? submitError.message : "Failed to create property";
      setError(submitErrorMessage);
      showToast("error", submitErrorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function startEdit(property: Property) {
    setEditingId(property.id);
    setForm({
      address: property.address,
      city: property.city ?? "",
      state: property.state ?? "",
      zip: property.zip ?? "",
      unitsCount: String(property.unitsCount ?? property.units?.length ?? 1),
      type: property.type ?? "single_family",
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
      const response = await fetch(`/api/properties/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: form.address,
          city: form.city,
          state: form.state,
          zip: form.zip,
          unitsCount: form.unitsCount,
          type: form.type,
        }),
      });

      const payload = await parseJsonSafe<Property | { error?: string }>(response);
      if (!response.ok) {
        const responseError = payload && "error" in payload ? payload.error : "Failed to update property";
        throw new Error(responseError ?? "Failed to update property");
      }

      setEditingId(null);
      setForm(EMPTY_FORM);
      setMessage("Property updated successfully.");
      showToast("success", "Property updated successfully.");
      await fetchProperties();
    } catch (updateError) {
      const updateErrorMessage = updateError instanceof Error ? updateError.message : "Failed to update property";
      setError(updateErrorMessage);
      showToast("error", updateErrorMessage);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(propertyId: string) {
    const shouldDelete = window.confirm("Delete this property? This cannot be undone.");
    if (!shouldDelete) return;

    setDeletingId(propertyId);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/properties/${propertyId}`, { method: "DELETE" });
      const payload = await parseJsonSafe<{ error?: string }>(response);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to delete property");
      }

      if (editingId === propertyId) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }

      setMessage("Property deleted successfully.");
      showToast("success", "Property deleted successfully.");
      await fetchProperties();
    } catch (deleteError) {
      const deleteErrorMessage = deleteError instanceof Error ? deleteError.message : "Failed to delete property";
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
          <h1 className="text-2xl font-bold text-[var(--ink-900)]">Properties</h1>
          <p className="mt-1 text-sm text-[var(--ink-500)]">Manage buildings, units, and occupancy profile.</p>
        </div>
        <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--ink-600)]">
          {totalProperties} {totalProperties === 1 ? "property" : "properties"}
        </span>
      </div>

      <form className="glass-card grid gap-4 p-6 md:grid-cols-2" onSubmit={handleSubmit}>
        <input
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm md:col-span-2"
          placeholder="Search by address, city, state, or ZIP"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm md:col-span-2"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option value="all">All property types</option>
          <option value="single_family">Single family</option>
          <option value="multi_family">Multi family</option>
          <option value="commercial">Commercial</option>
        </select>
        <input
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm md:col-span-2"
          placeholder="Property address"
          value={form.address}
          onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
          required
        />
        <input
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm"
          placeholder="City"
          value={form.city}
          onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
        />
        <input
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm"
          placeholder="State"
          value={form.state}
          onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value }))}
        />
        <input
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm"
          placeholder="ZIP"
          value={form.zip}
          onChange={(event) => setForm((prev) => ({ ...prev, zip: event.target.value }))}
        />
        <input
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm"
          type="number"
          min={1}
          placeholder="Units"
          value={form.unitsCount}
          onChange={(event) => setForm((prev) => ({ ...prev, unitsCount: event.target.value }))}
        />
        <select
          className="rounded-xl border border-white/40 bg-white/80 px-3 py-2 text-sm md:col-span-2"
          value={form.type}
          onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
        >
          <option value="single_family">Single family</option>
          <option value="multi_family">Multi family</option>
          <option value="commercial">Commercial</option>
        </select>
        <div className="md:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-[var(--mint-500)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--mint-600)] disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Save Property" : "+ Add Property"}
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
              {saving ? "Updating..." : "Update Property"}
            </button>
          ) : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        </div>
      </form>

      <div className="glass-card p-6">
        {loading ? <p className="text-sm text-[var(--ink-500)]">Loading properties...</p> : null}
        {!loading && filteredProperties.length === 0 ? (
          <p className="text-sm text-[var(--ink-500)]">No properties yet. Add your first address to unlock tenant and lease setup.</p>
        ) : null}
        {!loading && filteredProperties.length > 0 ? (
          <div className="grid gap-3">
            {pagedProperties.map((property) => (
              <div key={property.id} className="rounded-xl border border-white/40 bg-white/70 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--ink-900)]">{property.address}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void startEdit(property)}
                      className="rounded-lg border border-white/50 bg-white/80 px-2 py-1 text-xs font-semibold text-[var(--ink-700)]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(property.id)}
                      disabled={deletingId === property.id}
                      className="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {deletingId === property.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-[var(--ink-500)]">
                  {[property.city, property.state, property.zip].filter(Boolean).join(", ") || "Location not set"}
                </p>
                <p className="mt-1 text-xs text-[var(--ink-500)]">
                  Units: {property.unitsCount ?? property.units?.length ?? 0} | Type: {property.type ?? "n/a"}
                </p>
              </div>
            ))}

            <div className="mt-2 flex items-center justify-between rounded-xl border border-white/40 bg-white/70 px-3 py-2 text-xs text-[var(--ink-600)]">
              <span>
                Page {page} of {totalPages} ({filteredProperties.length} results)
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

