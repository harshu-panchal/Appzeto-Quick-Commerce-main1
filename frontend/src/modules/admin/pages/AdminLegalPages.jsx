import React, { useCallback, useEffect, useState } from "react";
import { FileText, Loader2, Save, ScrollText } from "lucide-react";
import Card from "@shared/components/ui/Card";
import Button from "@shared/components/ui/Button";
import PageHeader from "@shared/components/ui/PageHeader";
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
    <div className="max-w-5xl space-y-5">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <ScrollText className="text-primary" size={22} />
            Legal Pages
          </span>
        }
        description="Edit Terms, Privacy, About, and Support instructions for each app audience."
        actions={
          <Button onClick={handleSave} disabled={saving || loading} isLoading={saving}>
            {!saving && <Save size={16} />}
            Save
          </Button>
        }
      />

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50/40 p-4">
          {AUDIENCES.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAudience(a.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all",
                audience === a.id
                  ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-slate-600",
              )}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 pt-4">
          {PAGE_TYPES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPageType(p.id)}
              className={cn(
                "rounded-t-lg border-b-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest transition-all",
                pageType === p.id
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-transparent text-slate-400 hover:text-slate-600",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="space-y-5 p-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="animate-spin text-slate-400" size={24} />
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Page title
                </label>
                <div className="relative">
                  <FileText
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    className="h-11 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3.5 text-sm font-semibold text-slate-900 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. Terms & Conditions"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
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
                  <p className="mb-2 text-xs font-medium text-slate-500">
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
