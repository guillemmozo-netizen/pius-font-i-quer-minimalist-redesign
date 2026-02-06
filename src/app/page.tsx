"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
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
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] },
  }),
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

function Navbar() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-white/80 border-b border-gray-100"
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-700 flex items-center justify-center">
            <span className="text-white font-bold text-sm">PFQ</span>
          </div>
          <span className="font-semibold text-gray-900 hidden sm:block">
            Pius Font i Quer
          </span>
        </a>
        <div className="flex items-center gap-8">
          <a
            href="#sobre"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden md:block"
          >
            Sobre Nosaltres
          </a>
          <a
            href="#estudis"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden md:block"
          >
            Estudis
          </a>
          <a
            href="#valors"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden md:block"
          >
            Valors
          </a>
          <a
            href="#contacte"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden md:block"
          >
            Contacte
          </a>
          <a
            href="https://www.iespfq.cat/portal/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium px-4 py-2 rounded-full bg-gray-900 text-white hover:bg-gray-700 transition-colors"
          >
            Portal
          </a>
        </div>
      </div>
    </motion.nav>
  );
}

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
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
      {/* Decorative shapes */}
      <motion.div
        style={{ y }}
        className="absolute top-20 right-20 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl"
      />
      <motion.div
        style={{ y: useTransform(scrollYProgress, [0, 1], [0, 80]) }}
        className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-100/30 rounded-full blur-3xl"
      />

      <motion.div
        style={{ opacity }}
        className="relative z-10 max-w-4xl mx-auto px-6 text-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100/80 text-blue-700 text-sm font-medium mb-8"
        >
          <Sparkles className="w-4 h-4" />
          Institut d&apos;Educaci&oacute; Secund&agrave;ria
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl sm:text-7xl font-bold text-gray-900 tracking-tight leading-[1.1] mb-6"
        >
          Pius Font
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600">
            i Quer
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Formem el futur a Manresa. Educaci&oacute; de qualitat en ESO,
          Batxillerat i Cicles Formatius amb innovaci&oacute; i
          comprom&iacute;s.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#estudis"
            className="group flex items-center gap-2 px-7 py-3.5 rounded-full bg-gray-900 text-white font-medium hover:bg-gray-700 transition-all"
          >
            Descobreix els Estudis
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#contacte"
            className="px-7 py-3.5 rounded-full border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Contacta&apos;ns
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
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </motion.div>
    </section>
  );
}

