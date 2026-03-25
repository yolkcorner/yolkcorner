"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useLang } from "@/lib/i18n";

type DriveItem = {
  id: string;
  name: string;
  type: "folder" | "image";
  coverUrl?: string | null;
};

export default function DownloadListClient() {
  const { t } = useLang();
  const [events, setEvents] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/photos");
        const data = await res.json();

        if (!res.ok) {
          console.error("API Error:", data.error || "Failed to fetch events");
          setEvents([]);
          return;
        }

        if (data.files && Array.isArray(data.files)) {
          const folders = data.files.filter(
            (item: DriveItem) => item.type === "folder",
          );
          setEvents(folders);
        } else {
          console.error("Unexpected API format:", data);
          setEvents([]);
        }
      } catch (err) {
        console.error("Failed to load events:", err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  return (
    <Layout>
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10 md:mb-16"
          >
            <h1 className="font-heading text-xl drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)]">
              {t?.download?.title}
            </h1>
            <p className="mt-3 md:mt-4 text-muted-foreground text-base md:text-lg">
              {t?.download?.subtitle}
            </p>
          </motion.div>

          {loading && (
            <p className="text-center text-muted-foreground">
              {t?.common?.loadingData}
            </p>
          )}

          {!loading && events.length === 0 && (
            <p className="text-center text-muted-foreground">
              {t?.common?.noAlbums}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 md:gap-6 w-full">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="max-w-3xl mx-auto w-full"
              >
                <Link
                  href={`/download/${event.id}`}
                  className="group overflow-hidden  transition-all block drop-shadow-[-2px_2px_4px_rgba(0,0,0,0.25)] rounded-md"
                >
                  <div className="aspect-video overflow-hidden relative">
                    <Image
                      src={event.coverUrl || "/hero-bg.png"}
                      alt={event.name}
                      fill
                      unoptimized
                      priority={i === 0}
                      sizes="(max-width: 768px) 100vw, 768px"
                      className="object-cover group-hover:scale-105 transition-transform duration-900 ease-in-out"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/15 to-transparent" />
                    <div className="absolute inset-0 flex items-end justify-between p-4">
                      <h3 className="font-heading text-xl tracking-wider text-white">
                        {event.name}
                      </h3>

                      <div className="flex items-center gap-2 text-sm text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>{t?.download?.viewPhotos}</span>
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}
