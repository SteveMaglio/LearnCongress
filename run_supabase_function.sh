#!/bin/bash
source .env
curl -X POST "$VITE_SUPABASE_URL/functions/v1/updateMembers" -H "Authorization: Bearer $VITE_SUPABASE_SERVICE_ROLE_KEY"
chmod +x run_supabase_function.sh
