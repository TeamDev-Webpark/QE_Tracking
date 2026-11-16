import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-6xl font-extrabold text-primary">404</p>
      <div>
        <p className="text-lg font-bold">ไม่พบหน้าที่ต้องการ</p>
        <p className="text-sm text-text-muted">Page not found</p>
      </div>
      <Link
        href="/"
        className="rounded-control bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
      >
        กลับหน้าแดชบอร์ด / Back to Dashboard
      </Link>
    </div>
  );
}
