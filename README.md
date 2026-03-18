# Sistema de Votacion - Sala 5

Aplicacion web en HTML, CSS y JavaScript conectada a Supabase (PostgreSQL).
Incluye:

- Flujo guiado para votar en 5 pantallas.
- Filtro de alumnos por sala y genero.
- Confirmacion de voto por modal.
- Control de voto unico por alumno.

## Estructura del proyecto

- `index.html`: pagina de votacion por pasos.
- `css/styles.css`: estilos visuales (enfoque infantil, botones grandes, responsive).
- `js/app.js`: logica principal de votacion.
- `js/supabase-config.js`: configuracion del cliente Supabase.
- `images/Fondo Inicio.png`: fondo global inicial.
- `images/Fondo Paginas.png`: fondo global luego del primer clic.

## 1) Base de datos en Supabase

La base de datos ya esta creada.
Solo verifica que existan las tablas:
   - `genero`
   - `sala`
   - `alumno`
   - `propuestas`
   - `votacion`

## 2) Configurar credenciales frontend

Edita `js/supabase-config.js`:

```js
window.SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
window.SUPABASE_ANON_KEY = "TU_ANON_KEY";
```

Estos datos estan en Supabase > Project Settings > API.

## 3) Cargar imagenes de fondo

1. Copia tus imagenes a `images/`.
2. Usa los nombres `Fondo Inicio.png` y `Fondo Paginas.png`.
3. Si cambias nombres, ajusta las rutas en `css/styles.css`.

## 4) Ejecutar localmente

Como es un sitio estatico, puedes abrir `index.html` directamente.
Para mejor compatibilidad, usa un servidor local (por ejemplo Live Server en VS Code).

## 5) Despliegue

### GitHub Pages

1. Sube estos archivos a un repositorio.
2. En Settings > Pages, selecciona la rama principal y carpeta `/root`.
3. Publica.

### Vercel

1. Importa el repositorio en Vercel.
2. Framework preset: `Other`.
3. Deploy.

## Reglas de negocio implementadas

- Un alumno solo puede votar una vez:
  - `votacion.id_alumno` es PRIMARY KEY.
  - En frontend se valida antes de insertar.
- Integridad referencial con claves foraneas.

## Flujo de pantalla

1. Pantalla inicial con fondo `Fondo Inicio.png`.
2. Al hacer clic en cualquier parte, el fondo global cambia a `Fondo Paginas.png`.
3. Seleccion de sala.
4. Seleccion de genero.
5. Seleccion de alumno (filtrado por sala + genero).
6. Seleccion de propuesta (filtrada por sala) + modal de confirmacion.
7. Pantalla final: "Muy bien, ya votaste".

## Recomendacion para alumnos de 5 anos

- Mantener lista de alumnos corta y ordenada alfabeticamente.
- Usar nombres de propuestas simples y cortos.
- Elegir un fondo con alto contraste para mejor lectura de botones.
