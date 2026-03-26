const app = document.getElementById("app");
const startGate = document.getElementById("startGate");
const screens = [...document.querySelectorAll(".screen")];
const salaOptions = document.getElementById("salaOptions");
const propuestaOptions = document.getElementById("propuestaOptions");
const backButtons = [...document.querySelectorAll("[data-go-step]")];
const toast = document.getElementById("toast");
let toastTimeoutId = null;
let votando = false;

const state = {
  pasoActual: 1,
  inicioCompletado: false,
  sala: null,
  propuesta: null,
  salas: [],
  propuestasFiltradas: []
};

const hasConfig =
  typeof window.SUPABASE_URL === "string" &&
  typeof window.SUPABASE_ANON_KEY === "string" &&
  window.SUPABASE_URL.startsWith("https://") &&
  !window.SUPABASE_URL.includes("TU-PROYECTO") &&
  !window.SUPABASE_ANON_KEY.includes("TU_ANON_KEY");

const supabase = hasConfig
  ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
  : null;

const EXTENSIONES_IMAGEN_PROPUESTA = ["jpg", "jpeg", "png", "webp"];

function aMayusculas(valor) {
  return String(valor ?? "").toUpperCase();
}

function textoSinAcentos(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function generarCandidatosImagenPropuesta(nombrePropuesta) {
  const original = String(nombrePropuesta ?? "").trim();
  const sinAcentos = textoSinAcentos(nombrePropuesta);
  const slug = sinAcentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const junto = sinAcentos.replace(/[^a-z0-9]/gi, "");
  const lower = sinAcentos.toLowerCase();
  const upper = sinAcentos.toUpperCase();
  const capitalizado = lower.replace(/\b\w/g, (letra) => letra.toUpperCase());

  const bases = [...new Set([original, sinAcentos, lower, upper, capitalizado, slug, junto])]
    .map((base) => base.trim())
    .filter(Boolean);

  const urls = [];
  bases.forEach((base) => {
    EXTENSIONES_IMAGEN_PROPUESTA.forEach((extension) => {
      urls.push(`images/images-propuestas/${base}.${extension}`);
    });
  });

  return urls;
}

function crearImagenPropuesta(nombrePropuesta) {
  const imagen = document.createElement("img");
  const candidatos = generarCandidatosImagenPropuesta(nombrePropuesta);
  let indiceActual = 0;

  imagen.className = "propuesta-img";
  imagen.alt = aMayusculas(nombrePropuesta);
  imagen.loading = "lazy";

  const cargarSiguiente = () => {
    if (indiceActual >= candidatos.length) {
      imagen.classList.add("hidden");
      return;
    }

    imagen.src = candidatos[indiceActual];
    indiceActual += 1;
  };

  imagen.addEventListener("error", cargarSiguiente);
  cargarSiguiente();
  return imagen;
}

function irAPaso(numeroPaso) {
  state.pasoActual = numeroPaso;
  screens.forEach((screen) => {
    const isTarget = Number(screen.dataset.step) === numeroPaso;
    screen.classList.toggle("screen-active", isTarget);
  });
}

function activarInicio() {
  if (state.inicioCompletado) {
    return;
  }

  state.inicioCompletado = true;
  document.body.classList.remove("inicio-mode");
  document.body.classList.add("paginas-mode");
  startGate.classList.add("hidden");
  app.classList.remove("hidden");
  irAPaso(1);
}

function mostrarToast(mensaje, duracion = 5000) {
  toast.textContent = aMayusculas(mensaje);
  toast.classList.remove("hidden");

  if (toastTimeoutId) {
    window.clearTimeout(toastTimeoutId);
  }

  toastTimeoutId = window.setTimeout(() => {
    toast.classList.add("hidden");
    toastTimeoutId = null;
  }, duracion);
}

function lanzarConfetis(cantidad = 120) {
  const colores = ["#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff9f1c", "#f15bb5"];
  const layer = document.createElement("div");
  layer.className = "confetti-layer";

  for (let i = 0; i < cantidad; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";

    const width = 6 + Math.random() * 8;
    const height = 8 + Math.random() * 12;
    const startX = Math.random() * 100;
    const drift = (Math.random() - 0.5) * 240;
    const duration = 2200 + Math.random() * 1400;
    const delay = Math.random() * 300;
    const color = colores[Math.floor(Math.random() * colores.length)];

    piece.style.left = `${startX}vw`;
    piece.style.width = `${width.toFixed(1)}px`;
    piece.style.height = `${height.toFixed(1)}px`;
    piece.style.background = color;
    piece.style.setProperty("--drift-x", `${drift.toFixed(1)}px`);
    piece.style.animationDuration = `${duration.toFixed(0)}ms`;
    piece.style.animationDelay = `${delay.toFixed(0)}ms`;

    layer.appendChild(piece);
  }

  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), 4200);
}

