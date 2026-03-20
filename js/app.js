const app = document.getElementById("app");
const startGate = document.getElementById("startGate");
const screens = [...document.querySelectorAll(".screen")];
const salaOptions = document.getElementById("salaOptions");
const generoOptions = document.getElementById("generoOptions");
const alumnoOptions = document.getElementById("alumnoOptions");
const propuestaOptions = document.getElementById("propuestaOptions");
const backButtons = [...document.querySelectorAll("[data-go-step]")];
const modal = document.getElementById("confirmModal");
const confirmYes = document.getElementById("confirmYes");
const confirmNo = document.getElementById("confirmNo");
const toast = document.getElementById("toast");
let toastTimeoutId = null;
let alumnosRequestSeq = 0;
let cargandoAlumnos = false;

const state = {
  pasoActual: 1,
  inicioCompletado: false,
  sala: null,
  genero: null,
  alumno: null,
  propuesta: null,
  salas: [],
  generos: [],
  alumnosFiltrados: [],
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

const MENSAJE_ALUMNO_YA_VOTO =
  "UPS... ESTE CHICO YA VOTO. SI ES UN ERROR, AVISALE A TU MAESTRO O MAESTRA PARA QUE LO SOLUCIONE";
const EXTENSIONES_IMAGEN_PROPUESTA = ["jpeg", "jpg", "png", "webp"];

function aMayusculas(valor) {
  return String(valor ?? "").toUpperCase();
}

function normalizarTexto(valor) {
  return aMayusculas(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

function actualizarLayoutAlumnos() {
  const cantidad = state.alumnosFiltrados.length;
  alumnoOptions.classList.toggle("is-compact", cantidad > 8);
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

function crearBotonOpcion(texto, onClick, extraClass = "", opciones = {}) {
  const { disabled = false, onDisabledClick = null } = opciones;
  const button = document.createElement("button");
  button.type = "button";
  button.className = `option-btn ${extraClass}`.trim();
  button.textContent = aMayusculas(texto);

  if (disabled) {
    button.setAttribute("aria-disabled", "true");
  }

  button.addEventListener("click", (event) => {
    if (disabled) {
      event.preventDefault();
      if (typeof onDisabledClick === "function") {
        onDisabledClick();
      }
      return;
    }

    onClick();
  });

  if (disabled) {
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (typeof onDisabledClick === "function") {
          onDisabledClick();
        }
      }
    });
  }

  return button;
}

function limpiarDesdePaso(paso) {
  if (paso <= 1) {
    state.sala = null;
  }
  if (paso <= 2) {
    state.genero = null;
  }
  if (paso <= 3) {
    state.alumno = null;
    state.alumnosFiltrados = [];
  }
  if (paso <= 4) {
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

  const [salasRes, generosRes] = await Promise.all([
    supabase.from("sala").select("id,nombre_sala").order("id", { ascending: true }),
    supabase.from("genero").select("id,genero").order("id", { ascending: true })
  ]);

  if (salasRes.error) {
    throw salasRes.error;
  }

  if (generosRes.error) {
    throw generosRes.error;
  }

  state.salas = salasRes.data || [];
  state.generos = generosRes.data || [];

  renderSalas();
  renderGeneros();
}

function renderSalas() {
  salaOptions.innerHTML = "";
  state.salas.forEach((sala) => {
    const btn = crearBotonOpcion(sala.nombre_sala, () => {
      state.sala = sala;
      limpiarDesdePaso(2);
      irAPaso(2);
    });
    salaOptions.appendChild(btn);
  });
}

function renderGeneros() {
  generoOptions.innerHTML = "";
  state.generos.forEach((genero) => {
    const generoNormalizado = normalizarTexto(genero.genero);
    let claseGenero = "genero-btn";

    if (generoNormalizado.includes("NINO")) {
      claseGenero += " genero-nino";
    } else if (generoNormalizado.includes("NINA")) {
      claseGenero += " genero-nina";
    }

    const btn = crearBotonOpcion(genero.genero, async () => {
      if (cargandoAlumnos) {
        return;
      }

      cargandoAlumnos = true;
      state.genero = genero;
      state.alumno = null;
      state.propuesta = null;

      try {
        await cargarAlumnosFiltrados();
        irAPaso(3);
      } finally {
        cargandoAlumnos = false;
      }
    }, claseGenero);
    generoOptions.appendChild(btn);
  });
}

async function cargarAlumnosFiltrados() {
  const requestId = ++alumnosRequestSeq;
  const salaId = state.sala?.id;
  const generoId = state.genero?.id;

  if (!salaId || !generoId) {
    return;
  }

  const { data, error } = await supabase
    .from("alumno")
    .select("id,nombre,id_sala,id_genero")
    .eq("id_sala", salaId)
    .eq("id_genero", generoId)
    .order("nombre", { ascending: true });

  if (error) {
    throw error;
  }

  if (requestId !== alumnosRequestSeq) {
    return;
  }

  state.alumnosFiltrados = data || [];
  alumnoOptions.innerHTML = "";
  actualizarLayoutAlumnos();

  if (state.alumnosFiltrados.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = aMayusculas("No hay alumnos para esta seleccion");
    alumnoOptions.appendChild(empty);
    return;
  }

  const idsAlumnos = state.alumnosFiltrados.map((alumno) => alumno.id);
  const { data: votosExistentes, error: errorVotos } = await supabase
    .from("votacion")
    .select("id_alumno")
    .in("id_alumno", idsAlumnos);

  if (errorVotos) {
    throw errorVotos;
  }

  if (requestId !== alumnosRequestSeq) {
    return;
  }

  const alumnosQueYaVotaron = new Set(
    (votosExistentes || []).map((voto) => voto.id_alumno)
  );

  state.alumnosFiltrados.forEach((alumno) => {
    const yaVoto = alumnosQueYaVotaron.has(alumno.id);
    let claseExtra = "";

    if (alumno.id_genero === 1) {
      claseExtra += " alumno-nino";
    } else if (alumno.id_genero === 2) {
      claseExtra += " alumno-nina";
    }

    if (yaVoto) {
      claseExtra += " alumno-votado is-disabled";
    }

    const btn = crearBotonOpcion(
      alumno.nombre,
      async () => {
        state.alumno = alumno;
        state.propuesta = null;
        await cargarPropuestasDeSala();
        irAPaso(4);
      },
      claseExtra.trim(),
      {
        disabled: yaVoto,
        onDisabledClick: () => mostrarToast(MENSAJE_ALUMNO_YA_VOTO)
      }
    );

    alumnoOptions.appendChild(btn);
  });
}

async function alumnoYaVoto(idAlumno) {
  const { data, error } = await supabase
    .from("votacion")
    .select("id_alumno")
    .eq("id_alumno", idAlumno)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
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

    btn.addEventListener("click", () => {
      state.propuesta = propuesta;
      abrirModal();
    });

    propuestaOptions.appendChild(btn);
  });
}

