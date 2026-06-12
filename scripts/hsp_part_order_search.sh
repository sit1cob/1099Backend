#!/usr/bin/env bash
set -euo pipefail

clientId="${1:?clientId required}"
unitNumber="${2:?unitNumber required}"
serviceOrderNumber="${3:?serviceOrderNumber required}"

: "${HSP_BEARER_TOKEN:?Set HSP_BEARER_TOKEN env var first}"

curl --location \
  'https://hspws-api-gateway.prod.nextgen.shs.com/v1/api/HSPRTPartOrderService/rest/searchPartOrderDetailsList' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --header "Authorization: Bearer ${HSP_BEARER_TOKEN}" \
  --data "$(cat <<JSON
{
  \"clientId\": \"${clientId}\",
  \"unitNumber\": \"${unitNumber}\",
  \"serviceOrderNumber\": \"${serviceOrderNumber}\"
}
JSON
)"
