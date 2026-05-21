"use client";

import { motion } from "framer-motion";

const previewBars = [
  { h: 60, label: "Lun" },
  { h: 90, label: "Mar" },
  { h: 45, label: "Mié" },
  { h: 120, label: "Jue" },
  { h: 80, label: "Vie" },
  { h: 140, label: "Sáb" },
  { h: 100, label: "Dom" },
];

export function DashboardPreview() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Así se ve tu Wrapped
          </h2>
          <p className="mt-4 text-spotify-gray max-w-lg mx-auto">
            Un dashboard en vivo con toda tu actividad musical.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="glass rounded-2xl p-6 sm:p-8"
        >
          {/* Browser chrome mock */}
          <div className="mb-6 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-red-500" />
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
            <div className="h-3 w-3 rounded-full bg-green-500" />
            <div className="ml-3 flex-1 rounded-lg bg-glass-border px-3 py-1.5">
              <span className="text-xs text-spotify-gray">
                dashboard — Mi Spotify Wrapped
              </span>
            </div>
          </div>

          {/* Dashboard mock content */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Top Artists Card */}
            <div className="glass rounded-xl p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-spotify-green/20" />
                <div className="h-3 w-24 rounded-full bg-spotify-dark-600" />
              </div>
              <div className="space-y-2">
                {[80, 60, 40].map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="h-2 rounded-full bg-spotify-dark-600"
                      style={{ width: `${w}%` }}
                    />
                    <div className="h-2 w-12 rounded-full bg-spotify-dark-700" />
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Activity - Bar chart */}
            <div className="glass rounded-xl p-4 sm:col-span-1 lg:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-spotify-green/20" />
                <div className="h-3 w-32 rounded-full bg-spotify-dark-600" />
              </div>
              <div className="flex items-end justify-between gap-2 h-32">
                {previewBars.map((bar) => (
                  <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-md bg-gradient-to-t from-spotify-green/60 to-spotify-green/30 transition-all duration-500"
                      style={{ height: `${bar.h}px` }}
                    />
                    <span className="text-[10px] text-spotify-gray">{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Genre distribution */}
            <div className="glass rounded-xl p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-spotify-green/20" />
                <div className="h-3 w-20 rounded-full bg-spotify-dark-600" />
              </div>
              <div className="flex flex-wrap gap-2">
                {["Pop", "Rock", "Electronic", "Hip-Hop", "Jazz"].map((g) => (
                  <div
                    key={g}
                    className="rounded-full bg-spotify-green/10 px-3 py-1 text-[11px] text-spotify-green"
                  >
                    {g}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats card */}
            <div className="glass rounded-xl p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-spotify-green/20" />
                <div className="h-3 w-28 rounded-full bg-spotify-dark-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Artistas", value: "147" },
                  { label: "Canciones", value: "892" },
                  { label: "Horas", value: "1,234" },
                  { label: "Géneros", value: "23" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <div className="text-lg font-bold text-white">{s.value}</div>
                    <div className="text-[10px] text-spotify-gray">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Peak hours */}
            <div className="glass rounded-xl p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-spotify-green/20" />
                <div className="h-3 w-24 rounded-full bg-spotify-dark-600" />
              </div>
              <div className="flex items-center justify-center h-16">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">10 PM - 12 AM</div>
                  <div className="text-[10px] text-spotify-gray">Horas pico</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
