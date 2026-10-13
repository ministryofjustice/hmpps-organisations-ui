#!/bin/bash
# Regenerates server/@types/organisationsApi/index.d.ts from the API's OpenAPI docs.
# Once POST /organisation/v2 is merged, re-export friendly aliases from types.ts using the generated schemas.
npx -y openapi-typescript "${ORGANISATIONS_API_DOCS_URL:-https://organisations-api-dev.hmpps.service.justice.gov.uk/v3/api-docs}" > server/@types/organisationsApi/index.d.ts
npx eslint --fix server/@types/organisationsApi/index.d.ts
