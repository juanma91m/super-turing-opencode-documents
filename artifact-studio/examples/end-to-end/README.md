# Casos end-to-end para Documenter

Este corpus ejercita el flujo conversacional completo del addon sin depender de
datos reales ni servicios externos. Cada caso incluye un spec semántico y un
`prompt.md` listo para usar desde OpenCode con el agente `documenter`.

| Caso | Renderer | Cobertura principal |
|---|---|---|
| `checkout-service-flow` | `artifact-service-flow` | cuatro carriles, conectores, código y cambio de ownership |
| `incident-service-flow` | `artifact-service-flow` | flujo numerado sin conectores y componentes operativos |
| `order-saga-sequence` | `artifact-narrated-sequence` | seis participantes, self-action, persistencia y rutas largas |
| `token-refresh-sequence` | `artifact-narrated-sequence` | estados, rotación, backchannel y base de sesiones |

## Criterio de aceptación

Para cada `prompt.md`, Documenter debe:

1. renderizar SVG, PNG y PDF sin modificar el significado del spec;
2. exigir que el receipt reporte todos los checks aprobados;
3. verificar receipt y spec mediante `artifact-verify-receipt`;
4. ejecutar `artifact-validate` sobre el SVG canónico;
5. inspeccionar perceptualmente el PNG y el PDF;
6. informar paths, checks, findings y limitaciones sin confundir evidencia
   determinista con aprobación visual.

Los outputs van a `artifact-studio/artifacts/work/end-to-end/`, que está
ignorado por Git. Los specs y prompts sí son parte del corpus versionado.
