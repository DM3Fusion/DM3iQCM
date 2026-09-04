import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ORGANIZATION_COOKIE } from "@/lib/auth/context";

export async function GET(request:NextRequest){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.redirect(new URL("/login?error=The%20invitation%20could%20not%20establish%20a%20session.",request.url));const response=NextResponse.redirect(new URL("/",request.url));response.cookies.delete(ACTIVE_ORGANIZATION_COOKIE);return response;}
