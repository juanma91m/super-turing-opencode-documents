#let bg = rgb("#06101f")
#let panel-bg = rgb("#0b192b")
#let panel-soft = rgb("#10243a")
#let cyan = rgb("#55e7ff")
#let cyan-soft = rgb("#a8f4ff")
#let green = rgb("#42e89c")
#let violet = rgb("#b47cff")
#let white = rgb("#edfaff")
#let muted = rgb("#8aa6b8")

#set page(width: 320mm, height: 180mm, margin: (x: 13mm, y: 9mm), fill: bg)
#set text(font: "DejaVu Sans", fill: white)
#set par(leading: 0.58em)

#let panel(body, accent: cyan, height: auto, inset: 9pt) = block(
  width: 100%,
  height: height,
  fill: panel-bg,
  stroke: 1.2pt + accent,
  radius: 8pt,
  inset: inset,
  body,
)

#let card(title, body, accent: cyan) = panel(
  height: 29mm,
  accent: accent,
  inset: 8pt,
)[
  #text(size: 10pt, weight: "bold", fill: accent)[#title]
  #v(3pt)
  #text(size: 7.5pt, fill: white)[#body]
]

#let metric(value, label, accent: cyan) = panel(
  height: 20mm,
  accent: accent,
  inset: 7pt,
)[
  #align(center)[
    #text(size: 18pt, weight: "bold", fill: accent)[#value]
    #linebreak()
    #text(size: 7pt, fill: muted)[#label]
  ]
]

#place(top + left, dx: -6mm, dy: -6mm)[
  #line(length: 70mm, stroke: 2pt + cyan.transparentize(65%))
]
#place(top + right, dx: 6mm, dy: -6mm)[
  #line(length: 70mm, stroke: 2pt + cyan.transparentize(65%))
]

#align(center)[
  #text(size: 23pt, weight: "bold", fill: cyan-soft)[Mapa técnico: decisiones confiables]
  #linebreak()
  #text(size: 11pt, weight: "bold", fill: white)[Una lámina reproducible con estructura, señales e indicadores]
]

#v(6pt)

#grid(
  columns: (1.18fr, 0.82fr),
  gutter: 10pt,
  panel(height: 94mm, accent: cyan)[
    #text(size: 7pt, weight: "bold", fill: muted)[FLUJO PRINCIPAL]
    #v(4pt)
    #align(center + horizon)[#image("diagram.png", width: 95%, height: 78mm, fit: "contain")]
  ],
  grid(
    columns: (1fr, 1fr),
    rows: (29mm, 29mm, 29mm),
    gutter: 7pt,
    card([Contexto], [Identifica restricciones, actores y dependencias antes de elegir una solución.], accent: cyan),
    card([Señales], [Separa hechos observables, supuestos y datos que todavía faltan.], accent: green),
    card([Riesgo], [Evalúa impacto, reversibilidad y costo operativo de cada alternativa.], accent: violet),
    card([Decisión], [Explicita el criterio elegido y las condiciones que podrían cambiarlo.], accent: cyan),
    panel(height: 29mm, accent: green)[
      #text(size: 8pt, weight: "bold", fill: green)[CONTROL DE CALIDAD]
      #v(4pt)
      #text(size: 7.5pt)[✓ Texto verificable #h(9pt) ✓ Sin capturas #h(9pt) ✓ Fuente editable]
    ],
    panel(height: 29mm, accent: violet)[
      #text(size: 8pt, weight: "bold", fill: violet)[SALIDA]
      #v(4pt)
      #text(size: 7.5pt)[Una imagen consistente para PDF, ODT, presentación o publicación.]
    ],
  ),
)

#v(8pt)

#grid(
  columns: (1fr, 1fr, 1fr, 1fr),
  gutter: 8pt,
  metric([4], [criterios principales], accent: cyan),
  metric([2], [rutas de decisión], accent: green),
  metric([100%], [fuente reproducible], accent: violet),
  metric([0], [texto generado como imagen], accent: cyan),
)

#v(6pt)
#align(center)[
  #text(size: 7pt, fill: muted)[D2 · Typst · PNG 2x · QA visual · perfil neon-blueprint]
]
