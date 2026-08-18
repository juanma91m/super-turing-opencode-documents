#let ink = rgb("#20272b")
#let accent = rgb("#006d77")
#let accent-dark = rgb("#184e55")
#let soft = rgb("#e9f4f4")

#set text(fill: ink)
#set par(justify: true, leading: 0.68em)
#set list(indent: 1.15em, body-indent: 0.5em)

#show heading.where(level: 1): it => block(
  above: 1.25em,
  below: 0.65em,
  breakable: false,
)[
  #set text(size: 15.5pt, weight: "bold", fill: accent-dark)
  #it
  #line(length: 2.2cm, stroke: 2pt + accent)
]

#show heading.where(level: 2): it => block(
  above: 1.15em,
  below: 0.5em,
  breakable: false,
)[
  #set text(size: 12.5pt, weight: "semibold", fill: accent)
  #it
]

#show quote: it => block(
  fill: soft,
  inset: 9pt,
  radius: 4pt,
  stroke: 0.5pt + accent,
)[#it]

#show table: it => {
  set text(size: 9pt)
  it
}
