import React from "react";
import { QRCodeSVG } from "qrcode.react";

export type IdCardTheme = "candy" | "sunshine" | "violet";
export const ID_CARD_THEMES: { key: IdCardTheme; label: string }[] = [
  { key: "candy", label: "Candy" },
  { key: "sunshine", label: "Sunshine" },
  { key: "violet", label: "Violet" }
];
export type IdCardStudent = { id: string; grNumber: string; fullName: string; className: string; division: string; dob: string; mobile: string; address: string };
export type IdCardFaceProps = { theme: IdCardTheme; student: IdCardStudent; schoolName: string; photo?: string | null; logo?: string | null; sign?: string | null; widthIn?: number };
type Ctx = { w: number; name: string; ini: string; cls: string; gr: string; dob: string; mobile: string; address: string; qr: string; school: string; place: string; photo: string | null; logo: string | null; sign: string | null };

const clean = (s: any): string => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
const isLatin = (s: string) => !/[^\u0000-\u024F]/.test(s);
const fixWord = (w: string): string => {
  if (!isLatin(w) || /\d/.test(w)) return w;
  const lower = w === w.toLowerCase();
  const shout = w === w.toUpperCase() && w.replace(/[^A-Za-z]/g, "").length >= 3;
  if (!lower && !shout) return w;
  return w.toLowerCase().replace(/(^|[-'.\u2019])([a-z])/g, (_m: string, a: string, b: string) => a + b.toUpperCase());
};
const title = (s: string): string => s.replace(/\S+/g, fixWord);
const urlOf = (u: string) => 'url("' + u.replace(/"/g, "%22") + '")';
const abs = (s: React.CSSProperties): React.CSSProperties => ({ position: "absolute", ...s });
const lineFs = (n: number, base: number) => base * (n <= 22 ? 1 : n <= 26 ? 0.9 : n <= 30 ? 0.8 : 0.7);
const split2 = (t: string): [string, string] => {
  const w = t.split(" ");
  if (w.length < 2) return [t, ""];
  let k = 1;
  let m = 1e9;
  for (let i = 1; i < w.length; i++) {
    const d = Math.abs(w.slice(0, i).join(" ").length - w.slice(i).join(" ").length);
    if (d < m) { m = d; k = i; }
  }
  return [w.slice(0, k).join(" "), w.slice(k).join(" ")];
};
const STAR_POINTS = (() => {
  let p = "";
  for (let i = 0; i < 28; i++) {
    const r = i % 2 ? 41 : 50;
    const t = (Math.PI * i) / 14;
    p += (50 + r * Math.cos(t)).toFixed(1) + "," + (50 + r * Math.sin(t)).toFixed(1) + " ";
  }
  return p;
})();
const SCALLOP_PATH = (() => {
  let d = "";
  for (let i = 0; i < 240; i++) {
    const t = (i / 240) * Math.PI * 2;
    const r = 44 + 3.4 * Math.sin(16 * t);
    d += (i ? "L" : "M") + (50 + r * Math.cos(t)).toFixed(2) + " " + (50 + r * Math.sin(t)).toFixed(2);
  }
  return d + "Z";
})();

function Root({ w, bg, color, children }: { w: number; bg: string; color: string; children: React.ReactNode }) {
  return (
    <div className="idc" style={{ position: "relative", width: w + "in", height: ((w * 38.2) / 24).toFixed(4) + "in", fontSize: (w / 24).toFixed(5) + "in", background: bg, color, overflow: "hidden", borderRadius: "1.1em", border: ".01in solid #cbd5e1", fontFamily: '"Trebuchet MS", Roboto, Arial, sans-serif', lineHeight: 1.15, textAlign: "left", WebkitTextSizeAdjust: "100%" }}>
      <style>{".idc,.idc *{box-sizing:border-box}"}</style>
      {children}
    </div>
  );
}
function Body({ children }: { children: React.ReactNode }) {
  return <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", padding: "1.2em 1.2em 1em" }}>{children}</div>;
}
function Logo({ logo, bg, fg, ring }: { logo: string | null; bg: string; fg: string; ring: string }) {
  return (
    <div style={{ position: "relative", width: "2.8em", height: "2.8em", borderRadius: "50%", background: bg, border: ".2em solid " + ring, flex: "none", overflow: "hidden" }}>
      {logo ? (
        <div style={abs({ top: ".15em", right: ".15em", bottom: ".15em", left: ".15em", backgroundImage: urlOf(logo), backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" })} />
      ) : (
        <svg viewBox="0 0 24 24" width="24" height="24" style={abs({ left: "19%", top: "19%", width: "62%", height: "62%" })}>
          <path fill={fg} d="M12 5.5C9.8 4.2 7 3.8 4 3.8v13.4c3 0 5.8.5 8 1.9 2.2-1.4 5-1.9 8-1.9V3.8c-3 0-5.8.4-8 1.7z" />
          <path d="M12 5.5v13.6" stroke="#ffffff" strokeWidth="1.1" fill="none" />
        </svg>
      )}
    </div>
  );
}
function PhotoFill({ photo, ini, bg, fg }: { photo: string | null; ini: string; bg: string; fg: string }) {
  if (photo) return <div style={abs({ top: 0, right: 0, bottom: 0, left: 0, backgroundImage: urlOf(photo), backgroundSize: "cover", backgroundPosition: "center top", backgroundRepeat: "no-repeat" })} />;
  return <div style={abs({ top: 0, right: 0, bottom: 0, left: 0, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.2em", fontWeight: 700 })}>{ini}</div>;
}
function School({ name, place, color, placeColor, h, base, ls }: { name: string; place: string; color: string; placeColor: string; h: string; base: number; ls?: string }) {
  const n = name.length;
  const fs = n <= 20 ? base : n <= 28 ? base * 0.88 : n <= 38 ? base * 0.76 : base * 0.66;
  const pl = place.length > 26 ? place.slice(0, 24).trim() + "\u2026" : place;
  return (
    <div style={{ flex: "none", width: "100%", marginTop: ".4em", height: h, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color }}>
      <div style={{ fontSize: fs.toFixed(2) + "em", lineHeight: 1.08, fontWeight: 700, letterSpacing: ls || "0" }}>{name}</div>
      {pl ? <div style={{ fontSize: ".95em", fontWeight: 700, letterSpacing: pl.length > 12 ? ".12em" : ".3em", marginTop: ".3em", color: placeColor }}>{pl}</div> : null}
    </div>
  );
}
function Row({ l, v, lc, tc, fs }: { l: string; v: string; lc: string; tc: string; fs: number }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: ".92em", letterSpacing: ".12em", fontWeight: 700, color: lc }}>{l}</div>
      <div style={{ fontSize: fs + "em", lineHeight: 1.15, marginTop: ".12em", fontWeight: 700, color: tc, overflowWrap: "break-word" }}>{v}</div>
    </div>
  );
}
function Sign({ sign, color }: { sign: string | null; color: string }) {
  return (
    <div style={{ width: "100%", textAlign: "center", color }}>
      <div style={{ position: "relative", height: "1.7em", background: "#ffffff", borderRadius: ".3em", overflow: "hidden" }}>
        {sign ? (
          <div style={abs({ top: ".08em", right: ".2em", bottom: ".08em", left: ".2em", backgroundImage: urlOf(sign), backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" })} />
        ) : (
          <div style={abs({ left: ".5em", right: ".5em", bottom: ".3em", height: ".1em", background: "#9ca3af" })} />
        )}
      </div>
      <div style={{ fontSize: ".92em", fontWeight: 700, marginTop: ".25em" }}>Headmaster</div>
    </div>
  );
}
function Bottom({ p, lc, tc, qb, sc }: { p: Ctx; lc: string; tc: string; qb: string; sc: string }) {
  const afs = p.address.length > 44 ? 0.98 : 1.12;
  return (
    <div style={{ marginTop: "auto", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: ".8em", flex: "none" }}>
      <div style={{ flex: 1, minWidth: 0, alignSelf: "center", display: "flex", flexDirection: "column", gap: ".5em" }}>
        <Row l="DATE OF BIRTH" v={p.dob} lc={lc} tc={tc} fs={1.12} />
        <Row l="MOBILE" v={p.mobile} lc={lc} tc={tc} fs={1.12} />
        <Row l="ADDRESS" v={p.address} lc={lc} tc={tc} fs={afs} />
      </div>
      <div style={{ width: "7.8em", flex: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: ".45em" }}>
        <div style={{ width: "7.8em", height: "7.8em", background: "#ffffff", padding: ".45em", border: ".12em solid " + qb, borderRadius: ".5em" }}>
          <QRCodeSVG value={p.qr} size={256} level="M" marginSize={0} fgColor="#111111" bgColor="#ffffff" style={{ width: "100%", height: "100%", display: "block" }} />
        </div>
        <Sign sign={p.sign} color={sc} />
      </div>
    </div>
  );
}

function Candy(p: Ctx) {
  const n = p.name.length;
  const fs = n <= 12 ? 2.0 : n <= 18 ? 1.7 : n <= 24 ? 1.5 : n <= 30 ? 1.3 : n <= 38 ? 1.15 : 1.0;
  return (
    <Root w={p.w} bg="#FFF3E4" color="#3A2347">
      <div style={abs({ left: "-3.2em", top: "2.2em", width: "10em", height: "2.2em", borderRadius: "2em", background: "#FFD95E", transform: "rotate(-36deg)" })} />
      <div style={abs({ right: "2.2em", top: "-3em", width: "2em", height: "7.6em", borderRadius: "1em", background: "#E87BC3", transform: "rotate(16deg)" })} />
      <div style={abs({ right: "-.2em", top: "-3em", width: "2em", height: "7.6em", borderRadius: "1em", background: "#6CCBF3", transform: "rotate(16deg)" })} />
      <div style={abs({ left: "-4em", right: "-4em", bottom: "-13em", height: "26.5em", borderRadius: "50%", background: "#FFE9A3" })} />
      <Body>
        <Logo logo={p.logo} bg="#ffffff" fg="#E26BB8" ring="#FFD0EC" />
        <School name={p.school} place={p.place} color="#E0509F" placeColor="#7C4DC4" h="4em" base={1.35} />
        <div style={{ position: "relative", width: "7.6em", height: "7.6em", marginTop: ".5em", flex: "none" }}>
          <div style={abs({ top: "-.5em", right: "-.5em", bottom: "-.5em", left: "-.5em", background: "#FFD95E", borderRadius: "46% 54% 50% 50% / 55% 45% 55% 45%", transform: "rotate(10deg)" })} />
          <div style={abs({ top: 0, right: 0, bottom: 0, left: 0, background: "#36B8F2", borderRadius: "56% 44% 52% 48% / 48% 54% 46% 52%", overflow: "hidden" })}>
            <PhotoFill photo={p.photo} ini={p.ini} bg="#36B8F2" fg="#ffffff" />
          </div>
        </div>
        <div style={{ position: "relative", width: "100%", height: "3.8em", marginTop: "1em", flex: "none" }}>
          <div style={abs({ left: ".8em", right: "-.4em", top: ".45em", bottom: "-.45em", background: "#FFD95E" })} />
          <div style={abs({ top: 0, right: 0, bottom: 0, left: 0, background: "#E57DC1", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 .6em", fontSize: fs + "em", fontWeight: 700, lineHeight: 1.08, overflow: "hidden" })}>{p.name}</div>
        </div>
        <div style={{ display: "flex", gap: ".6em", marginTop: ".9em", flex: "none" }}>
          <span style={{ border: ".16em solid #E57DC1", background: "#ffffff", color: "#C23C8E", borderRadius: "2em", padding: ".4em .9em", fontWeight: 700, fontSize: "1.05em", whiteSpace: "nowrap" }}>{"GR " + p.gr}</span>
          <span style={{ background: "#36B8F2", color: "#ffffff", borderRadius: "2em", padding: ".4em .9em", fontWeight: 700, fontSize: "1.05em", whiteSpace: "nowrap" }}>{p.cls}</span>
        </div>
        <Bottom p={p} lc="#C23C8E" tc="#3A2347" qb="#E57DC1" sc="#3A2347" />
      </Body>
    </Root>
  );
}

function Sunshine(p: Ctx) {
  const [a, b] = split2(p.name.toUpperCase());
  const m = Math.max(a.length, b.length);
  const fs = m <= 10 ? 2.2 : m <= 13 ? 2.0 : m <= 16 ? 1.8 : m <= 19 ? 1.55 : m <= 22 ? 1.35 : 1.2;
  const hh = (fs * 2.16 + 0.3).toFixed(2);
  const line = p.cls.toUpperCase() + " \u00A0|\u00A0 GR " + p.gr;
  return (
    <Root w={p.w} bg="#FFD64A" color="#111111">
      <div style={abs({ left: 0, right: 0, top: "13.5em", bottom: 0, background: "#FFC41C" })} />
      <svg viewBox="0 0 100 100" width="100" height="100" style={abs({ left: "-2.6em", top: "-2.6em", width: "9em", height: "9em" })}>
        <polygon fill="#E8591A" points={STAR_POINTS} />
      </svg>
      <svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="#111111" strokeWidth="1.1" style={abs({ right: 0, top: 0, width: "8em", height: "8em" })}>
        <path d="M52 0V44M64 0V28M76 0V60M24 14H80M36 30H80M44 46H80" />
      </svg>
      <svg viewBox="0 0 46 70" width="46" height="70" fill="none" stroke="#111111" strokeWidth="1.1" style={abs({ left: 0, top: "15em", width: "4.6em", height: "7em" })}>
        <path d="M0 18H32M18 0V52M0 44H26" />
      </svg>
      <Body>
        <Logo logo={p.logo} bg="#ffffff" fg="#111111" ring="#111111" />
        <School name={p.school} place={p.place} color="#111111" placeColor="#8F3208" h="3.6em" base={1.15} ls=".06em" />
        <div style={{ position: "relative", width: "8.4em", height: "8.4em", marginTop: ".5em", flex: "none" }}>
          <div style={abs({ top: "-.45em", right: "-.45em", bottom: "-.45em", left: "-.45em", borderRadius: "50%", background: "#ffffff" })} />
          <div style={abs({ top: 0, right: 0, bottom: 0, left: 0, borderRadius: "50%", background: "#E8591A" })} />
          <div style={abs({ top: ".5em", right: ".5em", bottom: ".5em", left: ".5em", borderRadius: "50%", overflow: "hidden" })}>
            <PhotoFill photo={p.photo} ini={p.ini} bg="#FFE8A8" fg="#E8591A" />
          </div>
        </div>
        <div style={{ height: hh + "em", marginTop: ".9em", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <div style={{ fontSize: fs + "em", fontWeight: 700, lineHeight: 1.08, textAlign: "center" }}>
            <div>{a}</div>
            {b ? <div>{b}</div> : null}
          </div>
        </div>
        <div style={{ fontSize: lineFs(line.length, 1.2).toFixed(2) + "em", fontWeight: 700, letterSpacing: ".03em", marginTop: ".3em", flex: "none", whiteSpace: "nowrap" }}>{line}</div>
        <Bottom p={p} lc="#8F3208" tc="#111111" qb="#111111" sc="#111111" />
      </Body>
    </Root>
  );
}

function Violet(p: Ctx) {
  const n = p.name.length;
  const fs = n <= 14 ? 1.9 : n <= 20 ? 1.65 : n <= 26 ? 1.4 : n <= 34 ? 1.2 : 1.05;
  const clsLine = p.cls.indexOf("Class ") === 0 ? "Class : " + p.cls.slice(6) : p.cls;
  const line = clsLine + " \u00A0|\u00A0 GR : " + p.gr;
  return (
    <Root w={p.w} bg="#6A52E3" color="#ffffff">
      <svg viewBox="0 0 240 382" width="240" height="382" preserveAspectRatio="none" fill="none" stroke="#8872F0" strokeWidth="1.2" style={abs({ left: 0, top: 0, width: "100%", height: "100%" })}>
        <path d="M44 0V382M88 0V382M132 0V382M176 0V382M220 0V382M0 44H240M0 88H240M0 132H240M0 176H240M0 220H240M0 264H240M0 308H240M0 352H240" />
      </svg>
      <div style={abs({ left: "-8em", top: "7em", width: "42em", height: "3em", background: "#7561E8", transform: "rotate(-26deg)" })} />
      <div style={abs({ left: "-8em", top: "21em", width: "42em", height: "2.2em", background: "#5B44D4", transform: "rotate(-26deg)" })} />
      <Body>
        <Logo logo={p.logo} bg="#FFC93C" fg="#4631C0" ring="#FFC93C" />
        <School name={p.school} place={p.place} color="#FFC93C" placeColor="#ffffff" h="4em" base={1.35} />
        <div style={{ position: "relative", width: "8.2em", height: "8.2em", marginTop: ".4em", flex: "none" }}>
          <svg viewBox="0 0 100 100" width="100" height="100" style={abs({ left: 0, top: 0, width: "100%", height: "100%" })}>
            <path d={SCALLOP_PATH} fill="#FFC93C" />
          </svg>
          <div style={abs({ top: ".9em", right: ".9em", bottom: ".9em", left: ".9em", borderRadius: "50%", overflow: "hidden" })}>
            <PhotoFill photo={p.photo} ini={p.ini} bg="#9C8CF5" fg="#ffffff" />
          </div>
        </div>
        <div style={{ position: "relative", width: "100%", height: "3.6em", marginTop: ".9em", flex: "none" }}>
          <div style={abs({ top: 0, right: 0, bottom: 0, left: 0, background: "#FFC93C", color: "#4631C0", borderRadius: ".9em", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 .8em", fontSize: fs + "em", fontWeight: 700, lineHeight: 1.08, overflow: "hidden" })}>{p.name}</div>
        </div>
        <div style={{ width: "100%", marginTop: ".5em", background: "#FFD86B", color: "#4631C0", borderRadius: ".9em", padding: ".5em .8em", textAlign: "center", flex: "none", fontSize: lineFs(line.length, 1.25).toFixed(2) + "em", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden" }}>{line}</div>
        <Bottom p={p} lc="#FFC93C" tc="#ffffff" qb="#FFC93C" sc="#ffffff" />
      </Body>
    </Root>
  );
}

export function IdCardFace({ theme, student, schoolName, photo, logo, sign, widthIn }: IdCardFaceProps) {
  const sv = clean(schoolName);
  const ci = sv.indexOf(",");
  const schoolMain = ci > 0 ? sv.slice(0, ci).trim() : sv;
  const schoolPlace = ci > 0 ? sv.slice(ci + 1).trim() : "";
  const cls0 = clean(student.className).replace(/^class\b\s*[-:]?\s*/i, "");
  const dv = clean(student.division);
  const div = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(dv) ? "" : dv;
  const clsLabel = /^[0-9ivx]+(st|nd|rd|th)?$/i.test(cls0) ? "Class " + cls0 : cls0;
  const dm = clean(student.dob).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const addr = clean(student.address).split(",").map((x) => title(x.trim())).filter(Boolean).join(", ");
  const ctx: Ctx = {
    w: widthIn || 2.125,
    name: title(clean(student.fullName)) || "-",
    ini: (() => {
      const w = clean(student.fullName).split(" ").filter(Boolean);
      return ((w[0] || "").charAt(0) + (w.length > 1 ? w[w.length - 1].charAt(0) : "")).toUpperCase() || "?";
    })(),
    cls: [clsLabel, div].filter(Boolean).join(" - ") || "-",
    gr: clean(student.grNumber) || "-",
    dob: dm ? dm[3] + "/" + dm[2] + "/" + dm[1] : clean(student.dob) || "-",
    mobile: clean(student.mobile) || "-",
    address: addr ? (addr.length > 64 ? addr.slice(0, 62).trim() + "\u2026" : addr) : "-",
    qr: "CLASSTAGO:ST:" + student.id,
    school: schoolMain.toUpperCase(),
    place: schoolPlace.toUpperCase(),
    photo: photo || null,
    logo: logo || null,
    sign: sign || null
  };
  if (theme === "sunshine") return <Sunshine {...ctx} />;
  if (theme === "violet") return <Violet {...ctx} />;
  return <Candy {...ctx} />;
}
export default IdCardFace;
