Usá el agente `documenter` para ejecutar una prueba end-to-end del spec
`artifact-studio/examples/end-to-end/token-refresh-sequence/spec.json`.

Renderizá con `artifact-narrated-sequence` en formato `all` bajo
`artifact-studio/artifacts/work/end-to-end/token-refresh-sequence/`, con basename
`token-refresh`. Verificá receipt y spec, ejecutá `artifact-validate` sobre el
SVG e inspeccioná PNG y PDF. Revisá especialmente el self-action del gateway,
la persistencia en sesiones y la legibilidad de las notas finales.

Entregá paths, checks deterministas, browser QA, findings perceptuales y
limitaciones.
