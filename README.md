# Berlin Beer & Food — Sistema de Pronósticos 🍺⚽

Aplicación web para que los clientes del bar puedan pronosticar el resultado de partidos de fútbol desde su celular, escaneando un código QR.

---

## 🗂 Estructura del proyecto

```
berlin-beer/
├── public/                    # Archivos estáticos (frontend)
│   ├── index.html             # Página pública (clientes)
│   ├── admin/
│   │   └── index.html         # Panel de administración
│   ├── assets/
│   │   ├── style.css          # Estilos compartidos
│   │   ├── admin.css          # Estilos del admin
│   │   ├── app.js             # Lógica página pública
│   │   └── admin.js           # Lógica panel admin
│   ├── _redirects             # Reglas de rutas Cloudflare
│   └── _headers               # Cabeceras de seguridad HTTP
├── functions/                 # Serverless Functions (backend)
│   └── api/
│       ├── match.js           # GET /api/match (público)
│       ├── bet.js             # POST /api/bet (público)
│       └── admin/
│           ├── _auth.js       # Utilidades de autenticación
│           ├── login.js       # POST /api/admin/login
│           ├── verify.js      # GET /api/admin/verify
│           ├── match.js       # GET/POST /api/admin/match
│           ├── match/
│           │   ├── [id].js        # PUT/DELETE /api/admin/match/:id
│           │   └── [id]/
│           │       └── result.js  # POST .../result
│           ├── participants.js    # GET /api/admin/participants
│           ├── results.js         # GET /api/admin/results
│           └── history/
│               ├── history.js     # GET /api/admin/history
│               └── [id].js        # GET /api/admin/history/:id
├── wrangler.toml              # Configuración de Cloudflare Pages
└── README.md
```

---

## 🚀 Guía de despliegue paso a paso

### PASO 1 — Crear la base de datos en Cloudflare (KV)

1. Ingresá a [dash.cloudflare.com](https://dash.cloudflare.com)
2. En el menú izquierdo: **Workers & Pages → KV**
3. Clic en **"Create namespace"**
4. Nombre: `berlin-beer-kv`
5. Clic en **"Add"**
6. Copiá el **Namespace ID** que aparece (lo vas a necesitar en el paso 4)
7. Repetí y creá otro con nombre `berlin-beer-kv-preview` (para pruebas locales)

---

### PASO 2 — Subir el proyecto a GitHub

```bash
# 1. Inicializá git en la carpeta del proyecto
cd berlin-beer
git init
git add .
git commit -m "Inicial: Berlin Beer & Food"

# 2. Creá un repositorio en github.com (sin README)
#    Por ejemplo: tu-usuario/berlin-beer-food

# 3. Conectá y subí
git remote add origin https://github.com/TU_USUARIO/berlin-beer-food.git
git branch -M main
git push -u origin main
```

---

### PASO 3 — Conectar Cloudflare Pages con GitHub

1. En Cloudflare: **Workers & Pages → Create application → Pages**
2. Clic en **"Connect to Git"**
3. Autorizá tu cuenta de GitHub
4. Seleccioná el repositorio `berlin-beer-food`
5. Configurá el build:
   - **Framework preset:** None
   - **Build command:** *(dejar vacío)*
   - **Build output directory:** `public`
6. Clic en **"Save and Deploy"**

---

### PASO 4 — Configurar las variables de entorno

Una vez creado el proyecto en Pages:

1. Ir a tu proyecto → **Settings → Environment variables**
2. Agregar la siguiente variable:

| Variable        | Valor                              |
|-----------------|------------------------------------|
| `ADMIN_PASSWORD` | `TU_CONTRASEÑA_SEGURA_AQUÍ`       |

> ⚠️ Usá una contraseña fuerte (mínimo 12 caracteres con letras, números y símbolos).

---

### PASO 5 — Vincular el KV al proyecto

1. Ir a tu proyecto Pages → **Settings → Functions**
2. En la sección **KV namespace bindings**, clic en **"Add binding"**
3. Configurar:
   - **Variable name:** `BERLIN_KV`
   - **KV namespace:** seleccioná `berlin-beer-kv`
4. Guardar
5. Volvé a deployar desde la pestaña **Deployments → Retry deployment**

---

### PASO 6 — Actualizar wrangler.toml (opcional, para desarrollo local)

Editá `wrangler.toml` y reemplazá los IDs:

```toml
[[kv_namespaces]]
binding = "BERLIN_KV"
id = "TU_KV_NAMESPACE_ID_PRODUCCION"
preview_id = "TU_KV_NAMESPACE_ID_PREVIEW"
```

---

### PASO 7 — Generar el código QR

Una vez desplegado, tu URL será algo como:
`https://berlin-beer-food.pages.dev`

Generá el QR apuntando a esa URL en:
- [qr.io](https://qr.io)
- [qrcode-monkey.com](https://www.qrcode-monkey.com/)

---

## 🛠 Uso del sistema

### Panel de administración
Accedé en: `https://TU-DOMINIO.pages.dev/admin`

**Flujo típico por partido:**
1. **Crear partido** → completar nombre, equipos, fecha/hora, cierre y premio
2. Los clientes escanean el QR y hacen sus apuestas
3. Al terminar el partido → **Cargar resultado real**
4. El sistema detecta automáticamente los ganadores
5. Ver ganadores en la sección **Resultados**
6. Exportar participantes en **CSV o Excel** si querés

---

## 🔒 Seguridad implementada

- Autenticación con token de sesión almacenado en KV (expira a las 8 horas)
- Contraseña del admin nunca expuesta en el cliente
- Comparación de contraseña en tiempo constante (anti timing attacks)
- Cabeceras HTTP de seguridad: X-Frame-Options, X-Content-Type-Options
- Admin no indexado por buscadores (noindex)
- Validación de datos tanto en frontend como en backend
- Protección contra apuestas duplicadas por nombre + mesa + partido

---

## 🔧 Desarrollo local

```bash
# Instalar Wrangler CLI
npm install -g wrangler

# Autenticarte con Cloudflare
wrangler login

# Ejecutar localmente
wrangler pages dev public --kv BERLIN_KV

# Configurar contraseña admin localmente:
# Crear archivo .dev.vars (NO subir a Git)
echo "ADMIN_PASSWORD=tu_password_local" > .dev.vars
```

---

## 🔄 Actualizaciones futuras

Cada vez que hagas cambios:
```bash
git add .
git commit -m "Descripción del cambio"
git push
```
Cloudflare Pages detecta el push y redespliega automáticamente (tarda ~1 minuto).

---

## 📋 Notas técnicas

- **Base de datos:** Cloudflare KV (clave-valor, serverless, sin costo en el plan gratuito para uso normal)
- **Backend:** Cloudflare Pages Functions (JavaScript, sin servidor propio)
- **Frontend:** HTML + CSS + JS vanilla (sin frameworks, carga ultra-rápida en móviles)
- **Tipografías:** Playfair Display, Inter, Bebas Neue (Google Fonts)

---

*Berlin Beer & Food · Sistema de pronósticos v1.0*
