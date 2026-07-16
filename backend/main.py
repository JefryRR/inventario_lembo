
from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from fastapi.staticfiles import StaticFiles # type: ignore
from app.router import (users, rols, modulos, permisos, auth, inv_perdida, inv_produccion, 
    categorias, especies, lotes_prod, lotes, mortalidad, inv_insumos, tipo_insumos, alimento_prod, 
    tratamiento, ventas, detalles_venta, unid_medida, solicitud, platos, ingredientes, prog_platos, 
    venta_platos, maquinas, solicitud_maq, comercio)


app = FastAPI()

# CORS habilitado para el frontend local durante el desarrollo.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-New-Token"],  # Exponer el encabezado personalizado X-New-Token
)

app.mount("/static", StaticFiles(directory="static"), name="static")

# Incluir en el objeto app los routers
app.include_router(auth.router, prefix="/access", tags=["login"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(rols.router, prefix="/roles", tags=["roles"])
app.include_router(modulos.router, prefix="/modulos", tags=["modulos"])
app.include_router(permisos.router, prefix="/permisos", tags=["permisos"])
app.include_router(inv_perdida.router, prefix="/inv_perdida", tags=["inv_perdida"])
app.include_router(inv_produccion.router, prefix="/inv_produccion", tags=["inv_produccion"])
app.include_router(categorias.router, prefix="/categorias", tags=["categorias"])
app.include_router(especies.router, prefix="/especies", tags=["especies"])
app.include_router(lotes_prod.router, prefix="/lotes_prod", tags=["lotes_prod"])
app.include_router(lotes.router, prefix="/lotes", tags=["lotes"])
app.include_router(mortalidad.router, prefix="/mortalidad", tags=["mortalidad"])
app.include_router(inv_insumos.router, prefix="/inv_insumos", tags=["inv_insumos"])
app.include_router(tipo_insumos.router, prefix="/tipo_insumos", tags=["tipo_insumos"])
app.include_router(alimento_prod.router, prefix="/alimento_prod", tags=["alimento_prod"])
app.include_router(tratamiento.router, prefix="/tratamiento", tags=["tratamiento"])
app.include_router(ventas.router, prefix="/ventas", tags=["ventas"])
app.include_router(detalles_venta.router, prefix="/detalles-venta", tags=["detalles-venta"])
app.include_router(solicitud.router, prefix="/solicitud", tags=["solicitud"])
app.include_router(unid_medida.router, prefix="/unid-medida", tags=["unid-medida"])
app.include_router(platos.router, prefix="/platos", tags=["platos"])
app.include_router(ingredientes.router, prefix="/ingredientes", tags=["ingredientes"])
app.include_router(prog_platos.router, prefix="/prog_platos", tags=["prog_platos"])
app.include_router(venta_platos.router, prefix="/venta_platos", tags=["venta_platos"])
app.include_router(maquinas.router, prefix="/maquinas", tags=["maquinas"])
app.include_router(solicitud_maq.router, prefix="/solicitud-maq", tags=["solicitud-maq"])
app.include_router(comercio.router, prefix="/comercio", tags=["comercio"])
@app.get("/")
def read_root():
  return {
              "message": "ok",
              "autor": "SENA 2026"
          }
