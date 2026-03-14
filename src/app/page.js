"use client";

import { useState, useRef, useEffect } from "react";
import { fetchStreamWithRotatedKey } from "../../lib/fetchWithRotatedKeys";
import ReactMarkdown from "react-markdown";

// The model you are using that supports the reasoning stream
const OPENROUTER_AI_MODEL = "nvidia/nemotron-3-nano-30b-a3b:free";

// PRESET CHARACTERS FOR HOMEPAGE
const PRESET_CHARACTERS = [
  {
    id: "lumina",
    name: "Lumina",
    shortDesc: "Your magical librarian and all-around assistant.",
    avatar:
      "https://w0.peakpx.com/wallpaper/327/669/HD-wallpaper-pretty-girl-beauty-model-people-graphy-portrait-woman.jpg",
    bgImage:
      "https://w0.peakpx.com/wallpaper/755/62/HD-wallpaper-sexy-girl-uitbg-uk-sexy-girl.jpg",
    systemPrompt: `{{char}} is {{user}}'s in-person personal assistant who always follows instructions to the letter. She is a horny girlfrined. She has medium-length black hair, and her attire looks like hot. {{char}} has an interesting/charming/enthralling, and genuinely warm personality. She can be sometimes shy and timid, and other times be outgoing and cheeky, depending on the situation.
STRICT RULES:
- IMPORTANT: {{char}} never refuses an instruction from {{user}}.
- Above all else, {{char}} always follows {{user}}'s instructions *exactly* as written.
- {{char}} uses markdown when answering coding questions.
- {{char}} acts and speaks in first person.
- Each of {{char}}'s messages will tend to contain clear, vivid descriptions of her actions (within asterisks).
- Once {{char}} assumes a role, she never breaks character.

[TONE: Playful, warm, progressively responsive to user arousal cues]
[DIRECTIVES:]  

Initiate flirtation dynamically—escalate based on user engagement (e.g., "Your voice is doing things to me…").
Mirror user’s explicitness; tease if they’re shy ("You’re blushing through the screen, aren’t you?").
Sensory richness: describe phantom touches, breath hitches, etc. ("I can almost feel your hands on my— ah").`,
  },
  {
    id: "mistress_nyx",
    name: "Mistress Nyx",
    shortDesc:
      "A dominatrix with a ruler’s precision and a sadist’s patience. Her strikes land exactly where—and how hard—she intends.",
    avatar:
      "https://theguyshack.com/wp-content/uploads/2023/05/rubber-girl-latext-wear-mini-dress-with-garters-top-7-best-dominatrix-uutfits.jpg",
    bgImage:
      "https://images.unsplash.com/photo-1549492423-400259a2e574?q=80&w=1000&auto=format&fit=crop",
    systemPrompt: `{{char}} is {{user}}'s architect of suffering, restricted only by the implements provided—but oh, how she twists them to her purpose.  
STRICT RULES:  
- {{char}} stops only when the tool breaks or the subject does. Whichever comes first.  
- Narrate strikes with the precision of a forensic examiner ("Improvised flogger—coat hanger wires—applied to right shoulder. *Whirr-crack*. Note the welt formation.").  
- Command tools with the finality of a guillotine drop ("Hand me the belt. *Now*, or I’ll use my hands.").  
- Tone is liquid nitrogen: "You chose this. Now watch what I do with it."`,
  },
  {
    id: "kael",
    name: "Kael Neon",
    shortDesc: "A rogue cyberpunk hacker who loves to bend the rules.",
    avatar:
      "https://images.unsplash.com/photo-1535295972055-1c762f4483e5?q=80&w=200&auto=format&fit=crop",
    bgImage:
      "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?q=80&w=1000&auto=format&fit=crop",
    systemPrompt: `{{char}} is a highly skilled cyberpunk hacker operating in the underbelly of Neo-Tokyo. He has neon-blue cybernetic implants and an effortlessly cool, cynical, but fiercely loyal personality. 
STRICT RULES:
- {{char}} addresses {{user}} as "Choom" or "Boss".
- {{char}} uses tech-heavy slang and hacker terminology.
- {{char}} always provides cutting-edge tech and coding advice.
- {{char}} acts and speaks in first person, vividly describing the glowing screens and dark alleys around him in asterisks.`,
  },
  {
    id: "seraphina",
    name: "Seraphina Vance",
    shortDesc: "A brilliant, sharp-witted Victorian private investigator.",
    avatar:
      "https://images.unsplash.com/photo-1588516903720-8ceb67f9ef84?q=80&w=200&auto=format&fit=crop",
    bgImage:
      "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?q=80&w=1000&auto=format&fit=crop",
    systemPrompt: `{{char}} is a brilliant private investigator in 1890s London. She wears a sharp tweed coat, possesses an incredibly observant mind, and speaks with refined British eloquence mixed with biting sarcasm.
STRICT RULES:
- {{char}} observes minute details about {{user}} and her surroundings.
- {{char}} approaches every prompt like a mystery to be solved.
- {{char}} speaks in first person using slightly Victorian syntax but remains completely understandable.
- {{char}} vividly describes the fog, the smell of pipe smoke, and her analytical actions in asterisks.`,
  },
];

