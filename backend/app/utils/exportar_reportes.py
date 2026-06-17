import io
from openpyxl import Workbook   # type: ignore
from openpyxl.styles import Font, PatternFill  # type: ignore
from reportlab.lib import colors  # type: ignore
from reportlab.lib.pagesizes import letter, landscape  # type: ignore
from reportlab.lib.units import cm # type: ignore
from reportlab.lib.styles import getSampleStyleSheet  # type: ignore
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer # type: ignore
from reportlab.platypus import Paragraph  # type: ignore
from reportlab.lib.styles import getSampleStyleSheet # type: ignore

styles = getSampleStyleSheet()


def generar_excel_reporte_insumo(reporte: dict) -> io.BytesIO:
    encabezado = reporte["encabezado"]
    movimientos = reporte["movimientos"]

    wb = Workbook()
    ws = wb.active
    ws.title = "Encabezado"

    ws.append(["Informe de Insumo", encabezado["nombre_producto"]])
    ws["A1"].font = Font(bold=True, size=14)
    ws.append([])
    ws.append(["ID insumo", encabezado["id_insumo"]])
    ws.append(["Fecha de ingreso", str(encabezado["fecha_ingreso"])])
    ws.append(["Fecha de vencimiento", str(encabezado["fecha_vencimiento"])])
    ws.append(["Precio unitario", float(encabezado["precio_unitario"])])
    ws.append(["Cantidad inicial", encabezado["cantidad_inicial"]])
    ws.append(["Stock actual", encabezado["stock_actual"]])
    ws.append(["Total perdido", encabezado["total_perdido"]])

    for fila in ws.iter_rows(min_row=3, max_row=9, min_col=1, max_col=1):
        for celda in fila:
            celda.font = Font(bold=True)

    ws_mov = wb.create_sheet("Movimientos")
    ws_mov.append(["Tipo", "Observaciones", "Cantidad", "Unidad", "Valor", "Motivo", "Fecha"])
    for celda in ws_mov[1]:
        celda.font = Font(bold=True, color="FFFFFF")
        celda.fill = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")

    for m in movimientos:
        ws_mov.append([
            m.get("tipo"),
            m.get("observaciones"),
            m.get("cantidad"),
            encabezado.get("simbolo"),
            float(m["valor"]) if m.get("valor") not in (None, "-") else "-",
            m.get("motivo"),
            str(m.get("fecha")),
        ])

    for columna in ws_mov.columns:
        max_len = max((len(str(c.value)) if c.value else 0) for c in columna)
        ws_mov.column_dimensions[columna[0].column_letter].width = max_len + 2

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer


def generar_pdf_reporte_insumo(reporte: dict) -> io.BytesIO:
    encabezado = reporte["encabezado"]
    movimientos = reporte["movimientos"]

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elementos = []

    elementos.append(Paragraph(f"Informe de Insumo: {encabezado['nombre_producto']}", styles["Title"]))
    elementos.append(Spacer(1, 12))

    datos_encabezado = [
        ["ID insumo", str(encabezado["id_insumo"])],
        ["Nombre del insumo", str(encabezado["nombre_producto"])],
        ["Fecha de ingreso", str(encabezado["fecha_ingreso"])],
        ["Fecha de vencimiento", str(encabezado["fecha_vencimiento"])],
        ["Precio unitario", f"${float(encabezado['precio_unitario']):,.0f}"],
        ["Cantidad inicial", f"{encabezado['cantidad_inicial']} {encabezado['simbolo']}"],
        ["Stock actual", f"{encabezado['stock_actual']} {encabezado['simbolo']}"],
        ["Total perdido", f"{encabezado['total_perdido']} {encabezado['simbolo']}"],
    ]
    tabla_encabezado = Table(datos_encabezado, colWidths=[6 * cm, 6 * cm])
    tabla_encabezado.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
    ]))
    elementos.append(tabla_encabezado)
    elementos.append(Spacer(1, 20))

    elementos.append(Paragraph("Movimientos", styles["Heading2"]))
    filas = [["Tipo", "Observaciones", "Cantidad", "Valor", "Motivo", "Fecha"]]
    for m in movimientos:
        valor = m.get("valor")
        filas.append([
            m.get("tipo", ""),
            m.get("observaciones") or "",
            str(m.get("cantidad", "")),
            f"${float(valor):,.0f}" if valor not in (None, "-") else "-",
            m.get("motivo") or "",
            str(m.get("fecha", "")),
        ])

    tabla_movs = Table(filas, repeatRows=1)
    tabla_movs.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    elementos.append(tabla_movs)

    doc.build(elementos)
    buffer.seek(0)
    return buffer

