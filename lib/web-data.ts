import { createCoopera } from "@coopera/data-supabase";
import { supabase } from "./supabase";

/** Browser services share the authenticated client and remain subject to RLS. */
export const webData = supabase ? createCoopera(supabase) : null;
