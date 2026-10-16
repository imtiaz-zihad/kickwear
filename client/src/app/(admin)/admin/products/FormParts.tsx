"use client";
/* eslint-disable @next/next/no-img-element */

import { ArrowUp, Loader2, Plus, Upload, X } from "lucide-react";
import { UPLOAD_ENABLED, field } from "./lib";
import type { FormState, SetField } from "./lib";

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">
      {children}
    </label>
  );
}

export function ErrorText({ children }: { children?: string }) {
  return children ? (
    <p role="alert" className="mt-1.5 text-sm text-red-600">
      {children}
    </p>
  ) : null;
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-5.5" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}


export function ImagesSection({
  images,
  uploading,
  error,
  onChange,
  onUpload,
}: {
  images: string[];
  uploading: boolean;
  error?: string;
  onChange: (images: string[]) => void;
  onUpload: (files: FileList | null) => void;
}) {
  const setImage = (i: number, url: string) =>
    onChange(images.map((u, idx) => (idx === i ? url : u)));

  const removeImage = (i: number) => {
    const next = images.filter((_, idx) => idx !== i);
    onChange(next.length ? next : [""]);
  };

  const moveImageUp = (i: number) => {
    if (i === 0) return;
    const next = [...images];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  };

  return (
    <Section title="Images">
      <div className="space-y-2">
        {images.map((url, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-secondary">
              {url.trim() && <img src={url} alt="" className="h-full w-full object-cover" />}
              {i === 0 && url.trim() && (
                <span className="absolute inset-x-0 bottom-0 bg-black/60 text-center text-[9px] font-semibold text-white">
                  MAIN
                </span>
              )}
            </div>
            <input
              value={url}
              onChange={(e) => setImage(i, e.target.value)}
              placeholder="https://… image URL"
              aria-label={`Image ${i + 1} URL`}
              className={field}
            />
            <button
              type="button"
              onClick={() => moveImageUp(i)}
              disabled={i === 0}
              aria-label="Move up"
              title="Move up (first image is the main one)"
              className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => removeImage(i)}
              aria-label="Remove image"
              className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange([...images, ""])}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-secondary"
        >
          <Plus className="h-4 w-4" /> Add URL
        </button>

        {UPLOAD_ENABLED && (
          <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium hover:bg-secondary">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Upload images"}
            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              disabled={uploading}
              onChange={(e) => {
                onUpload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      <ErrorText>{error}</ErrorText>
    </Section>
  );
}


export function AddOnsSection({ form, set }: { form: FormState; set: SetField }) {
  return (
    <Section title="Optional extras (customers can add)">
      <div className="space-y-4 rounded-xl border border-border/60 p-4">
        <Toggle
          checked={form.uclEnabled}
          onChange={(v) => set("uclEnabled", v)}
          label="UCL patch"
          hint="Champions League sleeve patch"
        />
        {form.uclEnabled && (
          <div className="max-w-40">
            <Label htmlFor="p-ucl-price">Price (৳)</Label>
            <input
              id="p-ucl-price"
              type="number"
              min={0}
              value={form.uclPrice}
              onChange={(e) => set("uclPrice", e.target.value)}
              className={field}
            />
          </div>
        )}

        <div className="border-t border-border/60" />

        <Toggle
          checked={form.printEnabled}
          onChange={(v) => set("printEnabled", v)}
          label="Name & number print"
          hint="Customer types a name and number"
        />
        {form.printEnabled && (
          <div className="max-w-40">
            <Label htmlFor="p-print-price">Price (৳)</Label>
            <input
              id="p-print-price"
              type="number"
              min={0}
              value={form.printPrice}
              onChange={(e) => set("printPrice", e.target.value)}
              className={field}
            />
          </div>
        )}
      </div>
    </Section>
  );
}