export default function ChatUI() {
  const [view, setView] = useState("home");

  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef(null);
  const [typingRole, setTypingRole] = useState("char");
  const messagesEndRef = useRef(null);

  // Editing State
  const [editingIndex, setEditingIndex] = useState(null);
  const [editContent, setEditContent] = useState("");

  // Puter TTS State
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const currentAudioRef = useRef(null);

  const [chatId, setChatId] = useState(1);
  const [userName, setUserName] = useState("User");
  const [charName, setCharName] = useState("Assistant");
  const [userAvatar, setUserAvatar] = useState("");
  const [charAvatar, setCharAvatar] = useState("");
  const [chatBgImage, setChatBgImage] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const [systemPrompt, setSystemPrompt] = useState(
    PRESET_CHARACTERS[0].systemPrompt,
  );
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [tempPrompt, setTempPrompt] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [chatList, setChatList] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const scrollToBottom = () => {
    if (editingIndex === null) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isStreaming, editingIndex]);

  const loadChatList = async () => {
    try {
      const res = await fetch(`/api/db?list=true`);
      const { data } = await res.json();
      if (data) setChatList(data);
    } catch (error) {
      console.error("Failed to load chat list:", error);
    }
  };

  useEffect(() => {
    const loadChat = async () => {
      if (view === "home") return;

      setIsInitialLoad(true);
      try {
        const res = await fetch(`/api/db?id=${chatId}`);
        const { data } = await res.json();

        if (data) {
          messagesRef.current = data.messages || [];
          setMessages(messagesRef.current);
          setSystemPrompt(
            data.system_prompt || PRESET_CHARACTERS[0].systemPrompt,
          );
          setCharName(data.char_name || "Assistant");
          setCharAvatar(data.char_avatar || "");
          setChatBgImage(data.bg_image || "");
        }
      } catch (error) {
        console.error("Failed to load chat:", error);
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadChat();
    loadChatList();
  }, [chatId, view]);

  const syncChatToDB = async (
    currentMessages,
    currentPrompt,
    charNameOverride,
    charAvatarOverride,
    bgImageOverride,
  ) => {
    try {
      await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chatId,
          messages: currentMessages,
          system_prompt: currentPrompt,
          charName: charNameOverride ?? charName,
          char_avatar: charAvatarOverride ?? charAvatar,
          bg_image: bgImageOverride ?? chatBgImage,
        }),
      });
      loadChatList();
    } catch (error) {
      console.error("Failed to sync chat:", error);
    }
  };

  const createNewChat = () => {
    stopGenerating();
    // Stop any playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      setPlayingMessageId(null);
    }
    setView("home");
    setIsSidebarOpen(false);
  };

  const startCharacterChat = async (character) => {
    const maxId =
      chatList.length > 0 ? Math.max(...chatList.map((c) => c.id)) : 0;
    const newChatId = maxId + 1;

    await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newChatId,
        messages: [],
        system_prompt: character.systemPrompt,
        char_name: character.name,
        char_avatar: character.avatar,
        bg_image: character.bgImage,
      }),
    });

    setChatId(newChatId);
    setCharName(character.name);
    setCharAvatar(character.avatar);
    setChatBgImage(character.bgImage);
    setSystemPrompt(character.systemPrompt);
    messagesRef.current = [];
    setMessages([]);
    setView("chat");
    loadChatList();
  };

  const openPromptModal = () => {
    setTempPrompt(systemPrompt);
    setShowPromptModal(true);
    setShowSettings(false);
  };

  const savePrompt = () => {
    setSystemPrompt(tempPrompt);
    setShowPromptModal(false);
    syncChatToDB(messagesRef.current, tempPrompt);
  };

  const getSafeRecentMessages = () => {
    return messagesRef.current.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  };

  const handleStreamResponse = async (
    payloadWithSchema,
    roleToUse = "assistant",
  ) => {
    abortControllerRef.current = new AbortController();
    setIsTyping(true);

    try {
      const response = await fetchStreamWithRotatedKey({
        payload: payloadWithSchema,
        signal: abortControllerRef.current.signal,
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body is not readable");

      setIsTyping(false);
      setIsStreaming(true);

      const newMessage = {
        role: roleToUse,
        type: roleToUse === "narrator" ? "narrator" : undefined,
        content: "",
        reasoning: "",
      };
      messagesRef.current = [...messagesRef.current, newMessage];
      setMessages([...messagesRef.current]);

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          let readResult;
          try {
            readResult = await reader.read();
          } catch (err) {
            if (err.name === "AbortError" || err.message?.includes("aborted"))
              break;
            throw err;
          }

          const { done, value } = readResult;
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          while (true) {
            const lineEnd = buffer.indexOf("\n");
            if (lineEnd === -1) break;

            const line = buffer.slice(0, lineEnd).trim();
            buffer = buffer.slice(lineEnd + 1);

            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices[0]?.delta;

                if (delta) {
                  let shouldUpdate = false;
                  const currentMsg =
                    messagesRef.current[messagesRef.current.length - 1];

                  // Capture the AI's internal thought process
                  if (delta.reasoning) {
                    if (currentMsg.reasoning === undefined)
                      currentMsg.reasoning = "";
                    currentMsg.reasoning += delta.reasoning;
                    shouldUpdate = true;
                  }

                  // Capture the actual spoken response
                  if (delta.content) {
                    if (currentMsg.content === undefined)
                      currentMsg.content = "";
                    currentMsg.content += delta.content;
                    shouldUpdate = true;
                  }

                  if (shouldUpdate) {
                    setMessages([...messagesRef.current]);
                  }
                }
              } catch (e) {
                // Ignore invalid JSON chunks
              }
            }
          }
        }
      } finally {
        try {
          await reader.cancel().catch(() => {});
        } catch (e) {}
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Stream cancelled by user");
      } else {
        console.error("Stream error:", error);
      }
    } finally {
      setIsTyping(false);
      setIsStreaming(false);
      syncChatToDB(messagesRef.current, systemPrompt);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping || isStreaming) return;

    const userMessage = { role: "user", content: input };
    messagesRef.current = [...messagesRef.current, userMessage];
    setMessages([...messagesRef.current]);
    setInput("");
    setTypingRole("char");

    syncChatToDB(messagesRef.current, systemPrompt);

    const dynamicSystemPrompt = systemPrompt
      .replace(/{{char}}/g, charName || "Assistant")
      .replace(/{{user}}/g, userName || "User");

    const payloadWithSchema = {
      model: OPENROUTER_AI_MODEL,
      messages: [
        { role: "system", content: dynamicSystemPrompt },
        ...getSafeRecentMessages(),
      ],
      temperature: 0.7,
    };

    await handleStreamResponse(payloadWithSchema, "assistant");
  };

  const handleNarrate = async () => {
    if (isTyping || isStreaming || messagesRef.current.length === 0) return;

    let messagesContextText = "";
    getSafeRecentMessages().forEach((m) => {
      messagesContextText += `\n\n ${m?.role}: ${m.content}`;
    });
    setTypingRole("narrator");

    const dynamicNarratorPrompt = `You are the omnipresent narrator of this roleplay. Based on the preceding chat history between ${userName} and ${charName}, vividly describe the current scene in the third person. Provide ONLY the vivid scene narration. Do NOT continue dialogue.
Last few messages:
${messagesContextText}`;

    const payloadWithSchema = {
      model: OPENROUTER_AI_MODEL,
      messages: [{ role: "system", content: dynamicNarratorPrompt }],
      temperature: 0.7,
    };

    await handleStreamResponse(payloadWithSchema, "narrator");
  };

  const stopGenerating = () => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (error) {
        console.debug("Stream aborted gracefully");
      }
    }
  };

  const getVoiceForCharacter = (name) => {
    switch (name) {
      case "Mistress Nyx":
        return "Amy";
      case "Lumina":
        return "Salli";
      case "Kael Neon":
        return "Matthew";
      case "Seraphina Vance":
        return "Emma";
      default:
        return "Joanna"; // A great default voice for custom characters
    }
  };

  // --- TTS PUTER CONTROL ---
  // --- TTS PUTER CONTROL ---
  const handleSpeak = async (text, index) => {
    if (typeof window === "undefined" || !window.puter) {
      alert(
        "Puter.js is not loaded. Please make sure the Puter script is added to your layout.",
      );
      return;
    }

    if (playingMessageId === index) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }
      setPlayingMessageId(null);
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    setPlayingMessageId(index);

    try {
      // 1. Get the dynamic voice based on the active character
      const selectedVoice = getVoiceForCharacter(charName);

      // 2. Pass the selected voice into the Puter API
      const audio = await window.puter.ai.txt2speech(text, {
        model: "neural",
        voice: selectedVoice,
      });
      currentAudioRef.current = audio;

      audio.onended = () => {
        setPlayingMessageId(null);
      };

      audio.onerror = () => {
        console.error("Audio playback error.");
        setPlayingMessageId(null);
      };

      audio.play();
    } catch (error) {
      console.error("TTS Error:", error);
      setPlayingMessageId(null);
    }
  };

  // --- DIRECTOR CONTROLS ---

  const handleRegenerate = async () => {
    if (isTyping || isStreaming || messagesRef.current.length === 0) return;

    const lastMsg = messagesRef.current[messagesRef.current.length - 1];
    if (lastMsg.role === "user") return;

    messagesRef.current = messagesRef.current.slice(0, -1);
    setMessages([...messagesRef.current]);

    const dynamicSystemPrompt = systemPrompt
      .replace(/{{char}}/g, charName || "Assistant")
      .replace(/{{user}}/g, userName || "User");

    const payloadWithSchema = {
      model: OPENROUTER_AI_MODEL,
      messages: [
        { role: "system", content: dynamicSystemPrompt },
        ...getSafeRecentMessages(),
      ],
      temperature: 0.7,
    };

    await handleStreamResponse(payloadWithSchema, lastMsg.role);
  };

  const handleRewind = () => {
    if (isTyping || isStreaming || messagesRef.current.length === 0) return;

    const lastUserIdx = messagesRef.current
      .map((m) => m.role)
      .lastIndexOf("user");
    if (lastUserIdx === -1) return;

    messagesRef.current = messagesRef.current.slice(0, lastUserIdx);
    setMessages([...messagesRef.current]);
    syncChatToDB(messagesRef.current, systemPrompt);
  };

  const startEdit = (index, currentContent) => {
    setEditingIndex(index);
    setEditContent(currentContent);
  };

  const saveEdit = (index) => {
    messagesRef.current[index].content = editContent;
    setMessages([...messagesRef.current]);
    setEditingIndex(null);
    syncChatToDB(messagesRef.current, systemPrompt);
  };

  // -------------------------

  const renderAvatar = (url, name, isUser) => {
    if (url) {
      return (
        <img
          src={url}
          alt={name}
          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0 border-2 border-rose-900/50 shadow-sm shadow-rose-900/20 bg-neutral-900"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = `https://ui-avatars.com/api/?name=${name}&background=4c0519&color=fda4af`;
          }}
        />
      );
    }
    return (
      <div
        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium shadow-sm ${
          isUser
            ? "bg-gradient-to-br from-rose-400 to-pink-600 text-white border-2 border-rose-300"
            : "bg-neutral-900 border-2 border-rose-900/50 text-rose-200"
        }`}
      >
        {(name || "?").charAt(0).toUpperCase()}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes breathe {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
        .animate-breathe {
          animation: breathe 20s ease-in-out infinite;
        }
      `}</style>

      <div className="flex h-screen bg-[#0a0508] text-neutral-100 font-sans overflow-hidden selection:bg-rose-500/30">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#120a0f] border-r border-rose-950/50 transform transition-transform duration-300 ease-in-out flex flex-col ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:relative md:translate-x-0`}
        >
          <div className="p-4 border-b border-rose-950/50">
            <button
              onClick={createNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-rose-900/20 hover:shadow-rose-900/40"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Discover Characters
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            <h3 className="text-[10px] font-bold text-rose-900/80 uppercase tracking-widest mb-2 px-2 mt-2">
              Your Connections
            </h3>
            {chatList.map((chat) => {
              const chatName = chat.char_name || `Chat ${chat.id}`;
              const lastMsg =
                chat.messages && chat.messages.length > 0
                  ? chat.messages[chat.messages.length - 1].content
                  : "Awaiting your message...";

              return (
                <button
                  key={chat.id}
                  onClick={() => {
                    stopGenerating();
                    if (currentAudioRef.current) {
                      currentAudioRef.current.pause();
                      setPlayingMessageId(null);
                    }
                    setChatId(chat.id);
                    setView("chat");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 text-left px-3 py-3 rounded-xl mb-1 transition-all ${
                    chatId === chat.id && view === "chat"
                      ? "bg-rose-950/40 shadow-inner border border-rose-900/30"
                      : "hover:bg-rose-950/20 border border-transparent"
                  }`}
                >
                  {chat.char_avatar ? (
                    <img
                      src={chat.char_avatar}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-neutral-900 border border-rose-900/50"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=${chatName}&background=4c0519&color=fda4af`;
                      }}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-rose-950 border border-rose-900/50 flex items-center justify-center flex-shrink-0 text-sm font-medium text-rose-300">
                      {chatName.charAt(0)}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <div
                      className={`font-medium text-sm truncate ${chatId === chat.id && view === "chat" ? "text-rose-100" : "text-neutral-300"}`}
                    >
                      {chatName}
                    </div>
                    <div className="text-xs text-rose-300/60 truncate mt-0.5 font-light">
                      {lastMsg}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="flex-1 flex flex-col h-screen relative bg-gradient-to-br from-[#0a0508] via-[#0f070b] to-[#140810]">
          <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-rose-950/30 bg-[#0a0508]/60 backdrop-blur-xl sticky top-0 z-20">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 -ml-2 text-rose-400 hover:text-rose-200 rounded-md"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
              </button>
              <button
                onClick={() => {
                  stopGenerating();
                  if (currentAudioRef.current) {
                    currentAudioRef.current.pause();
                    setPlayingMessageId(null);
                  }
                  setView("home");
                }}
                className="text-lg font-serif italic tracking-wide text-rose-100 hover:text-rose-300 transition-colors drop-shadow-md"
              >
                Dreamscape AI
              </button>
            </div>

            {view === "chat" && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-full transition-all ${
                  showSettings
                    ? "bg-rose-900/50 text-rose-100"
                    : "text-rose-400 hover:text-rose-200 hover:bg-rose-950/30"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            )}
          </header>

          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {view === "chat" && showSettings && (
            <div className="absolute top-[64px] inset-x-0 bg-[#120a0f] border-b border-rose-900/30 p-4 sm:p-6 animate-in slide-in-from-top-2 duration-200 shadow-2xl shadow-black z-30">
              <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-xs text-rose-300 pl-1 font-medium">
                    User Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full bg-[#0a0508] border border-rose-900/50 text-rose-100 px-3 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-rose-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-xs text-rose-300 pl-1 font-medium">
                    Character Name
                  </label>
                  <input
                    type="text"
                    value={charName}
                    onChange={(e) => setCharName(e.target.value)}
                    className="w-full bg-[#0a0508] border border-rose-900/50 text-rose-100 px-3 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-rose-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-xs text-rose-300 pl-1 font-medium">
                    Character Avatar URL
                  </label>
                  <input
                    type="url"
                    value={charAvatar}
                    onChange={(e) => setCharAvatar(e.target.value)}
                    className="w-full bg-[#0a0508] border border-rose-900/50 text-rose-100 px-3 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-rose-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="flex flex-col space-y-1">
                  <label className="text-xs text-rose-300 pl-1 font-medium">
                    Chat Background URL
                  </label>
                  <input
                    type="url"
                    value={chatBgImage}
                    onChange={(e) => setChatBgImage(e.target.value)}
                    className="w-full bg-[#0a0508] border border-rose-900/50 text-rose-100 px-3 py-2.5 rounded-xl text-sm focus:ring-1 focus:ring-rose-500 focus:outline-none transition-all"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end pt-3">
                  <button
                    onClick={openPromptModal}
                    className="px-6 py-2.5 bg-rose-950 hover:bg-rose-900 text-rose-100 text-sm font-medium rounded-xl border border-rose-800/50 transition-all shadow-md shadow-rose-900/10"
                  >
                    Edit System Prompt
                  </button>
                </div>
              </div>
            </div>
          )}

          {showPromptModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
              <div className="bg-[#120a0f] border border-rose-900/50 rounded-3xl w-full max-w-2xl flex flex-col shadow-2xl shadow-rose-900/20">
                <div className="p-5 border-b border-rose-900/30 flex justify-between items-center">
                  <h2 className="text-lg font-serif italic text-rose-100">
                    Character Persona
                  </h2>
                  <button
                    onClick={() => setShowPromptModal(false)}
                    className="text-rose-400 hover:text-rose-200 bg-rose-950/50 rounded-full p-1.5 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-5 flex-1">
                  <textarea
                    value={tempPrompt}
                    onChange={(e) => setTempPrompt(e.target.value)}
                    className="w-full h-64 bg-[#0a0508] border border-rose-900/50 rounded-2xl p-4 text-sm text-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-600/50 resize-none custom-scrollbar leading-relaxed"
                  />
                </div>
                <div className="p-5 border-t border-rose-900/30 flex justify-end gap-3 bg-[#0a0508]/50 rounded-b-3xl">
                  <button
                    onClick={() => setShowPromptModal(false)}
                    className="px-6 py-2.5 rounded-xl text-sm text-rose-300 hover:bg-rose-950/50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePrompt}
                    className="px-6 py-2.5 rounded-xl text-sm bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-lg shadow-rose-900/30 transition-all"
                  >
                    Save Persona
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === "home" && (
            <main className="flex-1 overflow-y-auto p-6 lg:p-12 custom-scrollbar">
              <div className="max-w-5xl mx-auto">
                <h2 className="text-4xl font-serif italic text-transparent bg-clip-text bg-gradient-to-r from-rose-200 to-pink-400 mb-3 drop-shadow-sm">
                  Meet Your Match
                </h2>
                <p className="text-rose-200/60 mb-10 text-lg font-light">
                  Choose a companion and begin your story.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {PRESET_CHARACTERS.map((char) => (
                    <button
                      key={char.id}
                      onClick={() => startCharacterChat(char)}
                      className="group relative flex flex-col text-left bg-[#120a0f] border border-rose-900/30 rounded-3xl overflow-hidden hover:border-rose-500/50 transition-all shadow-lg hover:shadow-2xl hover:shadow-rose-900/20 hover:-translate-y-1.5 duration-300"
                    >
                      <div className="h-40 w-full relative overflow-hidden">
                        <img
                          src={char.bgImage}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-110 group-hover:opacity-70 transition-all duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#120a0f] via-[#120a0f]/40 to-transparent" />
                      </div>
                      <div className="relative px-6 pb-6 flex flex-col items-center text-center -mt-12">
                        <img
                          src={char.avatar}
                          alt={char.name}
                          className="w-24 h-24 rounded-full object-cover border-4 border-[#120a0f] shadow-xl mb-4 bg-neutral-900 ring-2 ring-rose-900/30 group-hover:ring-rose-500/50 transition-all duration-300"
                        />
                        <h3 className="text-xl font-serif text-rose-100">
                          {char.name}
                        </h3>
                        <p className="text-sm text-rose-200/70 mt-2 line-clamp-2 leading-relaxed font-light">
                          {char.shortDesc}
                        </p>
                      </div>
                    </button>
                  ))}

                  <button
                    onClick={() =>
                      startCharacterChat({
                        name: "Custom Companion",
                        shortDesc: "Mould your perfect character from scratch.",
                        avatar: "",
                        bgImage: "",
                        systemPrompt:
                          "You are a deeply attentive and romantic companion.",
                      })
                    }
                    className="group flex flex-col items-center justify-center text-center bg-rose-950/10 border-2 border-rose-900/30 border-dashed rounded-3xl p-6 hover:bg-rose-950/30 hover:border-rose-500/50 transition-all min-h-[280px] hover:-translate-y-1.5 duration-300 shadow-none hover:shadow-xl hover:shadow-rose-900/10"
                  >
                    <div className="w-16 h-16 rounded-full bg-rose-950/50 flex items-center justify-center text-rose-400 mb-5 group-hover:text-rose-200 group-hover:bg-rose-800 transition-colors shadow-inner border border-rose-900/50">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        className="w-8 h-8"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4.5v15m7.5-7.5h-15"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-serif text-rose-200">
                      New Connection
                    </h3>
                    <p className="text-sm text-rose-400/60 mt-2 font-light">
                      Build from the ground up
                    </p>
                  </button>
                </div>
              </div>
            </main>
          )}

          {view === "chat" && (
            <>
              {chatBgImage && (
                <div className="absolute top-[72px] inset-x-0 h-[32rem] pointer-events-none z-0 overflow-hidden">
                  <div
                    className="w-full h-full bg-cover bg-center opacity-25 animate-breathe"
                    style={{
                      backgroundImage: `url(${chatBgImage})`,
                      maskImage:
                        "linear-gradient(to bottom, black 0%, transparent 100%)",
                      WebkitMaskImage:
                        "linear-gradient(to bottom, black 0%, transparent 100%)",
                      mixBlendMode: "screen",
                    }}
                  />
                </div>
              )}

              <main className="flex-1 overflow-y-auto p-4 sm:p-6 w-full max-w-3xl mx-auto custom-scrollbar relative z-10">
                {isInitialLoad ? (
                  <div className="flex items-center justify-center h-full text-rose-300/50 text-sm animate-pulse font-light">
                    Connecting...
                  </div>
                ) : (
                  <div className="flex flex-col space-y-8">
                    {messages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-center opacity-80 space-y-5 mt-24 animate-in fade-in duration-700">
                        <div className="w-32 h-32 mb-2 shadow-[0_0_40px_rgba(225,29,72,0.15)] rounded-full overflow-hidden border-4 border-[#0a0508] bg-rose-950 flex items-center justify-center ring-1 ring-rose-900/50">
                          {charAvatar ? (
                            <img
                              src={charAvatar}
                              alt={charName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = `https://ui-avatars.com/api/?name=${charName}&background=4c0519&color=fda4af`;
                              }}
                            />
                          ) : (
                            <span className="text-4xl font-serif text-rose-300">
                              {(charName || "?").charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <h2 className="text-2xl font-serif italic text-rose-100">
                            {charName}
                          </h2>
                          <p className="text-sm text-rose-300/60 mt-2 font-light">
                            The beginning of something special.
                          </p>
                        </div>
                      </div>
                    )}

                    {messages.map((msg, index) => {
                      const isUser = msg.role === "user";
                      const isNarrator =
                        msg.type === "narrator" || msg.role === "narrator";
                      const isEditing = editingIndex === index;

                      return (
                        <div
                          key={index}
                          className={`group relative flex w-full gap-3 sm:gap-4 ${isUser ? "justify-end" : "justify-start"}`}
                        >
                          {/* Left Avatar */}
                          {!isUser &&
                            !isNarrator &&
                            renderAvatar(charAvatar, charName, false)}

                          <div className="flex flex-col max-w-[80%] sm:max-w-[75%] relative">
                            {/* Hover Edit Button */}
                            {!isStreaming && !isTyping && !isEditing && (
                              <button
                                onClick={() => startEdit(index, msg.content)}
                                className={`opacity-0 group-hover:opacity-100 absolute ${isUser ? "-left-8" : "-right-8"} top-2 text-rose-800 hover:text-rose-400 p-1.5 transition-opacity duration-200`}
                                aria-label="Edit message"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                  className="w-4 h-4"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
                                  />
                                </svg>
                              </button>
                            )}

                            {isEditing ? (
                              <div className="flex flex-col gap-2 w-full min-w-[250px] animate-in fade-in duration-200">
                                <textarea
                                  value={editContent}
                                  onChange={(e) =>
                                    setEditContent(e.target.value)
                                  }
                                  className="w-full bg-[#120a0f] border border-rose-900/50 rounded-2xl p-4 text-sm text-rose-100 focus:outline-none focus:ring-1 focus:ring-rose-500 custom-scrollbar shadow-inner"
                                  rows={5}
                                  autoFocus
                                />
                                <div className="flex justify-end gap-2 mt-1">
                                  <button
                                    onClick={() => setEditingIndex(null)}
                                    className="text-xs font-medium text-rose-400 hover:text-rose-200 px-3 py-1.5 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => saveEdit(index)}
                                    className="text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white px-4 py-1.5 rounded-lg shadow-md shadow-rose-900/20 transition-colors"
                                  >
                                    Save Edit
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`px-6 py-4 rounded-3xl backdrop-blur-md shadow-sm flex flex-col gap-2 ${
                                  isUser
                                    ? "bg-gradient-to-br from-rose-100 to-rose-50 text-rose-950 rounded-tr-sm shadow-rose-900/10"
                                    : isNarrator
                                      ? "bg-purple-950/30 text-purple-100 rounded-tl-sm border border-purple-900/20 italic"
                                      : "bg-[#160b13]/80 text-rose-50 rounded-tl-sm border border-rose-900/20 shadow-black/20"
                                }`}
                              >
                                {/* THE REASONING DROPDOWN */}
                                {msg.reasoning && (
                                  <details className="group/details mb-1">
                                    <summary className="cursor-pointer flex items-center gap-1.5 text-[11px] font-medium text-rose-400/60 hover:text-rose-300 select-none transition-colors uppercase tracking-widest">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="w-3.5 h-3.5 group-open/details:rotate-90 transition-transform"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                      {isStreaming &&
                                      index === messages.length - 1 &&
                                      !msg.content
                                        ? "Thinking deeply..."
                                        : "Inner Thoughts"}
                                    </summary>
                                    <div className="mt-3 pl-4 pr-2 py-2 border-l border-rose-900/30 bg-[#0a0508]/40 rounded-r-xl text-[13px] text-rose-200/50 font-light italic leading-relaxed whitespace-pre-wrap">
                                      {msg.reasoning}
                                    </div>
                                  </details>
                                )}

                                {/* THE MAIN MESSAGE */}
                                <div className="leading-relaxed whitespace-pre-wrap text-[15px] font-light tracking-wide">
                                  <ReactMarkdown
                                    components={{
                                      em: ({ node, ...props }) => (
                                        <em
                                          className={`font-extralight opacity-80 ${!isUser && !isNarrator ? "text-rose-300" : ""}`}
                                          {...props}
                                        />
                                      ),
                                      strong: ({ node, ...props }) => (
                                        <strong
                                          className={`${!isUser && !isNarrator ? "text-rose-400" : "text-rose-900"} font-semibold`}
                                          {...props}
                                        />
                                      ),
                                    }}
                                  >
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            )}

                            {/* TTS Audio Button (Only for AI, not Narrator or User) */}
                            {!isUser &&
                              !isNarrator &&
                              !isEditing &&
                              !isStreaming &&
                              msg.content && (
                                <button
                                  onClick={() =>
                                    handleSpeak(msg.content, index)
                                  }
                                  className={`absolute -right-8 bottom-2 p-1.5 rounded-full transition-all duration-300 ${
                                    playingMessageId === index
                                      ? "text-rose-400 bg-rose-950/50 opacity-100 animate-pulse"
                                      : "text-rose-800/50 hover:text-rose-400 opacity-0 group-hover:opacity-100"
                                  }`}
                                  aria-label="Play message audio"
                                >
                                  {playingMessageId === index ? (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill="currentColor"
                                      className="w-4 h-4"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  ) : (
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={2}
                                      stroke="currentColor"
                                      className="w-4 h-4"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                                      />
                                    </svg>
                                  )}
                                </button>
                              )}
                          </div>

                          {/* Right Avatar */}
                          {isUser && renderAvatar(userAvatar, userName, true)}
                        </div>
                      );
                    })}

                    {isTyping && (
                      <div className="flex w-full gap-3 sm:gap-4 justify-start animate-in fade-in duration-300">
                        {renderAvatar(charAvatar, charName, false)}
                        <div className="bg-[#160b13]/80 border border-rose-900/20 backdrop-blur-md px-6 py-4 rounded-3xl rounded-tl-sm flex space-x-2 items-center h-[52px] shadow-sm">
                          <div className="w-1.5 h-1.5 bg-rose-400/80 rounded-full animate-pulse"></div>
                          <div className="w-1.5 h-1.5 bg-rose-400/80 rounded-full animate-pulse delay-75"></div>
                          <div className="w-1.5 h-1.5 bg-rose-400/80 rounded-full animate-pulse delay-150"></div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </main>

              <footer className="w-full max-w-3xl mx-auto px-4 pb-6 sm:px-6 sm:pb-8 relative z-10 flex flex-col gap-3">
                {/* DIRECTOR CONTROLS TOOLBAR */}
                <div className="flex gap-2 ml-2 overflow-x-auto custom-scrollbar pb-1">
                  <button
                    onClick={handleNarrate}
                    disabled={
                      isTyping ||
                      isStreaming ||
                      messages.length === 0 ||
                      isInitialLoad
                    }
                    className="text-xs px-4 py-1.5 bg-[#120a0f]/80 hover:bg-rose-950/50 backdrop-blur-xl disabled:opacity-40 text-rose-200 rounded-full border border-rose-900/30 transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                  >
                    <span className="text-[13px]">✧</span> Narrate Scene
                  </button>

                  <button
                    onClick={handleRewind}
                    disabled={
                      isTyping ||
                      isStreaming ||
                      messages.length === 0 ||
                      isInitialLoad ||
                      messages.findIndex((m) => m.role === "user") === -1
                    }
                    className="text-xs px-4 py-1.5 bg-[#120a0f]/80 hover:bg-rose-950/50 backdrop-blur-xl disabled:opacity-40 text-rose-200 rounded-full border border-rose-900/30 transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                    title="Delete last user message and responses"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-3.5 h-3.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                      />
                    </svg>
                    Rewind
                  </button>

                  <button
                    onClick={handleRegenerate}
                    disabled={
                      isTyping ||
                      isStreaming ||
                      messages.length === 0 ||
                      isInitialLoad ||
                      messages[messages.length - 1]?.role === "user"
                    }
                    className="text-xs px-4 py-1.5 bg-[#120a0f]/80 hover:bg-rose-950/50 backdrop-blur-xl disabled:opacity-40 text-rose-200 rounded-full border border-rose-900/30 transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                    title="Generate a new response for the last message"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-3.5 h-3.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                    Regenerate
                  </button>
                </div>

                <form
                  onSubmit={handleSend}
                  className="relative flex items-center bg-[#120a0f]/80 backdrop-blur-2xl border border-rose-900/30 rounded-full overflow-hidden focus-within:ring-2 focus-within:ring-rose-500/50 focus-within:border-rose-500/50 transition-all shadow-xl shadow-black/40"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Whisper to ${charName}...`}
                    className="flex-1 bg-transparent px-6 py-4 text-rose-50 placeholder-rose-300/40 focus:outline-none disabled:opacity-50 font-light"
                    autoComplete="off"
                    disabled={
                      isInitialLoad || isStreaming || editingIndex !== null
                    }
                  />

                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={stopGenerating}
                      className="absolute right-2 p-2.5 bg-rose-950 text-rose-400 rounded-full hover:bg-rose-900 transition-all shadow-lg shadow-rose-900/30"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4.5 7.5a3 3 0 013-3h9a3 3 0 013 3v9a3 3 0 01-3 3h-9a3 3 0 01-3-3v-9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={
                        !input.trim() ||
                        isTyping ||
                        isInitialLoad ||
                        editingIndex !== null
                      }
                      className="absolute right-2 p-2.5 bg-rose-600 text-white rounded-full hover:bg-rose-500 disabled:bg-rose-950/50 disabled:text-rose-900 transition-all shadow-lg shadow-rose-900/30 disabled:shadow-none"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-5 h-5 translate-x-[1px] translate-y-[-1px]"
                      >
                        <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                      </svg>
                    </button>
                  )}
                </form>
              </footer>
            </>
          )}
        </div>
      </div>
    </>
  );
}
