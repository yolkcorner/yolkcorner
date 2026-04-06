import Layout from "@/components/Layout";

export default function DownloadFolderLoading() {
  return (
    <Layout>
      <section className="container mx-auto px-4 py-20 pb-32">
        <div className="mx-auto max-w-2xl rounded-3xl border border-white/70 bg-white/80 p-8 text-center shadow-[0_16px_45px_rgba(120,58,12,0.14)] backdrop-blur">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#f3d6b8] border-t-[#ff7a2e]" />
          <h2 className="text-xl font-semibold text-[#2b1a10]">
            Loading album...
          </h2>
          <p className="mt-2 text-sm text-[#6f5a4b]">
            Please wait while photos are being prepared.
          </p>
        </div>
      </section>
    </Layout>
  );
}
