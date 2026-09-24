Usá el agente `documenter` para ejecutar una prueba end-to-end del spec
`artifact-studio/examples/end-to-end/checkout-service-flow/spec.json`.

Renderizá con `artifact-service-flow` en formato `all` bajo
`artifact-studio/artifacts/work/end-to-end/checkout-service-flow/`, con basename
`checkout`. Verificá el receipt contra el spec original mediante
`artifact-verify-receipt`, ejecutá `artifact-validate` sobre `checkout.svg` e
inspeccioná perceptualmente el PNG y el PDF. No cambies el contenido del spec.

Entregá paths, checks deterministas, resultado de browser QA, findings visuales
y cualquier limitación pendiente.
