import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { firms, type FirmId } from "./erp-data";
import { getCompanyId } from "./api";
import { applyBrand } from "./brand";

const Ctx = createContext<{ firm: FirmId; setFirm: (f: FirmId) => void }>({
  firm: "f1",
  setFirm: () => {},
});

function firmFromStorage(): FirmId {
  const cid = getCompanyId();
  if (!cid) return "f1";
  const match = firms.find((f) => String(f.companyId) === cid);
  return (match?.id as FirmId) || "f1";
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [firm, setFirmState] = useState<FirmId>("f1");

  useEffect(() => {
    const f = firmFromStorage();
    setFirmState(f);
    applyBrand(f);
  }, []);

  useEffect(() => {
    applyBrand(firm);
  }, [firm]);

  const setFirm = (f: FirmId) => {
    setFirmState(f);
    if (f === "all") return;
    const companyId = firms.find((x) => x.id === f)?.companyId;
    if (companyId != null) localStorage.setItem("companyId", String(companyId));
  };

  return <Ctx.Provider value={{ firm, setFirm }}>{children}</Ctx.Provider>;
}

export const useCompany = () => useContext(Ctx);