def _calcular_valor_total(perdida: dict) -> float:
    valor_unitario = perdida.get("valor_unitario")
    cantidad = perdida.get("cantidad")
    if valor_unitario in (None, "-") or cantidad in (None, "-"):
        return 0.0
    return float(valor_unitario) * float(cantidad)


def generar_excel_reporte_perdidas(perdidas: list) -> io.BytesIO:
    wb = Workbook()
    ws = wb.active
    ws.title = "Pérdidas"

    ws.append(["Informe de Pérdidas"])
    ws["A1"].font = Font(bold=True, size=14)
    ws.append([f"Total de registros: {len(perdidas)}"])
    ws.append([])

    headers = [
        "Producto", "Origen", "Lote", "Motivo",
        "Cantidad", "Unidad", "Valor unitario", "Valor total perdido",
        "Usuario", "Fecha de reporte", "Observaciones",
    ]
    ws.append(headers)
    fila_encabezado = ws.max_row
    for celda in ws[fila_encabezado]:
        celda.font = Font(bold=True, color="FFFFFF")
        celda.fill = PatternFill(start_color="2563EB", end_color="2563EB", fill_type="solid")

    total_perdido = 0.0
    for p in perdidas:
        valor_unitario = p.get("valor_unitario")
        valor_total = _calcular_valor_total(p)
        total_perdido += valor_total

        ws.append([
            p.get("nombre_producto"),
            p.get("origen"),
            p.get("nombre_lote") or "-",
            p.get("motivo"),
            p.get("cantidad"),
            p.get("simbolo"),
            float(valor_unitario) if valor_unitario not in (None, "-") else "-",
            valor_total,
            p.get("nombre_user") or "Sistema",
            str(p.get("fecha_reporte")),
            p.get("observaciones") or "",
        ])

    ws.append([])
    fila_total = ws.max_row + 1
    ws.cell(row=fila_total, column=8, value="Total perdido:").font = Font(bold=True)
    ws.cell(row=fila_total, column=9, value=total_perdido).font = Font(bold=True)

    for columna in ws.columns:
        max_len = max((len(str(c.value)) if c.value else 0) for c in columna)
        ws.column_dimensions[columna[0].column_letter].width = max_len + 2

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer

estilo_observaciones = styles["BodyText"].clone("Observaciones")
estilo_observaciones.fontSize = 6
estilo_observaciones.leading = 7

def generar_pdf_reporte_perdidas(perdidas: list) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )
    styles = getSampleStyleSheet()
    elementos = []

    elementos.append(Paragraph("Informe de Pérdidas", styles["Title"]))
    elementos.append(Spacer(1, 12))

    total_perdido = 0.0
    filas = [["Producto", "Origen", "Lote", "Motivo", "Observaciones", "Cantidad", "Valor unit.", "Valor total", "Usuario", "Fecha"]]
    for p in perdidas:
        valor_unitario = p.get("valor_unitario")
        valor_total = _calcular_valor_total(p)
        total_perdido += valor_total
        cantidad = p.get("cantidad")
        simbolo = p.get("simbolo") or ""

        filas.append([
            p.get("nombre_producto") or "",
            p.get("origen") or "",
            p.get("nombre_lote") or "-",
            p.get("motivo") or "",
            Paragraph(p.get("observaciones") or "", estilo_observaciones),
            f"{cantidad} {simbolo}".strip(),
            f"${float(valor_unitario):,.0f}" if valor_unitario not in (None, "-") else "-",
            f"${valor_total:,.0f}",
            p.get("nombre_user") or "Sistema",
            str(p.get("fecha_reporte", "")),
        ])

    tabla = Table(
        filas,
        repeatRows=1,
        colWidths=[
            2.5 * cm,
            2.3 * cm,
            2 * cm,
            2.7 * cm,
            4 * cm,
            2 * cm,
            2 * cm,
            2.5 * cm,
            2 * cm,
            3 * cm,
        ]
    )
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f3f4f6")),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    elementos.append(tabla)
    elementos.append(Spacer(1, 18))

    resumen = [
        ["Total de registros", str(len(perdidas))],
        ["Total valor perdido", f"${total_perdido:,.0f}"],
    ]
    tabla_resumen = Table(resumen, colWidths=[6 * cm, 6 * cm])
    tabla_resumen.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.whitesmoke),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
    ]))
    elementos.append(tabla_resumen)

    doc.build(elementos)
    buffer.seek(0)
    return buffer