function About() {
  const stats = [
    { number: "1970", label: "Any de fundaci\u00f3" },
    { number: "1200+", label: "Alumnes" },
    { number: "100+", label: "Professors" },
    { number: "50+", label: "Anys d\u2019excel\u00b7l\u00e8ncia" },
  ];

  return (
    <section id="sobre" className="py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="grid md:grid-cols-2 gap-16 items-center"
        >
          <div>
            <motion.p
              variants={fadeUp}
              custom={0}
              className="text-sm font-semibold text-blue-700 uppercase tracking-widest mb-4"
            >
              Sobre Nosaltres
            </motion.p>
            <motion.h2
              variants={fadeUp}
              custom={1}
              className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-6"
            >
              Educaci&oacute; amb
              <br />
              valors i futur
            </motion.h2>
            <motion.p
              variants={fadeUp}
              custom={2}
              className="text-gray-500 text-lg leading-relaxed mb-6"
            >
              L&apos;IES Pius Font i Quer &eacute;s un centre educatiu p&uacute;blic situat a
              Manresa, referent en la formaci&oacute; integral dels seus alumnes
              des de fa m&eacute;s de cinc d&egrave;cades.
            </motion.p>
            <motion.p
              variants={fadeUp}
              custom={3}
              className="text-gray-500 text-lg leading-relaxed"
            >
              Oferim una educaci&oacute; de qualitat que combina
              excel&middot;l&egrave;ncia acad&egrave;mica, innovaci&oacute;
              pedag&ograve;gica i atenci&oacute; personalitzada, preparant els
              nostres estudiants per als reptes del futur.
            </motion.p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="grid grid-cols-2 gap-4"
          >
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={fadeUp}
                custom={i}
                className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-100 hover:bg-blue-50/30 transition-colors duration-300"
              >
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {stat.number}
                </div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Programs() {
  const programs = [
    {
      icon: BookOpen,
      title: "ESO",
      subtitle: "Educaci\u00f3 Secund\u00e0ria Obligat\u00f2ria",
      description:
        "Formaci\u00f3 integral de 1r a 4t d\u2019ESO amb atenci\u00f3 a la diversitat i projectes interdisciplinaris.",
      color: "blue",
    },
    {
      icon: GraduationCap,
      title: "Batxillerat",
      subtitle: "Cient\u00edfic, Human\u00edstic i Social",
      description:
        "Preparaci\u00f3 per a la universitat amb excel\u00b7l\u00e8ncia acad\u00e8mica i orientaci\u00f3 personalitzada.",
      color: "indigo",
    },
    {
      icon: Cpu,
      title: "Inform\u00e0tica",
      subtitle: "Cicles Formatius",
      description:
        "Desenvolupament d\u2019aplicacions web i multiplataforma. Administraci\u00f3 de sistemes inform\u00e0tics.",
      color: "violet",
    },
    {
      icon: FlaskConical,
      title: "Ci\u00e8ncies",
      subtitle: "Laboratori i Recerca",
      description:
        "An\u00e0lisis cl\u00edniques, qu\u00edmica i laboratoris amb equipament modern i pr\u00e0ctiques reals.",
      color: "emerald",
    },
    {
      icon: Users,
      title: "Administraci\u00f3",
      subtitle: "Gesti\u00f3 Empresarial",
      description:
        "Administraci\u00f3 i finances, gesti\u00f3 administrativa amb pr\u00e0ctiques en empreses del territori.",
      color: "amber",
    },
    {
      icon: Palette,
      title: "Activitats",
      subtitle: "Extraescolars i Projectes",
      description:
        "Esports, arts, intercanvis internacionals i projectes comunitaris que enriqueixen la formaci\u00f3.",
      color: "rose",
    },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100",
    violet: "bg-violet-50 text-violet-600 group-hover:bg-violet-100",
    emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
    amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
    rose: "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
  };

  return (
    <section id="estudis" className="py-32 bg-gray-50/50">
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
            className="text-sm font-semibold text-blue-700 uppercase tracking-widest mb-4"
          >
            Oferta Educativa
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-6"
          >
            Els nostres estudis
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-gray-500 text-lg max-w-2xl mx-auto"
          >
            Una oferta formativa &agrave;mplia i diversa per a cada etapa del
            teu cam&iacute; educatiu.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {programs.map((program, i) => {
            const Icon = program.icon;
            return (
              <motion.div
                key={program.title}
                variants={fadeUp}
                custom={i}
                className="group p-7 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100/50 transition-all duration-300 cursor-default"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors duration-300 ${colorMap[program.color]}`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-1">
                  {program.title}
                </h3>
                <p className="text-sm text-blue-600 font-medium mb-3">
                  {program.subtitle}
                </p>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {program.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

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
        "Incorporem noves metodologies i tecnologies per a un aprenentatge actiu i significatiu.",
    },
    {
      icon: Users,
      title: "Comunitat",
      description:
        "Fomentem la participaci\u00f3, el respecte i la conviv\u00e8ncia en un entorn col\u00b7laboratiu.",
    },
  ];

  return (
    <section id="valors" className="py-32 bg-white">
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
            className="text-sm font-semibold text-blue-700 uppercase tracking-widest mb-4"
          >
            Filosofia
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight"
          >
            Els nostres valors
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
                variants={fadeUp}
                custom={i}
                className="text-center group"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5 group-hover:bg-blue-100 transition-colors duration-300">
                  <Icon className="w-7 h-7 text-blue-600" />
                </div>
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

function CTA() {
  return (
    <section className="py-32 bg-gray-50/50">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="relative rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-12 sm:p-16 text-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(99,102,241,0.1),transparent_50%)]" />

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
              className="text-gray-400 text-lg max-w-xl mx-auto mb-10"
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
                className="group flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-gray-900 font-medium hover:bg-gray-100 transition-colors"
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
      </div>
    </section>
  );
}

function Contact() {
  const info = [
    {
      icon: MapPin,
      title: "Adre\u00e7a",
      lines: ["Avinguda de les Bases de Manresa, 3", "08242 Manresa, Barcelona"],
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
      lines: ["Dilluns a Divendres", "8:00 - 21:00"],
    },
  ];

  return (
    <section id="contacte" className="py-32 bg-white">
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
            className="text-sm font-semibold text-blue-700 uppercase tracking-widest mb-4"
          >
            Contacte
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight mb-6"
          >
            Vine a veure&apos;ns
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="text-gray-500 text-lg max-w-2xl mx-auto"
          >
            Estem al cor de Manresa, ben comunicats i amb les portes obertes.
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
                className="p-6 rounded-2xl bg-gray-50 border border-gray-100"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-blue-600" />
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
          className="rounded-2xl overflow-hidden border border-gray-100 h-80"
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
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 bg-gray-50 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center">
              <span className="text-white font-bold text-xs">PFQ</span>
            </div>
            <span className="text-sm text-gray-500">
              IES Pius Font i Quer &mdash; Manresa
            </span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://www.iespfq.cat/portal/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
            >
              Portal Oficial
            </a>
            <span className="text-sm text-gray-300">|</span>
            <span className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} Tots els drets reservats
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <About />
      <Programs />
      <Values />
      <CTA />
      <Contact />
      <Footer />
    </div>
  );
}
