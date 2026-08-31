# Extractor del padrón: lee la hoja «BASE OFICIAL» del Excel institucional y
# escupe JSON por stdout. Solo extrae — no filtra ni normaliza nada: eso vive
# en importar-padron.ts, para no partir la lógica en dos lenguajes.
#
# Existe porque no hay librería de Excel en Node (el registro de npm no es
# alcanzable desde acá) y Python sí trae openpyxl.
#
# Uso:  python scripts/padron_a_json.py "<archivo.xlsx>"
import json
import sys
import warnings

warnings.filterwarnings("ignore")
import openpyxl  # noqa: E402

HOJA = "BASE OFICIAL"

# Columna de salida -> prefijo con el que empieza el encabezado en el Excel.
# Se busca por prefijo porque los encabezados traen espacios al final.
CAMPOS = {
    "admision": "ADMISI",
    "dni": "DNI",
    "nombre": "APELLIDOS Y NOMBRES",
    "estado": "ESTADO OFICIAL",
    "seccion": "SECCION",
    "sede": "SEDE MATRICULADO",
    "carrera": "ESPECIALIDAD",
    "correo": "CORREO PERSONAL",
    "correoInst": "CORREO INSTITUCIONAL",
    "celular": "CELULAR WHATS",
}


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("uso: padron_a_json.py <archivo.xlsx>")

    wb = openpyxl.load_workbook(sys.argv[1], read_only=True, data_only=True)
    if HOJA not in wb.sheetnames:
        sys.exit(f"no existe la hoja «{HOJA}»; hay: {', '.join(wb.sheetnames[:6])}…")
    ws = wb[HOJA]

    it = ws.iter_rows(values_only=True)
    cab = [str(c).strip().upper() if c is not None else "" for c in next(it)]

    idx = {}
    for salida, prefijo in CAMPOS.items():
        for i, nombre in enumerate(cab):
            if nombre.startswith(prefijo):
                idx[salida] = i
                break
        else:
            sys.exit(f"falta la columna «{prefijo}» en la hoja")

    filas = []
    for f in it:
        if f[idx["dni"]] is None:
            continue
        filas.append({k: ("" if f[i] is None else str(f[i]).strip()) for k, i in idx.items()})

    json.dump(filas, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
