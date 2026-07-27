import Laptop3DViewer from "@/components/Laptop3DViewer";

export default function View3DPage() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 20px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>
        3D Model Viewer
      </h1>
      <p style={{ color: "var(--text-muted, #6b7280)", marginBottom: 20 }}>
        Drag to rotate, scroll to zoom. Use the filters on the right to change
        color, finish, and screen angle.
      </p>
      <Laptop3DViewer />
    </main>
  );
}
