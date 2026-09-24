Usá el agente `documenter` para ejecutar una prueba end-to-end del spec
`artifact-studio/examples/end-to-end/order-saga-sequence/spec.json`.

Renderizá con `artifact-narrated-sequence` en formato `all` bajo
`artifact-studio/artifacts/work/end-to-end/order-saga-sequence/`, con basename
`order-saga`. Verificá receipt y spec, ejecutá `artifact-validate` sobre el SVG e
inspeccioná PNG y PDF. Revisá especialmente self-actions, rutas que cruzan
participantes intermedios, el bloque de código y la nota del paso de pagos.

Entregá paths, checks deterministas, browser QA, findings perceptuales y
limitaciones.
