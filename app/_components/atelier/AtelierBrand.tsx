import Image from "next/image";

type AtelierBrandProps = {
  subtitle?: string;
};

export function AtelierBrand({ subtitle }: AtelierBrandProps) {
  return (
    <div className="atelier-brand">
      <Image
        alt="Banana Sheet logo"
        className="atelier-brand-logo"
        height={72}
        src="/logo.png"
        width={72}
      />
      <p className="atelier-brand-eyebrow">Banana Atelier</p>
      <h1 className="atelier-brand-title">Banana Sheet</h1>
      {subtitle ? <p className="atelier-brand-subtitle">{subtitle}</p> : null}
    </div>
  );
}
