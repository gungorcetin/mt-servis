// MT Servis - Bakım / İşlem kataloğu (BMW / Mini / Mercedes ağırlıklı)
// Her kategori bir grup; items = seçilebilir işlem kalemleri.
window.CATALOG = [
  {
    id: "periyodik",
    title: "Periyodik / Motor Bakımı",
    icon: "🛢️",
    items: [
      { id: "motor_yagi", label: "Motor yağı" },
      { id: "yag_filtresi", label: "Yağ filtresi" },
      { id: "hava_filtresi", label: "Hava filtresi" },
      { id: "polen_filtresi", label: "Polen (kabin) filtresi" },
      { id: "yakit_filtresi", label: "Yakıt filtresi (dizel)" },
      { id: "buji", label: "Buji (benzin)" },
      { id: "kizdirma_bujisi", label: "Kızdırma bujisi (dizel)" },
      { id: "silecek", label: "Silecek lastiği" },
      { id: "fren_hidroligi", label: "Fren hidroliği kontrol/değişim" },
      { id: "antifriz", label: "Antifriz / soğutma suyu kontrol" },
    ],
  },
  {
    id: "fren",
    title: "Fren Sistemi",
    icon: "🛑",
    items: [
      { id: "on_balata", label: "Ön balata" },
      { id: "on_disk", label: "Ön disk" },
      { id: "arka_balata", label: "Arka balata" },
      { id: "arka_disk", label: "Arka disk" },
      { id: "balata_sensor", label: "Balata aşınma sensörü" },
      { id: "el_freni", label: "El freni / park freni ayarı" },
      { id: "kaliper", label: "Fren kaliper bakımı" },
    ],
  },
  {
    id: "alttakim",
    title: "Alt Takım / Süspansiyon",
    icon: "🔩",
    items: [
      { id: "on_amortisor", label: "Ön amortisör" },
      { id: "arka_amortisor", label: "Arka amortisör" },
      { id: "salincak", label: "Salıncak (üst/alt)" },
      { id: "rot", label: "Rot" },
      { id: "rotil", label: "Rotil" },
      { id: "z_rot", label: "Z rot / viraj demiri lastiği" },
      { id: "rot_basi", label: "Rot başı / rot mili" },
      { id: "direksiyon_kutusu", label: "Direksiyon kutusu / pompa" },
      { id: "rulman", label: "Rulman (ön/arka)" },
      { id: "takoz", label: "Motor / şanzıman takozu" },
    ],
  },
  {
    id: "sanziman",
    title: "Şanzıman & Aktarma",
    icon: "⚙️",
    items: [
      { id: "otomatik_yagi", label: "Otomatik şanzıman yağı + filtre" },
      { id: "manuel_yagi", label: "Manuel şanzıman yağı" },
      { id: "diferansiyel", label: "Diferansiyel yağı" },
      { id: "debriyaj", label: "Debriyaj seti / volan" },
      { id: "aks", label: "Aks körüğü / aks" },
    ],
  },
  {
    id: "motor_mekanik",
    title: "Motor Mekanik / Arıza",
    icon: "🔧",
    items: [
      { id: "triger", label: "Triger zinciri / kayışı + gergi" },
      { id: "devirdaim", label: "Devirdaim (su pompası) + termostat" },
      { id: "vakum_pompasi", label: "Vakum pompası" },
      { id: "egr_turbo", label: "EGR / turbo" },
      { id: "enjektor", label: "Enjektör / yüksek basınç pompası" },
      { id: "kayis_gergi", label: "Kayış / gergi rulmanı" },
      { id: "conta", label: "Contalar (kapak, karter, silindir kapak)" },
    ],
  },
  {
    id: "elektrik",
    title: "Elektrik & Arıza Tespit",
    icon: "🔌",
    items: [
      { id: "diagnostik", label: "Diagnostik (arıza tespit / okuma)" },
      { id: "aku", label: "Akü değişim + kodlama" },
      { id: "mars_alternator", label: "Marş / alternatör" },
      { id: "sensorler", label: "Bobin / sensörler (lambda, ABS, krank)" },
      { id: "aydinlatma", label: "Far / ampul / kodlama" },
    ],
  },
  {
    id: "klima",
    title: "Klima",
    icon: "❄️",
    items: [
      { id: "klima_gazi", label: "Klima gazı (R134a / R1234yf)" },
      { id: "kompresor", label: "Kompresör / rölanti" },
      { id: "klima_petek", label: "Klima peteği / radyatör" },
    ],
  },
  {
    id: "lastik",
    title: "Lastik & Jant",
    icon: "🛞",
    items: [
      { id: "lastik_degisim", label: "Lastik değişim / balans" },
      { id: "rot_balans", label: "Rot balans ayarı" },
      { id: "rotasyon", label: "Rotasyon" },
      { id: "tpms", label: "TPMS (basınç sensörü)" },
    ],
  },
  {
    id: "genel",
    title: "Genel / Diğer",
    icon: "🧽",
    items: [
      { id: "yikama", label: "Yıkama / iç temizlik" },
      { id: "ekspertiz", label: "Ekspertiz / kontrol" },
    ],
  },
];

// id -> label hızlı erişim
window.CATALOG_LABELS = (() => {
  const m = {};
  window.CATALOG.forEach((g) => g.items.forEach((it) => (m[it.id] = it.label)));
  return m;
})();
