"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowser, supabaseConfigured } from "@/lib/supabaseBrowser";

type Photo = {
  name: string;
  url: string;
  createdAt: string;
};

function captionFor(name: string) {
  // Uploads are stored as "<timestamp>-<original name>"; show the original.
  return name
    .replace(/^\d+-/, "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ");
}

export default function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function loadPhotos() {
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.storage
      .from("gallery")
      .list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    if (error) {
      setError(error.message);
    } else {
      setPhotos(
        (data ?? [])
          .filter((f) => !f.name.startsWith("."))
          .map((f) => ({
            name: f.name,
            url: supabase.storage.from("gallery").getPublicUrl(f.name).data.publicUrl,
            createdAt: f.created_at ?? "",
          }))
      );
    }
    setLoaded(true);
  }

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoaded(true);
      return;
    }
    const supabase = supabaseBrowser();
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    loadPhotos();
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError("");
    setUploading(true);
    const supabase = supabaseBrowser();
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`${file.name} is not an image.`);
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name} is larger than 10 MB.`);
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
        const { error } = await supabase.storage
          .from("gallery")
          .upload(`${Date.now()}-${safeName}`, file, { contentType: file.type });
        if (error) throw new Error(error.message);
      }
      await loadPhotos();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <main className="page page-wide">
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div className="kicker">Community life</div>
          <h1 style={{ fontSize: 46, fontWeight: 400, margin: "10px 0 0" }}>Gallery</h1>
          <p className="text-muted" style={{ maxWidth: "60ch", marginTop: 10 }}>
            Photos from meetings, gatherings and welfare events, shared by the
            members of the association.
          </p>
        </div>
        {session ? (
          <div>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              style={{ display: "none" }}
              id="gallery-upload"
            />
            <button
              className="btn btn-primary"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              {uploading ? "Uploading…" : "Add photos"}
            </button>
          </div>
        ) : (
          <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
            <a href="/portal">Sign in</a> to add photos.
          </p>
        )}
      </div>
      {error && <div className="notice notice-error">{error}</div>}
      <hr className="hr" style={{ margin: "28px 0 32px" }} />

      {!loaded && <p className="text-muted">Loading photos…</p>}
      {loaded && photos.length === 0 && (
        <div className="panel" style={{ textAlign: "center", padding: 56 }}>
          <h3 style={{ fontWeight: 400 }}>No photos yet</h3>
          <p className="text-muted" style={{ fontSize: 14, margin: "8px auto 0", maxWidth: "44ch" }}>
            The gallery is waiting for its first picture. Members can sign in
            and add photos from any meeting or gathering.
          </p>
        </div>
      )}
      <div className="grid-gallery">
        {photos.map((p) => (
          <figure className="gallery-item" key={p.name}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={captionFor(p.name)} loading="lazy" />
            <figcaption>{captionFor(p.name)}</figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