function abrirModal() {
  modal.classList.remove("hidden");
}

function cerrarModal() {
  modal.classList.add("hidden");
}

async function confirmarVoto() {
  if (!state.alumno || !state.propuesta) {
    mostrarToast("Falta seleccionar alumno o propuesta");
    return;
  }

  confirmYes.disabled = true;
  confirmNo.disabled = true;

  try {
    // Doble validacion para reforzar el control de voto unico.
    const yaVoto = await alumnoYaVoto(state.alumno.id);
    if (yaVoto) {
      mostrarToast(MENSAJE_ALUMNO_YA_VOTO);
      cerrarModal();
      return;
    }

    const { error } = await supabase.from("votacion").insert({
      id_alumno: state.alumno.id,
      id_propuesta: state.propuesta.id
    });

    if (error) {
      if (error.code === "23505") {
        mostrarToast(MENSAJE_ALUMNO_YA_VOTO);
        cerrarModal();
        return;
      }
      throw error;
    }

    cerrarModal();
    lanzarConfetis(120);
    irAPaso(5);
  } finally {
    confirmYes.disabled = false;
    confirmNo.disabled = false;
  }
}

function reiniciarFlujo() {
  limpiarDesdePaso(1);
  irAPaso(1);
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

  confirmNo.addEventListener("click", () => {
    cerrarModal();
    state.propuesta = null;
  });

  confirmYes.addEventListener("click", async () => {
    try {
      await confirmarVoto();
    } catch (error) {
      console.error(error);
      mostrarToast("No se pudo registrar el voto");
    }
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      cerrarModal();
    }
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
