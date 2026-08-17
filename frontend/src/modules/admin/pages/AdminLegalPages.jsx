import React, { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Save, ScrollText } from "lucide-react";
import Card from "@shared/components/ui/Card";
import { cn } from "@/lib/utils";
import { useToast } from "@shared/components/ui/Toast";
import { adminApi } from "../services/adminApi";
import LegalRichTextEditor from "../components/LegalRichTextEditor";

const AUDIENCES = [
  { id: "customer", label: "Customer" },
  { id: "seller", label: "Seller" },
  { id: "delivery", label: "Delivery" },
];

const PAGE_TYPES = [
  { id: "terms", label: "Terms" },
  { id: "privacy", label: "Privacy" },
  { id: "about", label: "About" },
  { id: "support", label: "Support" },
];

const AdminLegalPages = () => {
  const { showToast } = useToast();
  const [audience, setAudience] = useState("customer");
  const [pageType, setPageType] = useState("terms");
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getLegalPage(audience, pageType);
      const data = res.data?.result ?? res.data;
      setTitle(data?.title || "");
      setContentHtml(data?.contentHtml || "");
      setUpdatedAt(data?.updatedAt || null);
    } catch (err) {
      console.error(err);
      showToast("Failed to load legal page", "error");
      setTitle("");
      setContentHtml("");
      setUpdatedAt(null);
    } finally {
      setLoading(false);
    }
  }, [audience, pageType, showToast]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const handleSave = async () => {
    if (!title.trim()) {
      showToast("Title is required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await adminApi.upsertLegalPage(audience, pageType, {
        title: title.trim(),
        contentHtml,
      });
      const data = res.data?.result ?? res.data;
      setUpdatedAt(data?.updatedAt || new Date().toISOString());
      showToast("Legal page saved", "success");
    } catch (err) {
      console.error(err);
      showToast(
        err?.response?.data?.message || "Failed to save legal page",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ScrollText className="text-primary" size={28} />
            Legal Pages
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Edit Terms, Privacy, About, and Support instructions for each app
            audience.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || loading}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          Save
        </button>
      </div>

      <Card className="border-none shadow-xl ring-1 ring-slate-100 bg-white rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-50 bg-slate-50/40 flex flex-wrap gap-2">
          {AUDIENCES.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAudience(a.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                audience === a.id
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="px-4 pt-4 flex flex-wrap gap-2 border-b border-slate-50">
          {PAGE_TYPES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPageType(p.id)}
              className={cn(
                "px-4 py-2.5 rounded-t-xl text-xs font-black uppercase tracking-widest border-b-2 transition-all",
                pageType === p.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-slate-400 hover:text-slate-600",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-16 flex justify-center">
              <Loader2 className="animate-spin text-slate-400" size={28} />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Page title
                </label>
                <div className="relative">
                  <FileText
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-brand-500/10"
                    placeholder="e.g. Terms & Conditions"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Content
                  </label>
                  {updatedAt && (
                    <span className="text-[10px] font-bold text-slate-400">
                      Last updated{" "}
                      {new Date(updatedAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  )}
                </div>
                {pageType === "support" && (
                  <p className="text-xs font-medium text-slate-500 mb-2">
                    Support content is shown as instructions on Help &amp;
                    Support screens. FAQs are managed separately under FAQs.
                  </p>
                )}
                <LegalRichTextEditor
                  key={`${audience}-${pageType}`}
                  value={contentHtml}
                  onChange={setContentHtml}
                />
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default AdminLegalPages;
