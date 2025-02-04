#!/bin/bash
source .env
curl -X POST "$SUPABASE_URL/functions/v1/updateMembers" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
chmod +x run_supabase_function.sh
