import Image from "next/image";

type PetriDishProps = {
  src?: string | null;
  alt?: string;
  size?: "small" | "large";
  state?: "idle" | "culturing" | "hatched";
};

export function PetriDish({ src, alt = "Your selected image", size = "large", state = "idle" }: PetriDishProps) {
  return <div className={`petri-dish petri-${size}`} data-state={state}>
    <div className="petri-core">{src ? <Image src={src} alt={alt} width={800} height={800} unoptimized /> : <svg aria-hidden="true" viewBox="0 0 64 64" fill="none"><path d="M32 43V21m0 0-8 8m8-8 8 8M20 41v7h24v-7" /><circle cx="32" cy="32" r="27" /></svg>}</div>
    <span className="petri-orbit" aria-hidden="true" />
  </div>;
}
