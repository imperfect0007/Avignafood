import { createFileRoute } from "@tanstack/react-router";
import { useMe } from "@/lib/me-context";
import { VehicleEditor } from "@/components/erp/VehicleBoard";

export const Route = createFileRoute("/dispatch")({
  head: () => ({
    meta: [{ title: "Dispatch · Avighna" }],
  }),
  component: Dispatch,
});

function Dispatch() {
  const { me } = useMe();
  if (me?.user.role === "logistics") {
    return <p className="text-sm text-muted-foreground">Book morning, afternoon or evening on Runs.</p>;
  }
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">Truck windows</h1>
      <VehicleEditor />
    </div>
  );
}
