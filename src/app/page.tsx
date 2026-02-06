"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import {
  BookOpen,
  GraduationCap,
  Users,
  Cpu,
  FlaskConical,
  Palette,
  MapPin,
  Phone,
  Mail,
  Clock,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Globe,
  Heart,
  Target,
  Building2,
  Leaf,
  Monitor,
  Dumbbell,
  UtensilsCrossed,
  Library,
  Menu,
  X,
  ExternalLink,
  History,
  Award,
  Microscope,
  BriefcaseBusiness,
} from "lucide-react";
import Image from "next/image";

/* ─── animation variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeSlideLeft = {
  hidden: { opacity: 0, x: -60, filter: "blur(6px)" },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

const fadeSlideRight = {
  hidden: { opacity: 0, x: 60, filter: "blur(6px)" },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.85, filter: "blur(10px)" },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const rotateIn = {
  hidden: { opacity: 0, rotate: -3, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

/* ─── images ─── */
const IMAGES = {
  hero: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/a1ccb738-14b3-4dc3-ae1d-ef01e48c7f15/Diseno-sin-titulo_Nero_AI_Image_Upscaler_Photo-resized-1770408139233.webp?width=8000&height=8000&resize=contain",
  patio: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/a1ccb738-14b3-4dc3-ae1d-ef01e48c7f15/20170217_141444-xs-1770405520006.jpg?width=8000&height=8000&resize=contain",
  pingpong: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/a1ccb738-14b3-4dc3-ae1d-ef01e48c7f15/20170421_130826-xs-1770405519854.jpg?width=8000&height=8000&resize=contain",
  corridor1: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/a1ccb738-14b3-4dc3-ae1d-ef01e48c7f15/20170912_170647-xs-1770405519842.jpg?width=8000&height=8000&resize=contain",
  corridor2: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/a1ccb738-14b3-4dc3-ae1d-ef01e48c7f15/20170912_170920-xs-1770405519840.jpg?width=8000&height=8000&resize=contain",
};

/* ═══════════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════════ */
function Navbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "Història", href: "#historia" },
    { label: "Pius Font i Quer", href: "#piusfontquer" },
    { label: "Estudis", href: "#estudis" },
      { label: "Instal·lacions", href: "#installacions" },
      { label: "Xarxes", href: "#xarxes" },
      { label: "Contacte", href: "#contacte" },
  ];

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/70 border-b border-indigo-100/50"
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-700 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">PFQ</span>
          </div>
          <span className="font-semibold text-gray-900 hidden sm:block">
            IES Pius Font i Quer
          </span>
        </a>

        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-7">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-gray-500 hover:text-indigo-700 transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="https://www.iespfq.cat/portal/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium px-4 py-2 rounded-full bg-gradient-to-r from-blue-700 to-purple-600 text-white hover:opacity-90 transition-opacity"
          >
            Portal
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden p-2 text-gray-600"
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden overflow-hidden bg-white/95 backdrop-blur-xl border-t border-indigo-100/50"
          >
            <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-3">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="text-sm text-gray-600 py-2"
                >
                  {l.label}
                </a>
              ))}
              <a
                href="https://www.iespfq.cat/portal/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium px-4 py-2 rounded-full bg-gradient-to-r from-blue-700 to-purple-600 text-white text-center"
              >
                Portal
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

