import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const list = searchParams.get("list");

  // Fetch ALL chats for the sidebar
  if (list === "true") {
    const { data, error } = await supabase
      .from("chats")
      .select("id, messages, char_name, char_avatar")
      .order("id", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data: data || [] });
  }

  // Fetch SINGLE chat by ID
  const id = searchParams.get("id") || 1;
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data || {
      id: Number(id),
      messages: [],
      system_prompt: null,
      char_name: "Assistant",
      char_avatar: "",
      bg_image: "",
    },
  });
}

export async function POST(request) {
  const body = await request.json();
  const { id, messages, system_prompt, char_name, char_avatar, bg_image } =
    body;

  const { data, error } = await supabase
    .from("chats")
    .upsert({
      id: Number(id),
      messages: messages || [],
      system_prompt: system_prompt,
      char_name: char_name || "Assistant",
      char_avatar: char_avatar || "",
      bg_image: bg_image || "",
    })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
