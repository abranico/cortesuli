# Cortesuli

**Turnos online para peluquerías y barberías, con probador de cortes con IA.**
Que tus clientes se prueben el corte antes de sentarse, y que el turno llegue con la foto exacta de lo que quieren.

- Producción: https://dwday-125150057.online
- Peluquería demo: https://dwday-125150057.online/peluqueria/navaja-y-tijera
- Panel del dueño: https://dwday-125150057.online/admin → botón **"Ingresar con cuenta demo"**
  (`demo@navajaytijera.com` / `demo1234`)

---

## El problema

Una peluquería de barrio pierde ventas porque atiende consultas y turnos a mano, por WhatsApp o por teléfono:

- **Mensajes que se pierden**: el WhatsApp explota un sábado y el turno que no contestaste a tiempo se fue a otro lado.
- **Pedidos mal anotados**: "cortito a los costados" significa algo distinto para cada uno y termina en "yo te pedí otra cosa".
- **Clientes que esperan y se van**: nadie sabe cuántos turnos entran a la misma hora, y hay gente esperando o sillones vacíos.

## La solución

Cada peluquería tiene su propia página (`/peluqueria/<slug>`). La comparte en Instagram, en WhatsApp o con un QR en la vidriera.

**Para el cliente**
- **Reserva en minutos**: elige día y hora. Cada horario acepta tantos turnos como peluqueros tenga el local, sin sobreturnos.
- **Probador de cortes con IA (opcional)**: se saca una selfie guiada girando la cabeza (frente y perfiles). La IA analiza su cara y su pelo y le muestra **3 cortes sobre su propia foto**. Puede ver el elegido desde varios ángulos, con tips de peinado y cada cuánto retocarlo.
- **El corte viaja con el turno**: si se probó un corte, el peluquero recibe las fotos y la descripción técnica.

**Para el dueño (panel `/admin`)**
- **Turnos**: agenda por día. Asignás peluquero, marcás completado o cancelás en un clic.
- **Turnos a mano**: cargás los que llegan por teléfono, WhatsApp o en persona, con la misma regla de cupos.
- **Historial** de turnos completados.
- **Peluqueros**: alta, edición y baja. La capacidad por horario se ajusta sola.
- **Mi QR**: el QR de tu página para descargar o imprimir.
- **Métricas**: ocupación de los próximos 7 días, facturación estimada, horarios pico, días más pedidos, servicios top, ranking de peluqueros y reservas online contra las cargadas a mano.
- **Multitenant**: cualquier peluquería se registra en `/admin/registro` y tiene su página al instante.
- **Buscador** en la landing: por nombre, barrio o ciudad, o "cerca mío".

## Stack

| Capa | Tecnología |
|---|---|
| Frontend y backend | Next.js 16 (App Router, Server Actions, Route Handlers), React 19, TypeScript |
| Estilos | Tailwind CSS 4 |
| Datos | Supabase: Postgres con RLS y RPCs, Auth, Storage (fotos de los cortes) |
| IA | OpenAI: `gpt-4.1-mini` con visión para el análisis de cara y las sugerencias (salida JSON estricta); `gpt-image-1.5` para aplicar el corte sobre la foto |
| Captura | `getUserMedia` en el navegador, con guía de giro de cabeza |
| QR | `qrcode` (generado en el servidor) |
| Geolocalización | OpenStreetMap Nominatim (al registrar el salón) y fórmula de haversine para "cerca mío" |
| Deploy | VPS de DonWeb con Coolify (Nixpacks, Node 22), nginx y Let's Encrypt |

## Arquitectura

```
Cliente (celular)                 Next.js (server)                         Servicios
──────────────────                ─────────────────                        ─────────
/peluqueria/[slug]  ──reserva──▶  /api/turnos  ──RPC book_appointment──▶  Supabase Postgres
  selfie guiada     ──fotos────▶  /api/ia/analizar ──visión──────────────▶ OpenAI gpt-4.1-mini
                    ──corte────▶  /api/ia/corte    ──images.edit─────────▶ OpenAI gpt-image-1.5
                                  createAppointment ──fotos──────────────▶ Supabase Storage (cortes/)
/admin/panel (dueño) ─Server Actions (sesión con cookie, RLS)───────────▶ Supabase Auth + Postgres
```

```
app/
  page.tsx                    landing (cómo funciona, buscador)
  peluqueria/[slug]/          página pública y reserva de cada salón
  admin/                      login, registro, panel (turnos, historial, peluqueros, QR, métricas)
  api/ia/{analizar,corte}     análisis de cara y generación de cortes
  api/turnos                  horarios disponibles y reservas
  api/peluquerias             buscador
components/{landing,reserva,admin}
lib/
  data.ts                     capa de datos (Supabase)
  ai.ts                       OpenAI: análisis y edición de imagen
  schedule.ts, metrics.ts     horarios por cupos y métricas
  geocode.ts                  Nominatim
  supabase/                   clientes de servidor y navegador
scripts/generate-landing-images.mjs
```

### Reglas de negocio y seguridad
- **Cupos atómicos**: las RPC `book_appointment` (online) y `admin_book_appointment` (a mano) bloquean por salón y comparan los turnos pendientes de ese horario con la cantidad de peluqueros. Dos reservas simultáneas nunca superan el cupo.
- **RLS**: cualquiera puede leer salones, servicios y peluqueros. Los turnos solo los ven y modifican los admins de su salón (`salon_admins`). Las reservas anónimas pasan únicamente por la RPC.
- **Registro**: la RPC `register_salon` crea de forma atómica el usuario, el salón, el vínculo de admin, el primer peluquero y el servicio inicial.
- **Fotos**: bucket `cortes/<salonId>/<turno>/`. Al cancelar un turno se borran sus fotos.

## Correr en local

Requisitos: Node 22 o superior.

```bash
npm install
cp .env.example .env.local   # completar las variables
npm run dev                  # http://localhost:3000
```

Variables de entorno:

| Variable | Requerida | Descripción |
|---|---|---|
| `OPENAI_API_KEY` | sí | API key de OpenAI |
| `NEXT_PUBLIC_SUPABASE_URL` | sí | URL del proyecto de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sí | Clave pública (publishable/anon) de Supabase |
| `NEXT_PUBLIC_SITE_URL` | no | URL pública usada en el QR (por defecto, la de producción) |
| `OPENAI_TEXT_MODEL` | no | Modelo de análisis (por defecto `gpt-4.1-mini`) |
| `OPENAI_IMAGE_MODEL` | no | Modelo de imagen (por defecto `gpt-image-1.5`) |
| `OPENAI_IMAGE_QUALITY` | no | `low`, `medium` o `high` (por defecto `medium`; `low` es más rápido) |

Las variables `NEXT_PUBLIC_*` se incrustan al compilar: en el deploy tienen que estar cargadas **antes** del build.

### Fotos de la landing
Las propuestas de la sección "Cómo funciona" se generaron con la misma IA de la app, a partir de `public/landing/antes.jpg`:

```bash
node --env-file=.env.local scripts/generate-landing-images.mjs
```

## Hecho para la hackatón DonWeb Day
