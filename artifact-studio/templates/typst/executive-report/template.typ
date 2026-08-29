#let artifact-document(meta: (:), theme: (:), mode: "report", logo: none, body) = {
  set page(
    paper: "a4",
    margin: (x: 20mm, y: 19mm),
    header: context if mode != "form" and counter(page).get().first() > 1 [#text(size: 8pt, fill: theme.muted)[#meta.title]],
    footer: context if counter(page).get().first() > 1 [#align(right, text(size: 8pt, fill: theme.muted)[#counter(page).display("1")])],
    numbering: "1",
  )
  set text(font: ("IBM Plex Sans", "Noto Sans"), size: if mode == "form" { 9pt } else { 10.5pt }, fill: theme.text, lang: "es")
  set par(leading: if mode == "form" { 0.6em } else { 0.72em }, justify: false)
  set heading(numbering: "1.1", outlined: true)
  show heading.where(level: 1): it => if mode == "form" { block(above: 24pt, below: 9pt, breakable: false)[#text(size: 13pt, weight: "semibold", fill: theme.text)[#it.body] #v(-9pt) #line(length: 100%, stroke: .7pt + theme.accent)] } else { block(above: 18pt, below: 9pt, breakable: false)[#text(size: 19pt, weight: "semibold", fill: theme.text)[#it.body] #line(length: 100%, stroke: .7pt + theme.accent)] }
  show heading.where(level: 2): it => block(above: if mode == "form" { 11pt } else { 14pt }, below: if mode == "form" { 7pt } else { 6pt }, breakable: false)[#text(size: if mode == "form" { 11pt } else { 14pt }, weight: "semibold", fill: theme.text)[#it.body]]
  show heading.where(level: 3): it => block(above: 10pt, below: 4pt, breakable: false)[#text(size: 11pt, weight: "semibold", fill: theme.text)[#it.body]]
  show table.cell.where(y: 0): set text(weight: "semibold")

  if mode == "form" [
    #if logo != none [
      #grid(columns: (1fr, 30mm), gutter: 10mm,
        [#text(size: 20pt, weight: "semibold", fill: theme.text)[#meta.title]
         #if "subtitle" in meta and meta.subtitle != "" [#v(4pt) #text(size: 10pt, fill: theme.muted)[#meta.subtitle]]],
        [#align(right + horizon, image(logo, width: 28mm))]
      )
    ] else [
      #align(center)[
        #text(size: 20pt, weight: "semibold", fill: theme.text)[#meta.title]
        #if "subtitle" in meta and meta.subtitle != "" [#v(4pt) #text(size: 10pt, fill: theme.muted)[#meta.subtitle]]
      ]
    ]
    #v(6pt)
    #body
  ] else [
  page(header: none, footer: none, numbering: none, fill: theme.background)[
    #v(26%)
    #text(size: 9pt, weight: "semibold", fill: theme.accent)[ARTIFACT STUDIO]
    #v(10pt)
    #text(size: 29pt, weight: "semibold", fill: theme.text)[#meta.title]
    #if "subtitle" in meta and meta.subtitle != "" [#v(8pt) #text(size: 15pt, fill: theme.muted)[#meta.subtitle]]
    #v(1fr)
    #line(length: 42mm, stroke: 2pt + theme.accent)
    #v(9pt)
    #if "author" in meta [#text(size: 10pt)[#meta.author]]
    #if "organization" in meta [#text(size: 9pt, fill: theme.muted)[#meta.organization]]
    #if "date" in meta [#text(size: 9pt, fill: theme.muted)[#meta.date]]
    #if "sampleData" in meta and meta.sampleData [#v(12pt) #box(fill: theme.warning, inset: 7pt, radius: 2pt)[#text(size: 9pt, weight: "bold")[SAMPLE DATA — datos ficticios para demostración]]]
  ]
  pagebreak()
  heading(level: 1, outlined: false)[Contenido]
  outline(title: none, indent: auto)
  pagebreak()
  body
  ]
}

#let kpi-grid(items, theme) = grid(
  columns: (1fr,) * calc.min(items.len(), 4), gutter: 8pt,
  ..items.map(item => box(fill: theme.surface, stroke: .6pt + theme.border, radius: 3pt, inset: 10pt)[
    #text(size: 8pt, fill: theme.muted)[#item.label]
    #v(4pt)
    #text(size: 19pt, weight: "semibold", fill: theme.text)[#item.value]
    #if "context" in item [#v(3pt) #text(size: 8pt, fill: theme.muted)[#item.context]]
  ])
)

#let callout(tone, title, content, theme) = block(fill: theme.at(tone), stroke: (left: 2pt + theme.accent), inset: 10pt, radius: 2pt, breakable: false)[
  #text(weight: "semibold")[#title] #h(5pt) #content
]