/* ═══════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════ */
function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src={IMAGES.hero}
            alt="Pius Font i Quer"
            fill
            className="object-contain object-center scale-[1.15]"
            sizes="100vw"
            priority
          />
          {/* Blue → Purple gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-800/70 via-indigo-700/55 to-purple-700/65" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#f0f4ff] via-transparent to-transparent" />
      </div>

      {/* Decorative animated orbs */}
      <motion.div
        style={{ y }}
        className="absolute top-20 right-20 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl"
      />
      <motion.div
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, 80]) }}
        className="absolute bottom-32 left-16 w-96 h-96 bg-blue-400/15 rounded-full blur-3xl"
      />
      <motion.div
        className="absolute top-1/3 left-1/3 w-64 h-64 bg-indigo-300/10 rounded-full blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        style={{ opacity }}
        className="relative z-10 max-w-4xl mx-auto px-6 text-center -mt-36"
      >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-sm font-medium mb-8 border border-white/20"
          >
            <motion.span
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-4 h-4" />
            </motion.span>
            Institut d&apos;Educaci&oacute; Secund&agrave;ria &mdash; Manresa
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40, filter: "blur(12px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="text-6xl sm:text-8xl font-bold text-white tracking-tight leading-[1.1] mb-6 drop-shadow-lg"
          >
            Pius Font
            <br />
            <motion.span
              initial={{ opacity: 0, x: -30, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-indigo-300"
            >
              i Quer
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 25, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            M&eacute;s de 40 anys formant persones al cor del Bages. ESO,
            Batxillerat i Cicles Formatius amb una aposta ferma per la
            innovaci&oacute; i l&apos;excel&middot;l&egrave;ncia.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
          <a
            href="#estudis"
            className="group flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-gray-900 font-medium hover:bg-gray-100 transition-all shadow-lg shadow-black/10"
          >
            Descobreix els Estudis
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#historia"
            className="px-7 py-3.5 rounded-full border border-white/30 text-white font-medium hover:bg-white/10 transition-colors backdrop-blur-sm"
          >
            La nostra hist&ograve;ria
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-5 h-5 text-white/60" />
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   HISTORY
   ═══════════════════════════════════════════════════════ */
function HistorySection() {
  const timeline = [
    {
      year: "1974",
      title: "Fundaci\u00f3 del centre",
      text: "Es crea l\u2019Institut de Formaci\u00f3 Professional al barri de la Font dels Capellans de Manresa, per donar resposta a la creixent demanda educativa de la comarca del Bages.",
    },
    {
      year: "1980",
      title: "Consolidaci\u00f3 i creixement",
      text: "El centre es consolida amb noves especialitats de Formaci\u00f3 Professional i amplia la seva oferta formativa, convertint-se en un referent educatiu a la ciutat.",
    },
    {
      year: "1996",
      title: "IES Pius Font i Quer",
      text: "Amb la reforma educativa (LOGSE), el centre es transforma en Institut d\u2019Educaci\u00f3 Secund\u00e0ria i adopta el nom del il\u00b7lustre bot\u00e0nic Pius Font i Quer, fill de Lleida i vinculat a la ci\u00e8ncia catalana.",
    },
    {
      year: "2000",
      title: "Modernitzaci\u00f3",
      text: "S\u2019incorporen els Cicles Formatius de Grau Mitj\u00e0 i Superior en fam\u00edlies com Inform\u00e0tica, Administraci\u00f3 i Sanitat, i es renoven les instal\u00b7lacions amb laboratoris i aules d\u2019inform\u00e0tica actualitzades.",
    },
    {
      year: "Avui",
      title: "Un centre de refer\u00e8ncia",
      text: "Actualment, l\u2019IES Pius Font i Quer ofereix ESO, Batxillerat i m\u00faltiples Cicles Formatius. M\u00e9s de 1.200 alumnes i un equip de m\u00e9s de 100 professionals treballen cada dia per una educaci\u00f3 de qualitat.",
    },
  ];

  return (
      <section id="historia" className="py-20 bg-geo-lines relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
            className="text-center mb-12"
          >
            <motion.div
              variants={fadeUp}
              custom={0}
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 uppercase tracking-widest mb-3"
            >
              <History className="w-4 h-4" />
              Un xic d&apos;hist&ograve;ria
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-4"
          >
            M&eacute;s de quatre d&egrave;cades
            <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-600">
              formant persones
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-gray-500 text-lg max-w-2xl mx-auto"
          >
            Des de 1974, el nostre institut ha evolucionat amb la societat,
            mantenint sempre el comprom&iacute;s amb l&apos;educaci&oacute; de qualitat al
            Bages.
          </motion.p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Center line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-200 via-indigo-200 to-purple-200 md:-translate-x-px" />

            <div className="space-y-6">
              {timeline.map((item, i) => (
                <motion.div
                  key={item.year}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={fadeUp}
                  custom={0}
                  className={`relative flex flex-col md:flex-row gap-4 md:gap-12 ${
                  i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                  {/* Dot */}
                  <div className="absolute left-4 md:left-1/2 -translate-x-1.5 md:-translate-x-1.5 mt-2 z-10">
                    <div className="w-3 h-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full ring-4 ring-white" />
                    <div className="absolute inset-0 w-3 h-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full animate-ping opacity-30" />
                  </div>

                {/* Content */}
                <div
                  className={`md:w-1/2 pl-12 md:pl-0 ${
                    i % 2 === 0
                      ? "md:pr-16 md:text-right"
                      : "md:pl-16 md:text-left"
                  }`}
                >
                  <span className="inline-block text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mb-3">
                    {item.year}
                  </span>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-500 leading-relaxed">{item.text}</p>
                </div>

                {/* Spacer for the other side */}
                <div className="hidden md:block md:w-1/2" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   PIUS FONT I QUER - BIOGRAPHY
   ═══════════════════════════════════════════════════════ */
function PiusBio() {
  return (
    <section id="piusfontquer" className="py-32 bg-section-alt relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="grid md:grid-cols-2 gap-16 items-center"
        >
          {/* Left: bio text */}
          <div>
            <motion.div
              variants={fadeUp}
              custom={0}
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 uppercase tracking-widest mb-4"
            >
              <Leaf className="w-4 h-4" />
              Qui va ser?
            </motion.div>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-6"
            >
              Pius Font
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-600">
                i Quer
              </span>
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-gray-500 text-lg leading-relaxed mb-5"
            >
              <strong className="text-gray-700">Pius Font i Quer</strong>{" "}
              (Lleida, 1888 &ndash; Barcelona, 1964) va ser un dels
              bot&agrave;nics m&eacute;s importants d&apos;Espanya i de
              l&apos;&agrave;mbit mediterrani del segle XX. Llicenciat en
              Farm&agrave;cia i Doctor en Ci&egrave;ncies Naturals, va dedicar
              la seva vida a l&apos;estudi de la flora ib&egrave;rica i
              nord-africana.
            </motion.p>
            <motion.p
              variants={fadeUp}
              custom={3}
              className="text-gray-500 text-lg leading-relaxed mb-5"
            >
              Va ser catedr&agrave;tic de Bot&agrave;nica a la Universitat de
              Barcelona i director de la secci&oacute; de Bot&agrave;nica del
              Museu de Ci&egrave;ncies Naturals. La seva obra m&eacute;s
              destacada, la{" "}
              <em className="text-gray-700">
                Flora de Catalunya
              </em>
              , &eacute;s encara avui una refer&egrave;ncia fonamental.
            </motion.p>
            <motion.p
              variants={fadeUp}
              custom={4}
              className="text-gray-500 text-lg leading-relaxed mb-8"
            >
              Va crear un extens herbari amb m&eacute;s de 200.000 plecs i va
              publicar obres cab&eacute;dals com el{" "}
              <em className="text-gray-700">
                Diccionario de Bot&aacute;nica
              </em>{" "}
              i{" "}
              <em className="text-gray-700">
                Plantas Medicinales: el Diosc&oacute;rides renovado
              </em>
              . El nostre institut porta el seu nom en homenatge al seu
              llegat cient&iacute;fic i a la seva passió pel coneixement.
            </motion.p>

          </div>

          {/* Right: decorative card */}
            <motion.div
              variants={scaleIn}
              custom={2}
              className="relative"
            >
              <motion.div
                whileHover={{ y: -6, rotate: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="relative rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-indigo-50 border border-gray-100 p-10 sm:p-14 shadow-sm"
              >
                <motion.div
                  className="absolute top-6 right-6 w-20 h-20 bg-emerald-100/50 rounded-full blur-2xl"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute bottom-6 left-6 w-24 h-24 bg-purple-100/50 rounded-full blur-2xl"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                />

                <div className="relative flex gap-6">
                    {/* Photo */}
                    <div
                      className="shrink-0 w-40 sm:w-52 rounded-2xl overflow-hidden shadow-md"
                      style={{
                        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 6px, black calc(100% - 6px), transparent 100%), linear-gradient(to bottom, transparent 0%, black 6px, black calc(100% - 6px), transparent 100%)",
                        WebkitMaskComposite: "destination-in",
                        maskImage: "linear-gradient(to right, transparent 0%, black 6px, black calc(100% - 6px), transparent 100%), linear-gradient(to bottom, transparent 0%, black 6px, black calc(100% - 6px), transparent 100%)",
                        maskComposite: "intersect",
                      }}
                    >
                      <Image
                        src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/project-uploads/a1ccb738-14b3-4dc3-ae1d-ef01e48c7f15/pfq2-1770414419410.jpg?width=8000&height=8000&resize=contain"
                        alt="Pius Font i Quer"
                        width={300}
                        height={450}
                        className="w-full h-full object-cover"
                      />
                    </div>

                  {/* Info */}
                  <div className="space-y-8 flex-1">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-indigo-100 flex items-center justify-center">
                    <Leaf className="w-8 h-8 text-emerald-600" />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-bold text-gray-900">1888</span>
                      <span className="text-gray-400">&ndash;</span>
                      <span className="text-4xl font-bold text-gray-900">1964</span>
                    </div>
                    <p className="text-sm text-gray-500 uppercase tracking-widest">
                      Lleida &mdash; Barcelona
                    </p>
                  </div>

                  <div className="space-y-3">
                    {[
                      "Catedràtic de Botànica (UB)",
                      "Autor de Flora de Catalunya",
                      "Herbari de +200.000 plecs",
                      "Dioscórides renovado",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 text-sm text-gray-600"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500 shrink-0" />
                        {item}
                      </div>
                    ))}
                    </div>
                  </div>
                  </div>
              </motion.div>
            </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   WHAT WE DO (Què fem)
   ═══════════════════════════════════════════════════════ */
function Programs() {
  const programs = [
    {
      icon: BookOpen,
      title: "ESO",
      subtitle: "Educaci\u00f3 Secund\u00e0ria Obligat\u00f2ria",
      description:
        "De 1r a 4t d\u2019ESO. Formaci\u00f3 integral, atenci\u00f3 a la diversitat, tutoria personalitzada i projectes interdisciplinaris. Preparem els alumnes per al Batxillerat o els Cicles Formatius.",
      color: "blue",
    },
    {
      icon: GraduationCap,
      title: "Batxillerat",
      subtitle: "Cient\u00edfic-Tecnol\u00f2gic i Humanistic-Social",
      description:
        "Dos cursos acad\u00e8mics amb dues modalitats. Preparaci\u00f3 rigorosa per a les PAU i l\u2019acc\u00e9s a la universitat, amb orientaci\u00f3 acad\u00e8mica i professional.",
      color: "indigo",
    },
    {
      icon: Cpu,
      title: "Inform\u00e0tica i Comunicacions",
      subtitle: "CFGM Sistemes Microinform\u00e0tics i Xarxes",
      description:
        "Cicle formatiu de grau mitj\u00e0. Instal\u00b7laci\u00f3, configuraci\u00f3 i manteniment de sistemes microinform\u00e0tics, xarxes locals i serveis b\u00e0sics.",
      color: "violet",
    },
    {
      icon: Monitor,
      title: "DAW / DAM",
      subtitle: "CFGS Desenvolupament d\u2019Aplicacions",
      description:
        "Cicles de grau superior: Desenvolupament d\u2019Aplicacions Web (DAW) i Desenvolupament d\u2019Aplicacions Multiplataforma (DAM). Programaci\u00f3, bases de dades, entorns web i m\u00f2bil.",
      color: "purple",
    },
    {
      icon: BriefcaseBusiness,
      title: "Administraci\u00f3 i Gesti\u00f3",
      subtitle: "CFGM Gesti\u00f3 Administrativa",
      description:
        "Gesti\u00f3 administrativa, comptabilitat, atenci\u00f3 al client i tr\u00e0mits burocr\u00e0tics. Inclou pr\u00e0ctiques en empreses de la comarca del Bages.",
      color: "amber",
    },
    {
      icon: FlaskConical,
      title: "Sanitat i Laboratori",
      subtitle: "CFGM Cures d\u2019Auxiliar d\u2019Infermeria",
      description:
        "Formaci\u00f3 en l\u2019\u00e0mbit sanitari: cures b\u00e0siques d\u2019infermeria, higi\u00e8ne, alimentaci\u00f3 i atenci\u00f3 al pacient. Pr\u00e0ctiques en centres sanitaris.",
      color: "emerald",
    },
    {
      icon: Microscope,
      title: "Laboratori",
      subtitle: "CFGS Laboratori d\u2019An\u00e0lisi i Control de Qualitat",
      description:
        "Cicle de grau superior: an\u00e0lisis qu\u00edmiques, instrumentals i microbiol\u00f2giques. Treball en laboratoris amb equipament modern.",
      color: "teal",
    },
    {
      icon: Palette,
      title: "Activitats i Projectes",
      subtitle: "Extraescolars, Erasmus+ i Sortides",
      description:
        "Intercanvis internacionals (Erasmus+), jornades culturals, esports, teatre i projectes comunitaris que complementen la formaci\u00f3 acad\u00e8mica.",
      color: "rose",
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100",
    violet: "bg-violet-50 text-violet-600 group-hover:bg-violet-100",
    purple: "bg-purple-50 text-purple-600 group-hover:bg-purple-100",
    emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
    amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
    rose: "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
    teal: "bg-teal-50 text-teal-600 group-hover:bg-teal-100",
  };

  return (
    <section id="estudis" className="py-32 bg-geo-lines relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.div
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 uppercase tracking-widest mb-4"
          >
            <Award className="w-4 h-4" />
            Qu&egrave; fem
          </motion.div>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-6"
          >
            Oferta{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-600">
              educativa
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-gray-500 text-lg max-w-2xl mx-auto"
          >
            Una formaci&oacute; completa i diversa: des de l&apos;ESO fins als
            Cicles Formatius de Grau Superior, passant pel Batxillerat. Tot en
            un sol centre.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {programs.map((program, i) => {
            const Icon = program.icon;
            return (
                <motion.div
                  key={program.title}
                  variants={fadeUp}
                  custom={i}
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="group p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/30 hover:bg-white transition-colors duration-300 cursor-default"
                >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300 ${colorMap[program.color]}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {program.title}
                </h3>
                <p className="text-xs text-indigo-600 font-medium mb-3">
                  {program.subtitle}
                </p>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {program.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-12"
        >
          <a
            href="https://www.iespfq.cat/portal/el-centre/que-fem/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-purple-700 transition-colors"
          >
            Veure tota l&apos;oferta formativa al portal
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   FACILITIES (Instal·lacions i Equipaments)
   ═══════════════════════════════════════════════════════ */
function Facilities() {
  const facilities = [
    {
      icon: Monitor,
      title: "Aules d\u2019inform\u00e0tica",
      description:
        "M\u00faltiples aules equipades amb ordinadors d\u2019\u00faltima generaci\u00f3, projectors i connexi\u00f3 a internet d\u2019alta velocitat.",
    },
    {
      icon: FlaskConical,
      title: "Laboratoris",
      description:
        "Laboratoris de qu\u00edmica, f\u00edsica i biologia completament equipats per a pr\u00e0ctiques experimentals.",
    },
    {
      icon: Library,
      title: "Biblioteca",
      description:
        "Espai de lectura i estudi amb fons bibliogr\u00e0fic actualitzat, acc\u00e9s a internet i zones de treball en grup.",
    },
    {
      icon: Dumbbell,
      title: "Instal\u00b7lacions esportives",
      description:
        "Pista poliesportiva exterior, gimn\u00e0s cobert i zona de ping-pong per a l\u2019activitat f\u00edsica i l\u2019esbarjo.",
    },
    {
      icon: UtensilsCrossed,
      title: "Cantina",
      description:
        "Lloc per a comprar begudes, llaminadures, pizzes o cruasants.",
    },
    {
      icon: Building2,
      title: "Aules espec\u00edfiques",
      description:
        "Sales de m\u00fasica, tecnologia, dibuix i aules polivalents per a projectes i activitats especials.",
    },
  ];

  const galleryImages = [
    { src: IMAGES.pingpong, alt: "Zona de ping-pong al pati" },
    { src: IMAGES.corridor1, alt: "Passadís de l'institut" },
    { src: IMAGES.corridor2, alt: "Passadís amb colors vius" },
    { src: IMAGES.patio, alt: "Pista poliesportiva" },
  ];

  return (
    <section id="installacions" className="py-32 bg-section-alt relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.div
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 uppercase tracking-widest mb-4"
          >
            <Building2 className="w-4 h-4" />
            Equipaments i Serveis
          </motion.div>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-6"
          >
            Les nostres{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-600">
              instal&middot;lacions
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-gray-500 text-lg max-w-2xl mx-auto"
          >
            Espais moderns i ben equipats per garantir una formaci&oacute;
            pr&agrave;ctica i de qualitat.
          </motion.p>
        </motion.div>

        {/* Photo gallery */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-16"
        >
          {galleryImages.map((img, i) => (
              <motion.div
                key={img.alt}
                variants={rotateIn}
                custom={i}
                whileHover={{ scale: 1.05, rotate: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative aspect-[4/3] rounded-2xl overflow-hidden group shadow-sm"
              >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <p className="absolute bottom-3 left-3 right-3 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {img.alt}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Facility cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {facilities.map((f, i) => {
            const Icon = f.icon;
            return (
                <motion.div
                  key={f.title}
                  variants={i % 2 === 0 ? fadeSlideLeft : fadeSlideRight}
                  custom={i}
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="flex gap-4 p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-colors duration-300"
                >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {f.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {f.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

          {/* Full services list */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="mt-12 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 p-8 sm:p-10"
          >
            <motion.h3
              variants={fadeUp}
              custom={0}
              className="text-lg font-semibold text-gray-900 mb-6"
            >
              Tots els serveis i espais
            </motion.h3>
            <motion.div
              variants={fadeUp}
              custom={1}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3"
            >
              {[
                "Servei d'orientació",
                "Servei psico-pedagògic",
                "Biblioteca",
                "Club de lectura",
                "Serveis administratius",
                "Aules d'informàtica",
                "Laboratori de Física i Química",
                "Laboratori de Ciències Naturals",
                "Aules de Tecnologia",
                "Aula d'Anglès",
                "Aula de Francès",
                "Aula de Música",
                "Aula de Dibuix",
                "Aula d'Àudiovisuals",
                "Gimnàs",
                "Patis i camps d'esport",
                "Hivernacle",
                "Taller de manteniment",
                "Servei de copisteria",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 text-sm text-gray-600"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 shrink-0" />
                  {item}
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center mt-12"
          >
            <a
              href="https://www.iespfq.cat/portal/el-centre/equipaments-i-serveis/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-purple-700 transition-colors"
            >
              M&eacute;s sobre equipaments i serveis
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   VALUES
   ═══════════════════════════════════════════════════════ */
function Values() {
  const values = [
    {
      icon: Target,
      title: "Excel\u00b7l\u00e8ncia",
      description:
        "Busquem el m\u00e0xim rendiment acad\u00e8mic amb rigor i exig\u00e8ncia constructiva.",
    },
    {
      icon: Heart,
      title: "Inclusi\u00f3",
      description:
        "Atenem la diversitat i garantim la igualtat d\u2019oportunitats per a tothom.",
    },
    {
      icon: Globe,
      title: "Innovaci\u00f3",
      description:
        "Incorporem noves metodologies i tecnologies per a un aprenentatge actiu.",
    },
    {
      icon: Users,
      title: "Comunitat",
      description:
        "Fomentem la participaci\u00f3, el respecte i la conviv\u00e8ncia en un entorn col\u00b7laboratiu.",
    },
  ];

  return (
    <section id="valors" className="py-32 bg-geo-lines relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-sm font-semibold text-indigo-700 uppercase tracking-widest mb-4"
          >
            Filosofia
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight"
          >
            Els nostres{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-600">
              valors
            </span>
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {values.map((value, i) => {
            const Icon = value.icon;
            return (
                <motion.div
                  key={value.title}
                  variants={scaleIn}
                  custom={i}
                  whileHover={{ y: -8 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="text-center group"
                >
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                    className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center mx-auto mb-5 group-hover:from-blue-100 group-hover:to-purple-100 transition-all duration-300"
                  >
                  <Icon className="w-7 h-7 text-indigo-600" />
                  </motion.div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {value.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {value.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   CTA + AMPA
   ═══════════════════════════════════════════════════════ */
function CTA() {
  return (
    <section className="py-32 bg-section-alt relative">
      <div className="max-w-6xl mx-auto px-6 space-y-8">
        {/* Main CTA */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="relative rounded-3xl bg-gradient-to-br from-blue-800 via-indigo-800 to-purple-800 p-12 sm:p-16 text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(139,92,246,0.2),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.15),transparent_50%)]" />
            {/* Animated glows */}
            <motion.div
              className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3], x: [0, 20, 0], y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-0 left-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            />

          <div className="relative z-10">
            <motion.h2
              variants={fadeUp}
              custom={0}
              className="text-3xl sm:text-5xl font-bold text-white tracking-tight mb-6"
            >
              Comen&ccedil;a el teu futur aqu&iacute;
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={1}
              className="text-indigo-200/80 text-lg max-w-xl mx-auto mb-10"
            >
              Vine a con&egrave;ixer el nostre centre, les nostres
              instal&middot;lacions i el nostre equip. T&apos;esperem!
            </motion.p>
            <motion.div
              variants={fadeUp}
              custom={2}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <a
                href="https://www.iespfq.cat/portal/"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-gray-900 font-medium hover:bg-gray-100 transition-colors shadow-lg shadow-black/10"
              >
                Visita el Portal
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#contacte"
                className="px-7 py-3.5 rounded-full border border-white/20 text-white font-medium hover:bg-white/10 transition-colors"
              >
                Contacta&apos;ns
              </a>
            </motion.div>
          </div>
        </motion.div>

        {/* AMPA card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-6 shadow-sm"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <Users className="w-7 h-7 text-amber-600" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              AMPA Pius Font i Quer
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              L&apos;Associaci&oacute; de Mares i Pares d&apos;Alumnes
              col&middot;labora activament amb el centre per millorar
              l&apos;experi&egrave;ncia educativa, organitzar activitats i
              representar les fam&iacute;lies.
            </p>
          </div>
          <a
            href="https://sites.google.com/site/ampapiusfontiquer/home"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors"
          >
            Web AMPA
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   SOCIAL / XARXES SOCIALS
   ═══════════════════════════════════════════════════════ */
function Social() {
  return (
    <section id="xarxes" className="py-32 bg-geo-lines relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.div
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 uppercase tracking-widest mb-4"
          >
            <Globe className="w-4 h-4" />
            Connecta amb nosaltres
          </motion.div>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-6"
          >
            Xarxes{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-600">
              socials
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-gray-500 text-lg max-w-2xl mx-auto"
          >
            Seguiu-nos a les xarxes per estar al dia de totes les novetats del
            centre.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto"
        >
          {/* Telegram */}
          <motion.a
            href="https://t.me/afainspfq"
            target="_blank"
            rel="noopener noreferrer"
            variants={fadeSlideLeft}
            custom={0}
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="group relative rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 hover:border-sky-200 hover:shadow-lg hover:shadow-sky-100/30 p-8 transition-colors duration-300 overflow-hidden"
          >
            <motion.div
              className="absolute -top-10 -right-10 w-32 h-32 bg-sky-100/40 rounded-full blur-2xl"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-50 to-sky-100 flex items-center justify-center mb-5 group-hover:from-sky-100 group-hover:to-sky-200 transition-colors duration-300">
                <svg className="w-6 h-6 text-sky-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Telegram
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                Uniu-vos al nou canal de difusi&oacute; Telegram. Cal que us
                descarregeu l&apos;aplicaci&oacute; Telegram al vostre
                m&ograve;bil i cliqueu en l&apos;enlla&ccedil;.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 group-hover:text-sky-700 transition-colors">
                @afainspfq
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </motion.a>

          {/* Instagram */}
          <motion.a
            href="https://www.instagram.com/afainspfq"
            target="_blank"
            rel="noopener noreferrer"
            variants={fadeSlideRight}
            custom={0}
            whileHover={{ y: -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="group relative rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 hover:border-pink-200 hover:shadow-lg hover:shadow-pink-100/30 p-8 transition-colors duration-300 overflow-hidden"
          >
            <motion.div
              className="absolute -top-10 -right-10 w-32 h-32 bg-pink-100/40 rounded-full blur-2xl"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-50 to-purple-100 flex items-center justify-center mb-5 group-hover:from-pink-100 group-hover:to-purple-200 transition-colors duration-300">
                <svg className="w-6 h-6 text-pink-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Instagram
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                Busqueu el nostre perfil a Instagram, seguiu-nos i no us perdeu
                cap novetat del centre.
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-pink-600 group-hover:text-pink-700 transition-colors">
                @afainspfq
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   LOCATION (On som)
   ═══════════════════════════════════════════════════════ */
function Contact() {
  const info = [
    {
      icon: MapPin,
      title: "Adre\u00e7a",
      lines: [
        "Avinguda de les Bases de Manresa, 3",
        "08242 Manresa, Barcelona",
      ],
    },
    {
      icon: Phone,
      title: "Tel\u00e8fon",
      lines: ["938 72 08 04"],
    },
    {
      icon: Mail,
      title: "Email",
      lines: ["a8019077@xtec.cat"],
    },
    {
      icon: Clock,
      title: "Horari",
      lines: ["Dilluns a Divendres", "8:00 \u2013 21:00"],
    },
  ];

  return (
    <section id="contacte" className="py-32 bg-geo-lines relative">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="text-center mb-16"
        >
          <motion.div
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 uppercase tracking-widest mb-4"
          >
            <MapPin className="w-4 h-4" />
            On som
          </motion.div>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-6"
          >
            Vine a{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-purple-600">
              veure&apos;ns
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-gray-500 text-lg max-w-2xl mx-auto"
          >
            Ens trobar&agrave;s al barri de la Font dels Capellans, ben comunicat
            amb transport p&uacute;blic i amb f&agrave;cil acc&eacute;s des de
            qualsevol punt de Manresa i rodalies.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          {info.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                variants={fadeUp}
                custom={i}
                className="p-6 rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 hover:border-indigo-200 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                {item.lines.map((line) => (
                  <p key={line} className="text-sm text-gray-500">
                    {line}
                  </p>
                ))}
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl overflow-hidden border border-gray-100 h-80 shadow-sm"
        >
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2977.8!2d1.8287!3d41.7275!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12a4f9a0e0b0b0b0%3A0x0!2sIES+Pius+Font+i+Quer!5e0!3m2!1sca!2ses!4v1700000000000"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Mapa IES Pius Font i Quer"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-8"
        >
          <a
            href="https://www.iespfq.cat/portal/el-centre/on-som/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-700 hover:text-purple-700 transition-colors"
          >
            Com arribar-hi
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer className="py-12 border-t border-indigo-100/50 bg-white/60 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-700 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">PFQ</span>
            </div>
            <span className="text-sm text-gray-500">
              IES Pius Font i Quer &mdash; Manresa
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <a
              href="https://www.iespfq.cat/portal/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-indigo-700 transition-colors"
            >
              Portal Oficial
            </a>
            <a
              href="https://www.iespfq.cat/portal/el-centre/un-xic-dhistoria/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-indigo-700 transition-colors"
            >
              Hist&ograve;ria
            </a>
            <a
              href="https://sites.google.com/site/ampapiusfontiquer/home"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-indigo-700 transition-colors"
            >
              AMPA
            </a>
            <span className="text-sm text-gray-300 hidden sm:inline">|</span>
            <span className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} Tots els drets reservats
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <HistorySection />
      <PiusBio />
      <Programs />
      <Facilities />
      <Values />
        <CTA />
        <Social />
        <Contact />
      <Footer />
    </div>
  );
}
