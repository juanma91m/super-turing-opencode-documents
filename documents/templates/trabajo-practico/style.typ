#let ink = rgb("#263238")
#let accent = rgb("#315b7d")
#let soft = rgb("#eaf1f6")

#set text(fill: ink)
#set par(justify: true, leading: 0.72em)
#set list(indent: 1.2em, body-indent: 0.55em)
#set enum(indent: 1.2em, body-indent: 0.55em)

#show heading.where(level: 1): it => block(
  above: 1.35em,
  below: 0.7em,
  breakable: false,
)[
  #set text(size: 16pt, weight: "bold", fill: accent)
  #it
  #line(length: 100%, stroke: 0.7pt + accent)
]

#show heading.where(level: 2): it => block(
  above: 1.2em,
  below: 0.55em,
  breakable: false,
)[
  #set text(size: 13pt, weight: "semibold", fill: accent)
  #it
]

#show quote: it => block(
  fill: soft,
  inset: (x: 10pt, y: 8pt),
  radius: 3pt,
  stroke: (left: 2pt + accent),
)[#it]

#show table: it => {
  set text(size: 9.5pt)
  it
}