function crearBotonOpcion(texto, onClick, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `option-btn ${extraClass}`.trim();
  button.textContent = aMayusculas(texto);
  button.addEventListener("click", onClick);
  return button;
}

function limpiarDesdePaso(paso) {
  if (paso <= 1) {
    state.sala = null;
  }
  if (paso <= 2) {
    state.propuesta = null;
    state.propuestasFiltradas = [];
  }
}

async function cargarCatalogos() {
  if (!supabase) {
    throw new Error(
      "Falta configurar js/supabase-config.js con SUPABASE_URL y SUPABASE_ANON_KEY"
    );
  }

  const { data, error } = await supabase
    .from("sala")
    .select("id,nombre_sala")
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  state.salas = data || [];
  renderSalas();
}

function renderSalas() {
  salaOptions.innerHTML = "";

  state.salas.forEach((sala) => {
    const btn = crearBotonOpcion(sala.nombre_sala, async () => {
      state.sala = sala;
      limpiarDesdePaso(2);

      try {
        await cargarPropuestasDeSala();
        irAPaso(2);
      } catch (error) {
        console.error(error);
        mostrarToast("No se pudieron cargar las propuestas");
      }
    });

    salaOptions.appendChild(btn);
  });
}

async function cargarPropuestasDeSala() {
  propuestaOptions.innerHTML = "";

  const { data, error } = await supabase
    .from("propuestas")
    .select("id,nombre_propuesta,id_sala")
    .eq("id_sala", state.sala.id)
    .order("id", { ascending: true });

  if (error) {
    throw error;
  }

  state.propuestasFiltradas = data || [];

  if (state.propuestasFiltradas.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = aMayusculas("No hay propuestas disponibles para esta sala");
    propuestaOptions.appendChild(empty);
    return;
  }

  state.propuestasFiltradas.forEach((propuesta) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn propuesta-btn";
    btn.setAttribute("aria-label", aMayusculas(propuesta.nombre_propuesta));

    const imagen = crearImagenPropuesta(propuesta.nombre_propuesta);
    btn.appendChild(imagen);

    btn.addEventListener("click", async () => {
      state.propuesta = propuesta;
      try {
        await confirmarVoto();
      } catch (error) {
        console.error(error);
        mostrarToast("No se pudo registrar el voto");
      }
    });

    propuestaOptions.appendChild(btn);
  });
}

async function confirmarVoto() {
  if (votando) {
    return;
  }

  if (!state.propuesta) {
    mostrarToast("Falta seleccionar propuesta");
    return;
  }

  votando = true;

  try {
    const { error } = await supabase.from("votacion").insert({
      id_propuesta: state.propuesta.id,
      fecha_voto: new Date().toISOString()
    });

    if (error) {
      throw error;
    }

    lanzarConfetis(120);
    irAPaso(3);
  } finally {
    votando = false;
  }
}

function registrarEventos() {
  startGate.addEventListener("click", activarInicio);
  startGate.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activarInicio();
    }
  });

  backButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetStep = Number(btn.dataset.goStep);
      limpiarDesdePaso(targetStep + 1);
      irAPaso(targetStep);
    });
  });

}

async function init() {
  registrarEventos();

  if (!supabase) {
    mostrarToast("Configura Supabase para comenzar", 5000);
    return;
  }

  try {
    await cargarCatalogos();
  } catch (error) {
    console.error(error);
    mostrarToast("Error cargando datos. Revisa tu base de datos", 5000);
  }
}

init();
