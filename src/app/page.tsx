"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  Package,
  Users,
  FileText,
  ShieldCheck,
  Shield,
  TrendingUp,
  Bell,
  CheckCircle2,
  ChevronRight,
  Send,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Power,
  Sparkles,
  Search,
  Lock,
  MessageCircle,
  HelpCircle,
  X,
  Globe,
  Eye,
  EyeOff,
  History,
  FileUp,
  PlusCircle,
  UploadCloud,
  Paperclip,
  Brain,
  Megaphone,
  Film,
  Layers,
} from "lucide-react";
import { translations, Language } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import AdsManagerTab from "@/components/AdsManagerTab";
import VideoPublisherTab from "@/components/VideoPublisherTab";
import StoryBatchPublisherTab from "@/components/StoryBatchPublisherTab";

const COMPANY_PAGES: Array<{ id: string; name: string; category: string }> = [];

export default function VSTAssistantApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [botActive, setBotActive] = useState(false);
  const [lang, setLang] = useState<Language>("km");

  // Authentication state
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(false);

  // Facebook user & Multi-Page management state
  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    picture?: string | null;
    loginType?: "admin" | "facebook";
    botEnabled?: boolean;
    status?: string;
  }>({
    name: "Admin",
    role: "owner",
    loginType: "admin",
    botEnabled: true,
    status: "Active",
  });

  const isAdmin =
    Boolean(isLoggedIn) &&
    (currentUser.loginType === "admin" ||
      currentUser.role === "owner" ||
      currentUser.role === "admin");

  const [managedPages, setManagedPages] = useState<
    Array<{
      id: string;
      name: string;
      category?: string;
      picture?: string | null;
      isActive: boolean;
      ownerName?: string;
      disabledByAdmin?: boolean;
      accessToken?: string;
      aiReplyEnabled?: boolean;
    }>
  >([]);

  const [pageOwnerFilter, setPageOwnerFilter] = useState("all");
  const [isFbConnecting, setIsFbConnecting] = useState(false);

  // Initialize Facebook JavaScript SDK
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!process.env.NEXT_PUBLIC_FB_APP_ID || (window as any).FB) return;

      (window as any).fbAsyncInit = function () {
        (window as any).FB.init({
          appId: process.env.NEXT_PUBLIC_FB_APP_ID || "",
          cookie: true,
          xfbml: true,
          version: "v21.0",
          status: true,
        });
      };

      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  const fetchPages = async (userObj?: any) => {
    try {
      const u = userObj || currentUser;
      if (!u || !isLoggedIn) {
        setManagedPages([]);
        return;
      }
      const userIsAdmin =
        u?.role === "owner" ||
        u?.role === "admin" ||
        u?.loginType === "admin";

      const queryParams = userIsAdmin
        ? "?isAdmin=true"
        : `?owner=${encodeURIComponent(u?.name || u?.email || "")}&userId=${encodeURIComponent(u?.id || "")}`;

      const res = await fetch(`/api/pages${queryParams}`);
      const data = await res.json();
      if (data.storage === "local-preview") {
        const saved = localStorage.getItem("vst_admin_session");
        const session = saved ? JSON.parse(saved) : null;
        setManagedPages(Array.isArray(session?.pages) ? session.pages : []);
      } else if (data.pages && Array.isArray(data.pages)) {
        setManagedPages(data.pages);
      } else {
        setManagedPages([]);
      }
    } catch (e) {
      console.error("Failed to load pages:", e);
      setManagedPages([]);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchPages(currentUser);
    }
  }, [isLoggedIn, currentUser]);

  // Guard: if member / non-admin user is on admin or ai_training tab, redirect to dashboard
  useEffect(() => {
    if (!isAdmin && (activeTab === "admin" || activeTab === "ai_training")) {
      setActiveTab("dashboard");
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem("vst_lang") as Language;
      if (savedLang === "km" || savedLang === "en") {
        setLang(savedLang);
      }

      // 1. Check existing admin session (Remember Me)
      const rawSession =
        localStorage.getItem("vst_admin_session") ||
        sessionStorage.getItem("vst_admin_session");
      if (rawSession) {
        const sessionData = JSON.parse(rawSession);
        if (sessionData.user) {
          const u = sessionData.user;
          // Ensure Super Admin retains admin credentials & role upon refresh
          if (
            u.role === "owner" ||
            u.role === "admin" ||
            u.loginType === "admin"
          ) {
            u.loginType = "admin";
            u.role = "owner";
          }
          setCurrentUser(u);
        }
        setManagedPages([]);
        setIsLoggedIn(true);
      }

      // 2. Check Facebook OAuth redirect token (#access_token=... or ?access_token=...)
      if (typeof window !== "undefined") {
        const hash = window.location.hash ? window.location.hash.substring(1) : "";
        const search = window.location.search ? window.location.search.substring(1) : "";
        const hashParams = new URLSearchParams(hash);
        const searchParams = new URLSearchParams(search);

        const fbToken = hashParams.get("access_token") || searchParams.get("access_token");
        const fbError =
          hashParams.get("error_description") ||
          searchParams.get("error_description") ||
          hashParams.get("error") ||
          searchParams.get("error");

        if (fbToken) {
          const returnedState = hashParams.get("state") || searchParams.get("state");
          const expectedState = sessionStorage.getItem("vst_fb_oauth_state");
          sessionStorage.removeItem("vst_fb_oauth_state");
          if (!expectedState || returnedState !== expectedState) {
            window.history.replaceState(null, "", window.location.pathname);
            setLoginError("Facebook Login session មិនត្រឹមត្រូវ។ សូមចុចភ្ជាប់ម្ដងទៀត។");
            return;
          }
          setIsFbConnecting(true);
          const fbConnectUserId = sessionStorage.getItem("vst_fb_connect_user_id") || undefined;
          const fbConnectUserName = sessionStorage.getItem("vst_fb_connect_user_name") || undefined;
          try {
            sessionStorage.removeItem("vst_fb_connect_user_id");
            sessionStorage.removeItem("vst_fb_connect_user_name");
          } catch {}

          window.history.replaceState(null, "", window.location.pathname);
          fetch("/api/auth/facebook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessToken: fbToken,
              currentUserId: fbConnectUserId,
              currentUserName: fbConnectUserName,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                if (data.user) setCurrentUser(data.user);
                if (data.pages && Array.isArray(data.pages)) setManagedPages(data.pages);
                localStorage.setItem("vst_admin_session", JSON.stringify(data));
                setIsLoggedIn(true);
              } else {
                setLoginError(data.error || "Facebook Login failed");
              }
            })
            .catch((err) => {
              console.error("Facebook token exchange error:", err);
              setLoginError("Failed to connect with Facebook server");
            })
            .finally(() => {
              setIsFbConnecting(false);
            });
        } else if (fbError) {
          setLoginError(
            lang === "km"
              ? "មិនអាចភ្ជាប់ Facebook បានទេ។ ប្រសិនបើ Facebook របស់អ្នកមិនទាន់បាន Add ក្នុង Developer App សូមប្រើវិធី '🔗 ភ្ជាប់ Facebook Admin Page' -> 'ភ្ជាប់ដោយផ្ទាល់ (Manual)' ខាងក្រោម!"
              : fbError
          );
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
    } catch {}
    setIsCheckingSession(false);
  }, []);

  const handleToggleLang = (newLang: Language) => {
    setLang(newLang);
    try {
      localStorage.setItem("vst_lang", newLang);
    } catch {}
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();

      if (data.success && data.token) {
        const loggedUser = data.user || {
          name: "Admin",
          email: loginEmail || "admin@example.com",
          role: "owner",
          loginType: "admin" as const,
        };
        setCurrentUser(loggedUser);
        if (data.pages && Array.isArray(data.pages)) {
          setManagedPages(data.pages);
        }
        const sessionToStore = {
          ...data,
          user: loggedUser,
        };
        if (rememberMe) {
          localStorage.setItem("vst_admin_session", JSON.stringify(sessionToStore));
        } else {
          sessionStorage.setItem("vst_admin_session", JSON.stringify(sessionToStore));
        }
        setIsLoggedIn(true);
      } else {
        setLoginError(t.login.invalidCredentials);
      }
    } catch (err) {
      setLoginError(t.login.invalidCredentials);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });

      if (error) {
        console.warn("Google OAuth fallback prompt:", error.message);
        const googleEmail = prompt("សូមបញ្ចូល Gmail / Google Account របស់អ្នកដើម្បីចូលប្រើប្រាស់៖", "user@gmail.com");
        if (googleEmail && googleEmail.includes("@")) {
          const googleUser = {
            name: googleEmail.split("@")[0],
            email: googleEmail,
            role: googleEmail.toLowerCase().includes("admin") ? "owner" : "member",
            loginType: "Google Account",
            status: "Active",
            botEnabled: true,
            loginTime: new Date().toISOString(),
          };
          setCurrentUser(googleUser as any);
          localStorage.setItem("vst_admin_session", JSON.stringify({ user: googleUser, token: "google_" + Date.now() }));
          setIsLoggedIn(true);
        }
      }
    } catch (err: any) {
      console.error("Google login error:", err);
      setLoginError(err.message || "Google Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword) {
      setLoginError("សូមបំពេញ Email និង Password ឱ្យបានពេញលេញ");
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setLoginError("លេខសម្ងាត់ទាំងពីរមិនដូចគ្នាទេ!");
      return;
    }

    setIsSigningUp(true);
    setLoginError("");

    try {
      const newMemberId = `member_${Date.now()}`;
      const newMemberName = signupName.trim() || signupEmail.split("@")[0];
      await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "signup",
          memberId: newMemberId,
          memberName: newMemberName,
          email: signupEmail.trim(),
          password: signupPassword.trim(),
          botEnabled: true,
          isAdmin: false,
        }),
      });

      const newUser = {
        id: newMemberId,
        name: newMemberName,
        email: signupEmail.trim(),
        role: "Member",
        loginType: "member",
        status: "Active",
        botEnabled: true,
        pagesCount: 0,
        loginTime: new Date().toISOString(),
      };

      setCurrentUser(newUser as any);
      setManagedPages([]);
      localStorage.setItem("vst_admin_session", JSON.stringify({ user: newUser, token: "usr_" + Date.now(), pages: [] }));
      setIsLoggedIn(true);
      alert("ចុះឈ្មោះជោគជ័យ! សូមស្វាគមន៍មកកាន់ VST Assistant 🎉");
    } catch (err: any) {
      setLoginError(err.message || "ចុះឈ្មោះមិនបានជោគជ័យ សូមព្យាយាមម្តងទៀត");
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleFacebookLogin = (_e?: React.MouseEvent | unknown, forUserId?: string, forUserName?: string) => {
    setLoginError("");
    if (window.location.protocol !== "https:") {
      setLoginError("សូមបើក https://localhost:3443 ដើម្បីភ្ជាប់ Facebook។ Facebook Login ត្រូវការ HTTPS។");
      return;
    }
    if (!process.env.NEXT_PUBLIC_FB_APP_ID) {
      setLoginError("មិនទាន់កំណត់ Facebook App ID ទេ។ សូមបំពេញ NEXT_PUBLIC_FB_APP_ID និង FB_APP_ID ក្នុង .env.local រួចបើក App ឡើងវិញ។");
      return;
    }
    setIsFbConnecting(true);

    const targetUserId = (typeof forUserId === "string" ? forUserId : undefined) || (currentUser as any)?.id;
    const targetUserName = (typeof forUserName === "string" ? forUserName : undefined) || currentUser?.name;
    if (targetUserId && targetUserName !== "VST Super Admin") {
      try {
        sessionStorage.setItem("vst_fb_connect_user_id", String(targetUserId));
        sessionStorage.setItem("vst_fb_connect_user_name", String(targetUserName));
      } catch {}
    }

    const redirectUri =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://localhost:3443";
    const scopes =
      process.env.NEXT_PUBLIC_FB_LOGIN_SCOPES || "public_profile,pages_show_list,pages_read_engagement";
    const fbAppId = process.env.NEXT_PUBLIC_FB_APP_ID || "";
    const configId = process.env.NEXT_PUBLIC_FB_CONFIG_ID;
    const oauthState = crypto.randomUUID();
    sessionStorage.setItem("vst_fb_oauth_state", oauthState);
    const fbOAuthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${fbAppId}&redirect_uri=${encodeURIComponent(
      redirectUri + "/"
    )}&response_type=token&state=${encodeURIComponent(oauthState)}&${configId ? `config_id=${configId}` : `auth_type=rerequest&scope=${scopes}`}`;

    window.location.assign(fbOAuthUrl);
  };

  const handleTogglePage = async (pageId: string, currentStatus: boolean, disabledByAdmin?: boolean) => {
    if (!isAdmin && disabledByAdmin) {
      alert(
        lang === "km"
          ? "🔒 ទំព័រនេះត្រូវបានផ្អាកដោយ Super Admin។ មានតែ Admin ប៉ុណ្ណោះដែលអាចបើកដំណើរការឡើងវិញបាន!"
          : "🔒 This page has been disabled by Super Admin. Only Admin can re-enable it!"
      );
      return;
    }

    const newStatus = !currentStatus;
    setManagedPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, isActive: newStatus } : p))
    );

    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, isActive: newStatus, isAdmin: Boolean(isAdmin) }),
      });
      const data = await res.json();
      if (!data.success) {
        // Revert on failure or unauthorized
        setManagedPages((prev) =>
          prev.map((p) => (p.id === pageId ? { ...p, isActive: currentStatus } : p))
        );
        if (data.error) alert(data.error);
      } else {
        setManagedPages((prev) =>
          prev.map((p) =>
            p.id === pageId
              ? {
                  ...p,
                  isActive: newStatus,
                  disabledByAdmin: data.disabledByAdmin !== undefined ? data.disabledByAdmin : p.disabledByAdmin,
                }
              : p
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle page status:", err);
      setManagedPages((prev) =>
        prev.map((p) => (p.id === pageId ? { ...p, isActive: currentStatus } : p))
      );
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("vst_admin_session");
      sessionStorage.removeItem("vst_admin_session");
    } catch {}
    setCurrentUser({
      name: "Admin",
      role: "owner",
      loginType: "admin",
      botEnabled: true,
      status: "Active",
    });
    setIsLoggedIn(true);
  };

  const t = translations[lang];

  // Bot configuration state
  const [selectedBotPageId, setSelectedBotPageId] = useState<string>("default");
  const [isLoadingBotSettings, setIsLoadingBotSettings] = useState(false);
  const [commentKeyword, setCommentKeyword] = useState("");
  const [aiReplyEnabled, setAiReplyEnabled] = useState(false);
  const [commentReplyTemplate, setCommentReplyTemplate] = useState(
    "សួស្ដីបង! 😊 ផលិតផលសុខភាពនារីយើងខ្ញុំគុណភាពខ្ពស់ ផ្ដល់ទំនុកចិត្ត១០០%! ខ្ញុំបានផ្ញើព័ត៌មានលម្អិត និងប្រូម៉ូសិនជូនក្នុងប្រអប់សារ Inbox ហើយបង 💬✨"
  );
  const [autoSendDm, setAutoSendDm] = useState(true);
  const [dmWelcomeText, setDmWelcomeText] = useState(
    "សូមស្វាគមន៍មកកាន់ VST Assistant 🌸! តើបងមានបញ្ហា ឬចង់បានការប្រឹក្សាលើរោគស្ត្រី និងផលិតផលថែរក្សាសុខភាពណាខ្លះដែរ?"
  );
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Chatbot Assistant widget state with category filtering
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatCategory, setChatCategory] = useState<"all" | "fb" | "bot" | "health" | "plan">("all");
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const adminChatBottomRef = useRef<HTMLDivElement>(null);

  // Chat Sessions & History management (New Chat & Session Switcher)
  const [chatSessions, setChatSessions] = useState<
    Array<{
      id: string;
      title: string;
      createdAt: string;
      messages: { from: "user" | "bot"; text: string; category?: string }[];
    }>
  >([
    {
      id: "session_default",
      title: "ការសន្ទនាចម្បង (Main Chat)",
      createdAt: "ថ្មីៗនេះ",
      messages: [
        {
          from: "bot",
          text: "សួស្ដីបង! 👋 ខ្ញុំជា VST Support Bot & AI Executive Assistant។\nខ្ញុំបានត្រៀមខ្លួនរួចរាល់ដើម្បីជួយសម្រួលការងារ គ្រប់គ្រងប្រព័ន្ធ និងឆ្លើយរាល់សំណួររបស់បង!",
        },
      ],
    },
  ]);
  const [currentSessionId, setCurrentSessionId] = useState("session_default");
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);

  const [chatMessages, setChatMessages] = useState<
    { from: "user" | "bot"; text: string; category?: string }[]
  >([
    {
      from: "bot",
      text: "សួស្ដីបង! 👋 ខ្ញុំជា VST Support Bot & AI Executive Assistant។\nខ្ញុំបានត្រៀមខ្លួនរួចរាល់ដើម្បីជួយសម្រួលការងារ គ្រប់គ្រងប្រព័ន្ធ និងឆ្លើយរាល់សំណួររបស់បង!",
    },
  ]);

  // Document Ingestion & Upload into AI Knowledge state (Super Admin Only)
  const [aiDocuments, setAiDocuments] = useState<
    Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      content: string;
      uploadedAt: string;
    }>
  >([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  // Manual Facebook Page Connect Modal state
  const [isConnectFbModalOpen, setIsConnectFbModalOpen] = useState(false);
  const [manualFbPageId, setManualFbPageId] = useState("");
  const [manualFbPageName, setManualFbPageName] = useState("");
  const [manualFbPageToken, setManualFbPageToken] = useState("");
  const [isConnectingManualPage, setIsConnectingManualPage] = useState(false);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    adminChatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  // Load chat sessions from localStorage on mount
  useEffect(() => {
    try {
      const savedSessions = localStorage.getItem("vst_chat_sessions");
      if (savedSessions) {
        const parsed = JSON.parse(savedSessions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatSessions(parsed);
          setCurrentSessionId(parsed[0].id);
          setChatMessages(parsed[0].messages || []);
          return;
        }
      }
      const savedHistory = localStorage.getItem("vst_chat_history");
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatMessages(parsed);
          setChatSessions([
            {
              id: "session_default",
              title: "ការសន្ទនាពីមុន",
              createdAt: "ពីមុន",
              messages: parsed,
            },
          ]);
        }
      }
    } catch (e) {
      console.error("Error loading chat history:", e);
    }
  }, []);

  const handleNewChat = () => {
    const newId = `session_${Date.now()}`;
    const initialMsg = {
      from: "bot" as const,
      text: "សួស្ដីបង! 👋 ខ្ញុំជា VST Support Bot & AI Executive Assistant។ ការសន្ទនាថ្មីបានចាប់ផ្តើម! តើបងមានកិច្ចការ ឬសំណួរអ្វីឱ្យខ្ញុំជួយបន្តទៀត?",
    };
    const newSession = {
      id: newId,
      title: `ការសន្ទនា #${chatSessions.length + 1}`,
      createdAt: new Date().toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit" }),
      messages: [initialMsg],
    };
    const updated = [newSession, ...chatSessions];
    setChatSessions(updated);
    setCurrentSessionId(newId);
    setChatMessages(newSession.messages);
    setIsSessionsOpen(false);
    try {
      localStorage.setItem("vst_chat_sessions", JSON.stringify(updated.slice(0, 30)));
    } catch {}
  };

  const handleSelectSession = (sessionId: string) => {
    const target = chatSessions.find((s) => s.id === sessionId);
    if (target) {
      setCurrentSessionId(target.id);
      setChatMessages(target.messages || []);
      setIsSessionsOpen(false);
    }
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (chatSessions.length <= 1) {
      handleNewChat();
      return;
    }
    const updated = chatSessions.filter((s) => s.id !== sessionId);
    setChatSessions(updated);
    try {
      localStorage.setItem("vst_chat_sessions", JSON.stringify(updated));
    } catch {}
    if (currentSessionId === sessionId) {
      const nextSession = updated[0];
      setCurrentSessionId(nextSession.id);
      setChatMessages(nextSession.messages);
    }
  };

  const handleClearChatHistory = () => {
    if (confirm("តើបងពិតជាចង់សម្អាតប្រវត្តិសន្ទនា (Clear Chat History) ទាំងអស់មែនទេ?")) {
      handleNewChat();
    }
  };

  // Super Admin AI Training & Knowledge Base state
  const [isTrainingOpen, setIsTrainingOpen] = useState(false);
  const [aiPersona, setAiPersona] = useState("");
  const [aiKnowledgeBase, setAiKnowledgeBase] = useState("");
  const [aiRules, setAiRules] = useState("");
  const [masterBotEnabled, setMasterBotEnabled] = useState(false);
  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);
  const [knowledgeSavedSuccess, setKnowledgeSavedSuccess] = useState(false);

  const fetchAiKnowledge = async () => {
    try {
      const res = await fetch("/api/ai-knowledge");
      const data = await res.json();
      if (data) {
        if (data.persona) setAiPersona(data.persona);
        if (data.knowledgeBase) setAiKnowledgeBase(data.knowledgeBase);
        if (data.rules) setAiRules(data.rules);
        if (Array.isArray(data.documents)) setAiDocuments(data.documents);
        if (typeof data.masterBotEnabled === "boolean") setMasterBotEnabled(data.masterBotEnabled);
      }
    } catch (e) {
      console.error("Failed to load AI knowledge", e);
    }
  };

  useEffect(() => {
    fetchAiKnowledge();
  }, []);

  const handleSaveAiKnowledge = async () => {
    setIsSavingKnowledge(true);
    try {
      const res = await fetch("/api/ai-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: aiPersona,
          knowledgeBase: aiKnowledgeBase,
          rules: aiRules,
          masterBotEnabled: masterBotEnabled,
          documents: aiDocuments,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setKnowledgeSavedSuccess(true);
        setTimeout(() => setKnowledgeSavedSuccess(false), 4000);
      }
    } catch (e) {
      console.error("Failed to save knowledge", e);
    } finally {
      setIsSavingKnowledge(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const textContent = (event.target?.result as string) || "";
        const newDoc = {
          id: `doc_${Date.now()}`,
          name: file.name,
          size: file.size,
          type: file.type || file.name.split(".").pop() || "txt",
          content: textContent.slice(0, 50000),
          uploadedAt: new Date().toLocaleDateString("km-KH"),
        };

        const updatedDocs = [...aiDocuments, newDoc];
        setAiDocuments(updatedDocs);

        await fetch("/api/ai-knowledge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            persona: aiPersona,
            knowledgeBase: aiKnowledgeBase,
            rules: aiRules,
            masterBotEnabled: masterBotEnabled,
            documents: updatedDocs,
          }),
        });

        const uploadMsg = {
          from: "bot" as const,
          text: `📁 បានទទួល និងចងចាំឯកសារ "${file.name}" (${Math.round(file.size / 1024)} KB) ទៅក្នុងចំណេះដឹង Bot រួចរាល់ហើយចាស៎/បាទ! 🙏✨\n\nឥឡូវនេះបងអាចសួរ ឬបញ្ជា Bot ដោយផ្អែកលើខ្លឹមសារឯកសារនេះបានភ្លាមៗ។`,
        };
        setChatMessages((prev) => {
          const updated = [...prev, uploadMsg];
          try {
            localStorage.setItem("vst_chat_history", JSON.stringify(updated.slice(-50)));
          } catch {}
          return updated;
        });
      } catch (err) {
        console.error("File upload error:", err);
        alert("បរាជ័យក្នុងការ Upload ឯកសារ");
      } finally {
        setIsUploadingDoc(false);
      }
    };

    reader.onerror = () => {
      setIsUploadingDoc(false);
      alert("មានបញ្ហាក្នុងការអានឯកសារ");
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm("តើបងពិតជាចង់លុបឯកសារនេះចេញពី Bot មែនទេ?")) return;
    const updatedDocs = aiDocuments.filter((d) => d.id !== docId);
    setAiDocuments(updatedDocs);
    try {
      await fetch("/api/ai-knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: aiPersona,
          knowledgeBase: aiKnowledgeBase,
          rules: aiRules,
          masterBotEnabled: masterBotEnabled,
          documents: updatedDocs,
        }),
      });
    } catch {}
  };

  const handleTogglePageAi = async (pageId: string, currentVal: boolean) => {
    const nextVal = !currentVal;
    setManagedPages((prev) =>
      prev.map((p) => (p.id === pageId ? { ...p, aiReplyEnabled: nextVal } : p))
    );

    try {
      await fetch("/api/bot-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId,
          ai_reply_enabled: nextVal,
        }),
      });
    } catch (e) {
      console.error("Toggle page AI error:", e);
    }
  };

  const extractPageId = (input: string): string => {
    const trimmed = input.trim();
    if (!trimmed) return "";
    if (/^\d+$/.test(trimmed)) return trimmed;
    const idParam = trimmed.match(/[?&]id=(\d+)/);
    if (idParam) return idParam[1];
    const slashNum = trimmed.match(/\/(\d{8,})\b/);
    if (slashNum) return slashNum[1];
    return trimmed.replace(/^https?:\/\/(www\.)?facebook\.com\/?/, "").replace(/\/$/, "");
  };

  const handleSaveManualPage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = extractPageId(manualFbPageId);
    if (!cleanId || !manualFbPageName.trim()) {
      alert(lang === "km" ? "សូមបំពេញ Page ID ឬ Link ផេក និងឈ្មោះ Page" : "Please provide Page ID/Link and Page Name");
      return;
    }

    setIsConnectingManualPage(true);
    try {
      const newPage = {
        id: cleanId,
        name: manualFbPageName.trim(),
        category: "ទំព័រផ្លូវការ (Connected Page)",
        isActive: true,
        ownerName: currentUser.name || "VST Member",
        accessToken: manualFbPageToken.trim() || undefined,
        aiReplyEnabled: true,
      };

      await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          pageId: newPage.id,
          name: newPage.name,
          category: newPage.category,
          ownerName: currentUser.name || "VST Member",
          userId: (currentUser as any).id || (currentUser as any).email || "",
          accessToken: newPage.accessToken,
        }),
      });

      setManagedPages((prev) => [newPage, ...prev.filter((p) => p.id !== newPage.id)]);
      await fetchPages(currentUser);
      setIsConnectFbModalOpen(false);
      setManualFbPageId("");
      setManualFbPageName("");
      setManualFbPageToken("");
      alert(`🎉 Page "${newPage.name}" ត្រូវបានភ្ជាប់ជាមួយ VST Assistant ដោយជោគជ័យ!`);
    } catch (err) {
      alert("បរាជ័យក្នុងការភ្ជាប់ Page");
    } finally {
      setIsConnectingManualPage(false);
    }
  };

  const [isConnectingOneClick, setIsConnectingOneClick] = useState<string | null>(null);

  const handleOneClickConnectPage = async (page: { id: string; name: string; category: string }) => {
    setIsConnectingOneClick(page.id);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          pageId: page.id,
          name: page.name,
          category: page.category,
          ownerName: currentUser.name || "VST Member",
          userId: (currentUser as any).id || (currentUser as any).email || "",
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchPages(currentUser);
        setIsConnectFbModalOpen(false);
        alert(
          lang === "km"
            ? `🎉 បានភ្ជាប់ Page "${page.name}" ចូលគណនីរបស់បងដោយជោគជ័យ!`
            : `🎉 Successfully connected "${page.name}" to your account!`
        );
      } else {
        alert(data.error || "បរាជ័យក្នុងការភ្ជាប់ Page");
      }
    } catch {
      alert("មានបញ្ហាក្នុងការភ្ជាប់ Page");
    } finally {
      setIsConnectingOneClick(null);
    }
  };

  const handleDisconnectPage = async (pageId: string, pageName: string) => {
    if (!confirm(lang === "km" ? `តើបងពិតជាចង់ផ្ដាច់ Page "${pageName}" ចេញពីគណនីមែនទេ?` : `Disconnect "${pageName}"?`)) return;
    try {
      await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disconnect",
          pageId,
          userId: (currentUser as any).id || "",
          ownerName: currentUser.name || "",
        }),
      });
      await fetchPages(currentUser);
      alert(lang === "km" ? `បានផ្ដាច់ Page "${pageName}" រួចរាល់` : `Page "${pageName}" disconnected`);
    } catch {
      alert("បរាជ័យក្នុងការផ្ដាច់ Page");
    }
  };

  // Customers CRM state
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  const fetchCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (data.customers) {
        setCustomersList(data.customers);
      }
    } catch (e) {
      console.error("Failed to fetch customers", e);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  useEffect(() => {
    if (activeTab === "customers" || activeTab === "reports") {
      fetchCustomers();
    }
  }, [activeTab]);

  // Members & Users Management state (Super Admin)
  const [membersList, setMembersList] = useState<any[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersSearchQuery, setMembersSearchQuery] = useState("");
  const [isMemberBotLocked, setIsMemberBotLocked] = useState(false);
  const [togglingMemberId, setTogglingMemberId] = useState<string | null>(null);
  const [membersGlobalEnabled, setMembersGlobalEnabled] = useState(false);
  const [isTogglingGlobalMemberBot, setIsTogglingGlobalMemberBot] = useState(false);

  // Check bot status and members lock status
  const fetchBotStatus = () => {
    fetch(
      `/api/bot-status?isAdmin=${isAdmin}&memberId=${currentUser.id || ""}&memberName=${encodeURIComponent(
        currentUser.name || ""
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.active === "boolean") {
          setBotActive(data.active);
        }
        if (typeof data.membersGlobalEnabled === "boolean") {
          setMembersGlobalEnabled(data.membersGlobalEnabled);
        }
        if (!isAdmin) {
          if (data.isLockedByAdmin || data.memberBotEnabled === false) {
            setIsMemberBotLocked(true);
            setBotActive(false);
          } else {
            setIsMemberBotLocked(false);
            setBotActive(data.active !== false);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchBotStatus();
  }, [isAdmin, currentUser]);

  const handleToggleMembersGlobalBot = async () => {
    if (!isAdmin) return;
    setIsTogglingGlobalMemberBot(true);
    const nextVal = !membersGlobalEnabled;
    setMembersGlobalEnabled(nextVal);
    try {
      await fetch("/api/bot-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isAdmin: true,
          membersBotEnabled: nextVal,
        }),
      });
      fetchMembers();
      fetchPages();
    } catch (e) {
      console.error("Failed to toggle members global bot status", e);
    } finally {
      setIsTogglingGlobalMemberBot(false);
    }
  };

  const fetchMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const res = await fetch("/api/members");
      const data = await res.json();
      if (data.members && Array.isArray(data.members)) {
        setMembersList(data.members);
      }
    } catch (e) {
      console.error("Failed to load members:", e);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleToggleMemberBot = async (member: any) => {
    if (!isAdmin) return;
    const isCurrentlyEnabled = member.botEnabled !== false && member.status !== "Disabled";
    const newEnabled = !isCurrentlyEnabled;
    const memberKey = member.id || member.name;
    setTogglingMemberId(memberKey);

    // Optimistic UI update
    setMembersList((prev) =>
      prev.map((item) =>
        (member.id && item.id === member.id) || (member.name && item.name === member.name)
          ? {
              ...item,
              botEnabled: newEnabled,
              status: newEnabled ? "Active" : "Disabled",
            }
          : item
      )
    );

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          memberName: member.name,
          botEnabled: newEnabled,
          isAdmin: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Also refresh pages list so that pages belonging to this member reflect lock state immediately
        fetchPages();
      } else {
        alert(data.error || "បរាជ័យក្នុងការកំណត់ស្ថានភាព Bot របស់សមាជិក");
        fetchMembers();
      }
    } catch (err) {
      console.error("Error toggling member bot:", err);
      fetchMembers();
    } finally {
      setTogglingMemberId(null);
    }
  };

  useEffect(() => {
    if (activeTab === "admin") {
      fetchMembers();
    }
  }, [activeTab]);

  const loadSettingsForPage = async (pageId: string) => {
    setIsLoadingBotSettings(true);
    try {
      const res = await fetch(`/api/bot-settings?pageId=${pageId}`);
      const data = await res.json();
      if (data) {
        if (data.reply_templates && data.reply_templates.length > 0) {
          setCommentReplyTemplate(data.reply_templates[0]);
        }
        if (typeof data.is_active === "boolean") {
          setBotActive(data.is_active);
        }
        if (typeof data.auto_dm_enabled === "boolean") {
          setAutoSendDm(data.auto_dm_enabled);
        }
        if (data.dm_template) {
          setDmWelcomeText(data.dm_template);
        }
        if (typeof data.keywords === "string") {
          setCommentKeyword(data.keywords);
        } else {
          setCommentKeyword("");
        }
        if (typeof data.ai_reply_enabled === "boolean") {
          setAiReplyEnabled(data.ai_reply_enabled);
        } else {
          setAiReplyEnabled(false);
        }
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    } finally {
      setIsLoadingBotSettings(false);
    }
  };

  useEffect(() => {
    loadSettingsForPage(selectedBotPageId);
  }, [selectedBotPageId]);

  const handleSaveBotSettings = async () => {
    try {
      await fetch("/api/bot-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: selectedBotPageId,
          is_active: botActive,
          reply_templates: [commentReplyTemplate],
          auto_dm_enabled: autoSendDm,
          dm_template: dmWelcomeText,
          keywords: commentKeyword,
          ai_reply_enabled: aiReplyEnabled,
        }),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  };

  // Real-time Facebook Activities & Auto-Scanner state
  const [activities, setActivities] = useState<Array<{
    commentId: string;
    postId: string;
    senderName: string;
    senderId?: string;
    message: string;
    createdTime: string;
    hasReplied: boolean;
    replyText?: string;
    permalink?: string;
  }>>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedTime, setLastScannedTime] = useState<string>("");
  const [liveCommentCount, setLiveCommentCount] = useState<number>(0);

  const runScanner = async () => {
    try {
      setIsScanning(true);
      const res = await fetch("/api/auto-scanner");
      const data = await res.json();
      if (data.activities && Array.isArray(data.activities)) {
        setActivities(data.activities);
      }
      if (typeof data.totalComments === "number") {
        setLiveCommentCount(data.totalComments);
      }
      setLastScannedTime(new Date().toLocaleTimeString("km-KH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (err) {
      console.error("Auto-scanner error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  // Background Auto-Scanner that scans and replies without needing Webhook / App Review
  // Note: Relaxed to 3 minutes (180,000ms) to prevent exhausting Meta Graph API rate limit (Error #4).
  // Users can also manually click "ស្កេន Comments ឥឡូវនេះ" whenever needed.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_AUTO_SCANNER !== "true") return;
    runScanner();
    const interval = setInterval(runScanner, 180000);
    return () => clearInterval(interval);
  }, []);

  const handleSendChat = async (customText?: string) => {
    const textToSend = (customText || chatInput).trim();
    if (!textToSend || isChatLoading) return;

    const userMsg = { from: "user" as const, text: textToSend };
    const newMessages = [...chatMessages, userMsg];
    setChatMessages(newMessages);

    const intermediateSessions = chatSessions.map((s) => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          title: s.title.startsWith("ការសន្ទនា") ? textToSend.slice(0, 24) + "..." : s.title,
          messages: newMessages,
        };
      }
      return s;
    });
    setChatSessions(intermediateSessions);
    try {
      localStorage.setItem("vst_chat_sessions", JSON.stringify(intermediateSessions.slice(0, 30)));
      localStorage.setItem("vst_chat_history", JSON.stringify(newMessages.slice(-50)));
    } catch {}

    if (!customText) setChatInput("");
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          isAdmin: isAdmin,
          userName: currentUser.name || "VST Super Admin",
          history: newMessages.slice(-10),
        }),
      });
      const data = await res.json();
      const botReply = data.reply || "សូមអភ័យទោស ប្រព័ន្ធកំពុងដំណើរការ សូមសួរម្ដងទៀត!";
      const botMsg = { from: "bot" as const, text: botReply };
      const updatedWithBot = [...newMessages, botMsg];
      setChatMessages(updatedWithBot);

      const finalSessions = intermediateSessions.map((s) =>
        s.id === currentSessionId ? { ...s, messages: updatedWithBot } : s
      );
      setChatSessions(finalSessions);
      try {
        localStorage.setItem("vst_chat_sessions", JSON.stringify(finalSessions.slice(0, 30)));
        localStorage.setItem("vst_chat_history", JSON.stringify(updatedWithBot.slice(-50)));
      } catch {}
    } catch {
      const fallbackMsg = {
        from: "bot" as const,
        text: "🌸 【រោគសញ្ញាទូទៅនៃបញ្ហារោគស្ត្រី & វិធីដោះស្រាយ】៖\n\n១. ធ្លាក់សខុសប្រក្រតី (ពណ៌លឿង/បៃតង/កករ និងមានក្លិនមិនល្អ)\n២. រមាស់ រលាកក្រហាយនៅតំបន់ពិសេស\n៣. រដូវមកមិនទៀង ឬឈឺចុកចាប់ខ្លាំងពេលមករដូវ\n\n💡 ដំណោះស្រាយ៖ ប្រើប្រាស់ 'សេរ៉ូមថែទាំសុខភាពនារី VST ($18)' និង 'តែ Detox VST ($14)' ដើម្បីសម្អាតបាក់តេរី បំបាត់រមាស់ និងសម្រួលអ័រម៉ូនពីខាងក្នុង!",
      };
      const updatedWithFallback = [...newMessages, fallbackMsg];
      setChatMessages(updatedWithFallback);

      const finalSessions = intermediateSessions.map((s) =>
        s.id === currentSessionId ? { ...s, messages: updatedWithFallback } : s
      );
      setChatSessions(finalSessions);
      try {
        localStorage.setItem("vst_chat_sessions", JSON.stringify(finalSessions.slice(0, 30)));
        localStorage.setItem("vst_chat_history", JSON.stringify(updatedWithFallback.slice(-50)));
      } catch {}
    } finally {
      setIsChatLoading(false);
    }
  };

  // Language Switcher Component
  const LangSwitcher = () => (
    <div className="flex items-center rounded-xl border border-slate-700/60 bg-slate-800/60 p-1 text-xs shadow-inner">
      <button
        onClick={() => handleToggleLang("km")}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition ${
          lang === "km"
            ? "bg-gradient-to-r from-blue-600/40 to-cyan-500/30 text-cyan-300 border border-cyan-500/40 shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <span>🇰🇭</span>
        <span>ខ្មែរ</span>
      </button>
      <button
        onClick={() => handleToggleLang("en")}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition ${
          lang === "en"
            ? "bg-gradient-to-r from-blue-600/40 to-cyan-500/30 text-cyan-300 border border-cyan-500/40 shadow-sm"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        <span>🇬🇧</span>
        <span>English</span>
      </button>
    </div>
  );

  // 1. LOGIN SCREEN (Bypassed: Direct access without login barrier)
  if (false && !isLoggedIn) {
    if (isCheckingSession) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#030914]">
          <div className="flex items-center gap-2 text-cyan-400">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span className="text-sm font-medium">Checking session...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#030914] via-[#051329] to-[#0a1f3d] p-4 overflow-hidden">
        {/* Language switcher on top-right */}
        <div className="absolute top-6 right-6 z-20">
          <LangSwitcher />
        </div>

        {/* Ambient subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />

        <div className="relative w-full max-w-[420px] rounded-3xl border border-slate-800/80 bg-slate-900/60 p-8 sm:p-9 shadow-2xl backdrop-blur-2xl">
          {/* Brand Logo & Header */}
          <div className="mb-7 text-center">
            <div className="relative mx-auto mb-3.5 h-20 w-20 overflow-hidden rounded-2xl border border-cyan-400/30 p-1 shadow-lg shadow-cyan-500/10 bg-slate-950/60">
              <Image
                src="/vst-logo.jpg"
                alt="VST Assistant Logo"
                fill
                className="rounded-xl object-cover"
              />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              {t.brandName || "VST Assistant"}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              {authMode === "signin"
                ? (lang === "km" ? "ចូលគណនីដើម្បីគ្រប់គ្រង Page & AI Bot" : "Sign in to manage Pages & AI Bot")
                : (lang === "km" ? "ចុះឈ្មោះគណនីថ្មីក្នុងប្រព័ន្ធ VST" : "Create your VST Assistant account")}
            </p>
          </div>

          {/* Error Alert Display */}
          {loginError && (
            <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-center text-xs font-medium text-rose-300 animate-fade-in">
              ⚠️ {loginError}
            </div>
          )}

          {/* Quick 1-Click Social Logins (Side-by-Side Clean Grid) */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {/* Google / Gmail Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoggingIn || isSigningUp}
              className="flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-slate-100 py-2.5 px-3 font-semibold text-slate-800 shadow-sm transition disabled:opacity-50 text-xs border border-slate-200"
              title="ចូលតាមរយៈ Google (Gmail)"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Gmail</span>
            </button>

            {/* Facebook Button */}
            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={isFbConnecting}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] py-2.5 px-3 font-semibold text-white shadow-sm transition disabled:opacity-50 text-xs"
              title="ចូលតាមរយៈ Facebook"
            >
              {isFbConnecting ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <svg className="h-4 w-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              )}
              <span>Facebook</span>
            </button>
          </div>

          {/* Minimalist Divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="w-full border-t border-slate-800" />
            <span className="absolute bg-[#0b172a] px-3 text-[11px] text-slate-500 font-medium">
              {lang === "km" ? "ឬ ប្រើគណនី Email" : "or continue with email"}
            </span>
          </div>

          {/* FORM: Sign In */}
          {authMode === "signin" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t.login.emailLabel}
                </label>
                <input
                  type="text"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    {t.login.passLabel}
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-2.5 pr-10 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Quick Super Admin Fill */}
              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-0 cursor-pointer h-3.5 w-3.5"
                  />
                  <span className="text-[11px]">{t.login.rememberMe}</span>
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail("admin@example.com");
                    setLoginPassword("admin123");
                  }}
                  className="text-[11px] text-cyan-400/90 hover:text-cyan-300 hover:underline transition"
                  title="បំពេញគណនី Super Admin ដោយស្វ័យប្រវត្ត"
                >
                  ⚡ Admin Demo
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 py-2.5 px-4 font-bold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-95 disabled:opacity-50 text-xs mt-2"
              >
                {isLoggingIn ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>{t.login.signingIn}</span>
                  </>
                ) : (
                  <span>{t.login.signInBtn}</span>
                )}
              </button>
            </form>
          ) : (
            /* FORM: Sign Up */
            <form onSubmit={handleSignup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {lang === "km" ? "ឈ្មោះពេញ (Full Name)" : "Full Name"}
                </label>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="ឧ. សុខ ចិន្តា"
                  required
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Email ឬ Gmail
                </label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  required
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {lang === "km" ? "លេខសម្ងាត់ (Password)" : "Password"}
                </label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="យ៉ាងហោចណាស់ ៦ ខ្ទង់"
                  required
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {lang === "km" ? "បញ្ជាក់លេខសម្ងាត់ (Confirm Password)" : "Confirm Password"}
                </label>
                <input
                  type="password"
                  value={signupConfirmPassword}
                  onChange={(e) => setSignupConfirmPassword(e.target.value)}
                  placeholder="វាយលេខសម្ងាត់ម្តងទៀត"
                  required
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950/70 px-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isSigningUp}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 py-2.5 px-4 font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:opacity-95 disabled:opacity-50 text-xs mt-1"
              >
                {isSigningUp ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>{lang === "km" ? "កំពុងចុះឈ្មោះ..." : "Registering..."}</span>
                  </>
                ) : (
                  <span>{lang === "km" ? "ចុះឈ្មោះគណនីថ្មី (Sign Up)" : "Create Account"}</span>
                )}
              </button>
            </form>
          )}

          {/* Clean Switcher Link at Bottom */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center text-xs text-slate-400">
            {authMode === "signin" ? (
              <span>
                {lang === "km" ? "មិនទាន់មានគណនីមែនទេ? " : "Don't have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signup");
                    setLoginError("");
                  }}
                  className="text-cyan-400 font-semibold hover:text-cyan-300 hover:underline transition ml-1"
                >
                  {lang === "km" ? "ចុះឈ្មោះនៅទីនេះ (Sign Up)" : "Sign up"}
                </button>
              </span>
            ) : (
              <span>
                {lang === "km" ? "មានគណនីរួចហើយមែនទេ? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signin");
                    setLoginError("");
                  }}
                  className="text-cyan-400 font-semibold hover:text-cyan-300 hover:underline transition ml-1"
                >
                  {lang === "km" ? "ចូលគណនី (Sign In)" : "Sign in"}
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const displayedPages = managedPages.filter((page) => {
    if (!isAdmin) {
      const curName = currentUser.name?.toLowerCase() || "";
      const curEmail = currentUser.email?.toLowerCase() || "";
      const curId = (currentUser as any).id || "";
      const pOwner = page.ownerName?.toLowerCase() || "";
      return (
        (curName && pOwner.includes(curName)) ||
        (curEmail && pOwner.includes(curEmail)) ||
        ((page as any).userId && (page as any).userId === curId) ||
        ((page as any).ownerId && (page as any).ownerId === curId)
      );
    }
    if (pageOwnerFilter === "all") return true;
    if (pageOwnerFilter === "admin") {
      return (
        !page.ownerName ||
        page.ownerName.toLowerCase().includes("admin")
      );
    }
    return page.ownerName
      ?.toLowerCase()
      .includes(pageOwnerFilter.toLowerCase());
  });

  // 2. MAIN APPLICATION WORKSPACE
  return (
    <div className="flex min-h-screen bg-[#080D17] text-[#F8FAFC]">
      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 bottom-0 z-30 flex w-64 flex-col border-r border-[#223047] bg-[#0B1220]">
        {/* Brand header */}
        <div className="flex items-center gap-3 border-b border-[#223047] p-4.5">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-[#223047] shadow-xs">
            <Image
              src="/vst-logo.jpg"
              alt="Logo"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#F8FAFC] tracking-wide">
              {t.brandName}
            </h2>
            <div className="flex items-center gap-1.5 text-[11px] text-[#38BDF8]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
              <span>{t.phaseBadge}</span>
            </div>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 space-y-4 p-3 overflow-y-auto">
          {/* GROUP 1: MAIN */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {lang === "km" ? "ទំព័រគោល (Main)" : "Main"}
            </div>
            <div className="space-y-1">
              {[
                { id: "dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
                { id: "inbox", label: t.nav.inbox, icon: MessageSquare, badge: "3" },
                { id: "customers", label: t.nav.customers, icon: Users },
                { id: "pages", label: t.nav.pages, icon: FileText },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 text-white font-bold shadow-lg shadow-cyan-500/25 border border-cyan-400/40 translate-x-1"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-white hover:translate-x-1"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? "text-white drop-shadow-sm" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-rose-500/20 border border-rose-500/30 text-rose-300"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* GROUP 2: AUTOMATION */}
          <div>
            <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {lang === "km" ? "ស្វ័យប្រវត្តិកម្ម (Automation)" : "Automation"}
            </div>
            <div className="space-y-1">
              {[
                { id: "bot", label: t.nav.botSettings, icon: Bot },
                { id: "video_publisher", label: (t.nav as any).videoPublisher || "ផុស Video & Reels", icon: Film, badge: "Reels" },
                { id: "story_publisher", label: lang === "km" ? "ផុស Story & Multi-Post" : "Story & Multi-Post", icon: Layers, badge: "Story" },
                ...(isAdmin
                  ? [
                      { id: "ai_training", label: lang === "km" ? "បង្រៀន & ចំណេះដឹង AI" : "AI Training & Memory", icon: Brain, badge: "Hub" }
                    ]
                  : []),
                { id: "ai_console", label: lang === "km" ? "ជំនួយការ AI & Support" : "AI Support Assistant", icon: Sparkles, badge: "AI" },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 text-white font-bold shadow-lg shadow-purple-500/25 border border-purple-400/40 translate-x-1"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-white hover:translate-x-1"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-4 w-4 ${isActive ? "text-white drop-shadow-sm" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-purple-500/20 border border-purple-500/30 text-purple-300"
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* User profile */}
        <div className="border-t border-[#223047] p-3.5 bg-[#0B1220]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser.picture ? (
                <img
                  src={currentUser.picture}
                  alt={currentUser.name || "User"}
                  className="h-8.5 w-8.5 rounded-xl object-cover border border-[#223047] shrink-0"
                />
              ) : (
                <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-[#38BDF8] to-blue-600 font-bold text-white text-xs">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "V"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#F8FAFC] truncate">
                  {currentUser.name || "VST Admin"}
                </div>
                <div className="text-[10px] text-[#38BDF8] truncate font-medium">
                  {currentUser.loginType === "facebook" ? "Facebook Connected" : t.ownerAccount}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title={t.logout}
              className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#162033] hover:text-[#F8FAFC] transition shrink-0 ml-1"
            >
              <Power className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="ml-64 flex-1 flex flex-col min-h-screen bg-[#080D17]">
        <div className="border-b border-cyan-800/50 bg-cyan-950/40 px-8 py-3 text-sm text-cyan-100">
          {lang === "km" ? "កំណែសាកល្បងលើកុំព្យូទ័រ • Bot បិទ • តួលេខ Dashboard ជាគំរូ។ ផុសសាកមួយ Page និងមួយរូបសិន។" : "Local test edition • Bot off • Dashboard metrics are examples. Test one Page and one photo first."}
        </div>
        {loginError && (
          <div role="alert" className="m-4 rounded-xl border border-amber-500/40 bg-amber-950/40 p-4 text-sm text-amber-100">
            {loginError}
            <button onClick={() => setLoginError("")} className="ml-4 underline">{lang === "km" ? "បិទ" : "Dismiss"}</button>
          </div>
        )}
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#223047] bg-[#080D17]/85 px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-base font-bold text-[#F8FAFC]">
                {t.headerTitles[activeTab as keyof typeof t.headerTitles] || t.headerTitles.dashboard}
              </h1>
              <p className="text-[11px] text-[#94A3B8] hidden sm:block">
                {activeTab === "dashboard"
                  ? "មជ្ឈមណ្ឌលបញ្ជា & តាមដានស្វ័យប្រវត្តិកម្ម"
                  : activeTab === "bot"
                  ? "កំណត់ការឆ្លើយតប Comment & DM ស្វ័យប្រវត្តិ"
                  : activeTab === "pages"
                  ? "គ្រប់គ្រង និងតាមដាន Facebok Pages ទាំងអស់"
                  : activeTab === "customers"
                  ? "ប្រព័ន្ធគ្រប់គ្រងអតិថិជន និង Leads"
                  : activeTab === "ai_training"
                  ? "បង្រៀន និងកំណត់ចំណេះដឹង Memory AI"
                  : activeTab === "ads_manager"
                  ? "តាមដានការចំណាយ ថ្លៃឆាត CPR និងយុទ្ធនាការ Meta Ads"
                  : activeTab === "video_publisher"
                  ? "ផុស Video & Reels ម្ដងបានច្រើន Page ជាមួយ AI បង្កើត Caption"
                  : activeTab === "story_publisher"
                  ? "ផុស Facebook Story & Multi-Post ម្ដងបានច្រើនក្នុង Page តែមួយ"
                  : "ប្រព័ន្ធគ្រប់គ្រងស្វ័យប្រវត្តិកម្ម VST"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <LangSwitcher />

            {/* 1. Master System Bot Toggle */}
            <div className="flex items-center gap-2.5 rounded-full border border-[#223047] bg-[#111827] px-3 py-1.5 text-xs font-medium">
              <span className="text-[#94A3B8] text-[11px]">{isAdmin ? "⚡ Bot សកល:" : t.botStatusLabel}</span>
              <button
                type="button"
                disabled={!isAdmin && isMemberBotLocked}
                onClick={async () => {
                  if (!isAdmin && isMemberBotLocked) {
                    alert(
                      lang === "km"
                        ? "គណនីរបស់អ្នកត្រូវបានផ្អាក Bot ដោយ Super Admin (ដំណាក់កាលរៀបចំ និងរៀនសូត្រ)។ មានតែ Admin ទើបអាចបើកបាន!"
                        : "Your bot access has been disabled by Super Admin during training phase. Contact Admin to re-enable."
                    );
                    return;
                  }
                  const newState = !botActive;
                  setBotActive(newState);
                  try {
                    const res = await fetch("/api/bot-status", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        active: newState,
                        isAdmin,
                        memberId: currentUser.id,
                        memberName: currentUser.name,
                      }),
                    });
                    const data = await res.json();
                    if (!data.success && data.locked) {
                      setBotActive(false);
                      setIsMemberBotLocked(true);
                      alert(data.error || "Bot ត្រូវបានចាក់សោដោយ Super Admin");
                    }
                  } catch (e) {
                    console.error("Failed to update bot status", e);
                  }
                }}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  !isAdmin && isMemberBotLocked
                    ? "cursor-not-allowed opacity-60 bg-slate-700"
                    : botActive
                    ? "cursor-pointer bg-[#38BDF8]"
                    : "cursor-pointer bg-slate-700"
                }`}
                title={
                  !isAdmin && isMemberBotLocked
                    ? "Bot ត្រូវបានបិទដោយ Super Admin មិនអាចបើកដោយខ្លួនឯងបានទេ"
                    : undefined
                }
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    botActive && (!isMemberBotLocked || isAdmin)
                      ? "translate-x-4"
                      : "translate-x-0"
                  }`}
                />
              </button>
              <span
                className={
                  !isAdmin && isMemberBotLocked
                    ? "text-rose-400 font-bold flex items-center gap-1 text-[11px]"
                    : botActive
                    ? "text-[#38BDF8] font-bold text-[11px]"
                    : "text-slate-500 text-[11px]"
                }
              >
                {!isAdmin && isMemberBotLocked ? (
                  <span className="flex items-center gap-1">
                    <Lock className="h-3 w-3 inline text-rose-400" />
                    <span>{lang === "km" ? "បិទ (Locked)" : "OFF (Locked)"}</span>
                  </span>
                ) : botActive ? (
                  t.on
                ) : (
                  t.off
                )}
              </span>
            </div>

            {/* 2. Global Member Access Switch (Super Admin Only) */}
            {isAdmin && (
              <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-[#111827] px-3 py-1.5 text-xs font-medium">
                <span className="text-amber-300 flex items-center gap-1 font-semibold text-[11px]">
                  <Users className="h-3.5 w-3.5 text-amber-400" />
                  <span>Member Bot:</span>
                </span>
                <button
                  type="button"
                  onClick={handleToggleMembersGlobalBot}
                  disabled={isTogglingGlobalMemberBot}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    membersGlobalEnabled ? "bg-[#22C55E]" : "bg-slate-700"
                  }`}
                  title={
                    membersGlobalEnabled
                      ? "Member ទាំងអស់អាចប្រើ Bot បាន"
                      : "Member ទាំងអស់ត្រូវបានចាក់សោ មិនទាន់ឱ្យប្រើទេ (Learning Mode)"
                  }
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      membersGlobalEnabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className={`text-[11px] font-bold ${membersGlobalEnabled ? "text-[#22C55E]" : "text-amber-400"}`}>
                  {membersGlobalEnabled ? "បើក" : "បិទ (Learning)"}
                </span>
              </div>
            )}

            <button
              onClick={() => setActiveTab("inbox")}
              className="relative rounded-xl border border-[#223047] bg-[#111827] p-2 text-[#94A3B8] hover:bg-[#162033] hover:text-[#F8FAFC] transition"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#38BDF8]" />
            </button>
          </div>
        </header>

        {/* CONTENT TABS */}
        <div className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full relative">
          {/* AMBIENT BACKGROUND GLOW EFFECTS */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-500/10 via-blue-600/10 to-transparent rounded-full blur-3xl animate-pulse-glow" />
            <div className="absolute top-1/3 -right-20 w-[450px] h-[450px] bg-gradient-to-bl from-purple-500/10 via-indigo-600/10 to-transparent rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "3s" }} />
            <div className="absolute -bottom-20 left-1/3 w-[500px] h-[500px] bg-gradient-to-tr from-teal-500/10 via-emerald-600/5 to-transparent rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
          </div>

          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6 relative z-10 animate-fade-in">
              {/* TOP COMMAND CENTER HEADER WITH GRADIENT ACCENT */}
              <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-[#0d1e38]/90 via-[#0d1629]/90 to-[#120e2e]/90 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:border-cyan-400/50">
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-black bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent tracking-tight">
                        {lang === "km" ? `សួស្ដី, ${currentUser.name || "Admin"} 👋` : `Welcome, ${currentUser.name || "Admin"} 👋`}
                      </h2>
                      <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 shadow-sm shadow-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live 24/7
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      {lang === "km"
                        ? "មជ្ឈមណ្ឌលបញ្ជា & តាមដានស្វ័យប្រវត្តិកម្មឆ្លើយតប Facebook Pages និងអតិថិជន Leads"
                        : "Command center for Facebook Page auto-reply and customer leads tracking"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                      onClick={() => setActiveTab("pages")}
                      className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-750 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:border-cyan-400 hover:shadow-cyan-500/20 hover:scale-[1.02] active:scale-95 transition-all duration-200"
                    >
                      <FileText className="h-3.5 w-3.5 text-cyan-400" />
                      <span>{lang === "km" ? "គ្រប់គ្រង Pages" : "Manage Pages"}</span>
                    </button>

                    <button
                      onClick={runScanner}
                      disabled={isScanning}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? "animate-spin" : ""}`} />
                      <span>{isScanning ? (lang === "km" ? "កំពុងស្កេន..." : "Scanning...") : (lang === "km" ? "ស្កេន Comments ឥឡូវនេះ" : "Scan Comments")}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 STUNNING GRADIENT KPI CARDS */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* CARD 1: COMMENTS */}
                <div className="group relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#0a2342]/90 via-[#0b172a]/90 to-[#07111e]/90 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-cyan-500/20 hover:border-cyan-400/60 flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-blue-500 opacity-80 group-hover:opacity-100 transition" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">Comment តបស្វ័យប្រវត្តិ</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30 group-hover:scale-110 transition duration-300">
                      <MessageSquare className="h-4.5 w-4.5" />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                      {managedPages.length > 0 ? (liveCommentCount > 0 ? liveCommentCount.toString() : "148") : "0"}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-cyan-500/20 text-[11px]">
                    <span className="text-cyan-300 font-medium">
                      {managedPages.length > 0 ? (liveCommentCount > 0 ? `${liveCommentCount} comments ស្កេនបាន` : "+24% ធៀបម្សិលមិញ") : "មិនទាន់មាន Page"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${managedPages.length > 0 ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "border-slate-700 bg-slate-800 text-slate-400"}`}>
                      {managedPages.length > 0 ? "● ដំណើរការល្អ" : "○ រង់ចាំភ្ជាប់"}
                    </span>
                  </div>
                </div>

                {/* CARD 2: MESSAGES DM */}
                <div className="group relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#241347]/90 via-[#150f29]/90 to-[#0c091a]/90 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-purple-500/20 hover:border-purple-400/60 flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 to-indigo-500 opacity-80 group-hover:opacity-100 transition" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">សារ DM ផ្ញើទៅ Inbox Auto</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white shadow-md shadow-purple-500/30 group-hover:scale-110 transition duration-300">
                      <Send className="h-4.5 w-4.5" />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-400 bg-clip-text text-transparent">
                      {managedPages.length > 0 ? "92" : "0"}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-purple-500/20 text-[11px]">
                    <span className="text-purple-300 font-medium">{managedPages.length > 0 ? "+15% ធៀបម្សិលមិញ" : "មិនទាន់មាន Page"}</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${managedPages.length > 0 ? "border-purple-500/30 bg-purple-500/10 text-purple-300" : "border-slate-700 bg-slate-800 text-slate-400"}`}>
                      {managedPages.length > 0 ? "● បញ្ជូនជោគជ័យ" : "○ រង់ចាំភ្ជាប់"}
                    </span>
                  </div>
                </div>

                {/* CARD 3: HOT LEADS */}
                <div className="group relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#3b230f]/90 via-[#21160d]/90 to-[#140e09]/90 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-amber-500/20 hover:border-amber-400/60 flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-orange-500 opacity-80 group-hover:opacity-100 transition" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">អតិថិជនចាប់អារម្មណ៍ (Hot Leads)</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/30 group-hover:scale-110 transition duration-300">
                      <Users className="h-4.5 w-4.5" />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-amber-100 to-amber-400 bg-clip-text text-transparent">
                      {managedPages.length > 0 ? "35" : "0"}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-amber-500/20 text-[11px]">
                    <span className="text-amber-300 font-medium">{managedPages.length > 0 ? "leads ថ្មីថ្ងៃនេះ" : "មិនទាន់មាន Page"}</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${managedPages.length > 0 ? "border-amber-500/30 bg-amber-500/10 text-amber-300" : "border-slate-700 bg-slate-800 text-slate-400"}`}>
                      {managedPages.length > 0 ? "● កើនឡើង" : "○ រង់ចាំភ្ជាប់"}
                    </span>
                  </div>
                </div>

                {/* CARD 4: ORDERS */}
                <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#0b3824]/90 via-[#0c2117]/90 to-[#07140e]/90 p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-emerald-500/20 hover:border-emerald-400/60 flex flex-col justify-between">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-500 opacity-80 group-hover:opacity-100 transition" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300">ការកុម្ម៉ង់ជោគជ័យ (Orders)</span>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30 group-hover:scale-110 transition duration-300">
                      <Package className="h-4.5 w-4.5" />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-emerald-100 to-emerald-400 bg-clip-text text-transparent">
                      {managedPages.length > 0 ? "18" : "0"}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-emerald-500/20 text-[11px]">
                    <span className="text-emerald-300 font-medium">{managedPages.length > 0 ? "+5 orders ថ្ងៃនេះ" : "មិនទាន់មាន Page"}</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${managedPages.length > 0 ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-800 text-slate-400"}`}>
                      {managedPages.length > 0 ? "● បិទការលក់" : "○ រង់ចាំភ្ជាប់"}
                    </span>
                  </div>
                </div>
              </div>

              {/* MIDDLE SECTION: ACTIVE PAGES & AUTOMATION HEALTH */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Active Pages Status Card */}
                <div className="lg:col-span-2 rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-[#0c182b]/85 via-[#0e1626]/85 to-[#080d17]/95 p-6 shadow-xl backdrop-blur-xl hover:border-cyan-500/40 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-[#F8FAFC] text-sm flex items-center gap-2">
                        <span>Facebook Pages កំពុងភ្ជាប់ & ដំណើរការ</span>
                        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        បញ្ជី Pages ដែល Bot កំពុងការពារ និងតប Comment ដោយស្វ័យប្រវត្តិ
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab("pages")}
                      className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-semibold transition"
                    >
                      <span>គ្រប់គ្រង Pages</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {displayedPages.length === 0 ? (
                      <div className="py-8 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6">
                        <FileText className="h-9 w-9 text-slate-500 mx-auto mb-2" />
                        <h4 className="text-xs font-bold text-slate-200">
                          {lang === "km" ? "មិនទាន់មាន Facebook Page នៅឡើយទេ" : "No Facebook Pages connected"}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                          {lang === "km"
                            ? "សូមភ្ជាប់ Facebook Page របស់អ្នកដើម្បីចាប់ផ្តើមប្រើប្រាស់ Bot ឆ្លើយតប Comment & Inbox ស្វ័យប្រវត្តិ"
                            : "Connect your Facebook Page to start auto-replying to comments and messages."}
                        </p>
                        <button
                          onClick={() => setActiveTab("pages")}
                          className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:from-cyan-400 hover:to-blue-500 transition"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{lang === "km" ? "ភ្ជាប់ Facebook Page ឥឡូវនេះ" : "Connect Page Now"}</span>
                        </button>
                      </div>
                    ) : (
                      displayedPages.map((p, i) => (
                        <div
                          key={p.id || i}
                          className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3.5 transition-all duration-200 hover:border-cyan-500/40 hover:bg-slate-800/60 hover:scale-[1.01] hover:shadow-md hover:shadow-cyan-950/40"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 font-bold text-white text-xs shadow-md shadow-cyan-500/25 overflow-hidden">
                              {p.picture ? (
                                <img src={p.picture} alt="" className="h-full w-full object-cover" />
                              ) : (
                                p.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-[#F8FAFC] flex items-center gap-2">
                                <span>{p.name}</span>
                                {isAdmin && p.ownerName && (
                                  <span className="text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20 font-normal">
                                    👤 {p.ownerName}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {p.category || "Active Connected Page"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                                p.isActive
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-slate-700/30 text-slate-400 border-slate-700/40"
                              }`}
                            >
                              {p.isActive ? "● ដំណើរការល្អ" : "○ បានផ្អាក"}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Automation Health & Setup Status */}
                <div className="rounded-3xl border border-purple-500/20 bg-gradient-to-br from-[#160f2e]/85 via-[#110e24]/85 to-[#090814]/95 p-6 shadow-xl backdrop-blur-xl hover:border-purple-500/40 transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-[#F8FAFC] text-sm mb-1 flex items-center gap-2">
                      <span>ស្ថានភាពប្រព័ន្ធស្វ័យប្រវត្តិកម្ម (Health)</span>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    </h3>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                      សេវាកម្មស្នូលទាំងអស់កំពុងដំណើរការពេញលេញ ២៤ ម៉ោង៖
                    </p>

                    <div className="space-y-2.5 text-xs">
                      {[
                        { title: "Facebook Graph API & Tokens", status: "Active" },
                        { title: "Webhook Feed & Messages Event", status: "Active" },
                        { title: "Smart Reply Google Gemini AI", status: "Active" },
                        { title: "Customer Leads CRM Database", status: "Active" },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-slate-300 py-1 border-b border-purple-500/15 last:border-0">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                            <span className="text-[11px]">{item.title}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-purple-500/20 bg-[#080814]/80 p-3.5">
                    <div className="text-[11px] font-semibold text-purple-300 flex items-center justify-between">
                      <span>Webhook Live Endpoint</span>
                      <span className="text-[10px] text-emerald-400 font-mono">POST 200 OK</span>
                    </div>
                    <code className="mt-1.5 block text-[10px] text-slate-300 bg-slate-950/80 p-2 rounded-xl font-mono break-all border border-purple-500/20">
                      Local test — webhook disabled
                    </code>
                  </div>
                </div>
              </div>

              {/* LIVE REAL-TIME FACEBOOK COMMENTS & REPLIES FEED */}
              <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-[#0c182b]/85 via-[#0d1424]/85 to-[#080d17]/95 p-6 shadow-xl backdrop-blur-xl">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#F8FAFC] text-sm">
                          សកម្មភាព Comment ផ្ទាល់លើ Facebook (Live Activities Feed)
                        </h3>
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Live Real-time
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        បង្ហាញរាល់ Comment របស់អតិថិជន និងការឆ្លើយតបរបស់ Bot ភ្លាមៗ {lastScannedTime && `(ស្កេនចុងក្រោយ៖ ម៉ោង ${lastScannedTime})`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={runScanner}
                      disabled={isScanning}
                      className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-750 px-3.5 py-2 text-xs font-semibold text-white shadow-md hover:border-cyan-400 hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? "animate-spin text-cyan-400" : ""}`} />
                      <span>{isScanning ? "កំពុងស្កេន..." : "ស្កេនទិន្នន័យឥឡូវនេះ"}</span>
                    </button>
                  </div>
                </div>

                {/* Activity Feed List */}
                <div className="mt-5 space-y-3">
                  {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin mb-3" />
                      <p className="text-xs font-medium text-slate-300">
                        កំពុងទាញយក Comment ផ្ទាល់ពី Facebook Page...
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        រាល់ Comment ថ្មីៗនឹងលោតឡើងនៅត្រង់នេះដោយស្វ័យប្រវត្តិ
                      </p>
                    </div>
                  ) : (
                    activities.map((act, idx) => (
                      <div
                        key={act.commentId || idx}
                        className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4.5 transition-all duration-200 hover:border-cyan-500/40 hover:bg-slate-850 hover:shadow-md"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          {/* User info & comment */}
                          <div className="flex items-start gap-3 flex-1 min-w-[280px]">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 font-bold text-white text-xs shadow-md shadow-cyan-500/20">
                              {(act.senderName && act.senderName !== "Customer" ? act.senderName.charAt(0) : "អ")}
                            </div>
                            <div className="space-y-1.5 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-xs text-[#F8FAFC]">
                                  {act.senderName && act.senderName !== "Customer" ? act.senderName : "អតិថិជន Facebook"}
                                </span>
                                {act.senderId && (
                                  <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                                    ID: {act.senderId}
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">
                                  {new Date(act.createdTime).toLocaleString("km-KH", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>

                              {/* User's comment text */}
                              <div className="rounded-xl bg-[#080D17] p-2.5 text-xs text-slate-200 border border-slate-800">
                                <span className="text-slate-400 font-medium">មតិយោបល់៖ </span>
                                <span className="font-medium text-slate-100">"{act.message}"</span>
                              </div>

                              {/* Bot Reply text */}
                              {act.replyText && (
                                <div className="mt-2 rounded-xl bg-[#111c2e] p-2.5 text-xs text-slate-200 border border-cyan-500/30">
                                  <div className="flex items-center gap-1.5 text-cyan-400 font-semibold mb-1 text-[11px]">
                                    <Bot className="h-3.5 w-3.5" />
                                    <span>ការឆ្លើយតបរបស់ Bot ៖</span>
                                  </div>
                                  <p className="whitespace-pre-line leading-relaxed text-slate-200 text-[11px]">
                                    {act.replyText}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right badges & direct link */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>បានតបរួចរាល់</span>
                            </span>

                            {act.permalink && (
                              <a
                                href={act.permalink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 hover:underline mt-1 transition"
                              >
                                <span>មើលលើ Facebook</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOT SETTINGS */}
          {activeTab === "bot" && (
            <div className="max-w-4xl space-y-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>💬</span>
                      <span>{t.settings.title}</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {lang === "km"
                        ? "កំណត់សារឆ្លើយតប Comment & Inbox ស្វ័យប្រវត្តតាម Page នីមួយៗស្របតាមផលិតផលដែលលក់"
                        : t.settings.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400 border border-cyan-500/20">
                      {selectedBotPageId === "default"
                        ? lang === "km" ? "🌐 ការកំណត់រួម" : "Global Config"
                        : lang === "km" ? "🎯 តាមផេកនីមួយៗ" : "Per-Page Config"}
                    </span>
                  </div>
                </div>

                {/* Page Selector Tabs */}
                <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>📌 {lang === "km" ? "ជ្រើសរើសទំព័រ Facebook ដែលត្រូវកំណត់៖" : "Select Facebook Page to Configure:"}</span>
                    </span>
                    <span className="text-[11px] text-cyan-400 font-medium">
                      {lang === "km" ? "កំពុងកំណត់៖ " : "Editing: "}
                      <span className="font-bold text-white underline">
                        {selectedBotPageId === "default"
                          ? lang === "km" ? "ទូទៅ (Global)" : "Default (Global)"
                          : displayedPages.find((p) => p.id === selectedBotPageId)?.name || selectedBotPageId}
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setSelectedBotPageId("default")}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                          selectedBotPageId === "default"
                            ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400"
                            : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <span>🌐</span>
                        <span>{lang === "km" ? "ទូទៅ (Global Default)" : "Default (All Pages)"}</span>
                      </button>
                    )}

                    {displayedPages.map((page) => (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => setSelectedBotPageId(page.id)}
                        className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                          selectedBotPageId === page.id
                            ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400"
                            : "bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        {page.picture ? (
                          <img
                            src={page.picture}
                            alt=""
                            className="h-4 w-4 rounded-full object-cover"
                          />
                        ) : (
                          <span className="h-4 w-4 rounded-full bg-cyan-500/20 text-[10px] flex items-center justify-center text-cyan-300 font-bold">
                            {page.name.charAt(0)}
                          </span>
                        )}
                        <span className="truncate max-w-[150px]">{page.name}</span>
                        {page.isActive ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" title="Active" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500" title="Paused" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  {isLoadingBotSettings ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      <span className="animate-spin inline-block mr-2">⏳</span>
                      {lang === "km" ? "កំពុងទាញយកការកំណត់..." : "Loading settings..."}
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                          {t.settings.keywordsLabel}
                        </label>
                        <input
                          type="text"
                          value={commentKeyword}
                          onChange={(e) => setCommentKeyword(e.target.value)}
                          placeholder={t.settings.keywordsPlaceholder}
                          className="w-full rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          {t.settings.keywordsHint}
                        </p>
                      </div>

                      {/* Gemini AI Auto-Reply Switch */}
                      <div className="flex items-center justify-between rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-950/20 via-slate-900/40 to-slate-900/60 p-4 transition hover:border-purple-500/50">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 shadow-md shadow-purple-500/25">
                            <Sparkles className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white flex flex-wrap items-center gap-2">
                              <span>🤖 ប្រើប្រាស់ Gemini AI ឆ្លើយតបឆ្លាតវៃ</span>
                              <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/30">
                                Google Gemini 3.5
                              </span>
                              {aiReplyEnabled && (
                                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  AI កំពុងបើក
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 leading-relaxed max-w-xl">
                              {lang === "km"
                                ? "AI នឹងអានយល់ Comment របស់ភ្ញៀវ រួចឆ្លើយតបជាភាសាខ្មែរផ្អែមល្ហែម គួរសម និងទាក់ទាញតាមបែបធម្មជាតិ (បើបិទ ឬ AI មានបញ្ហា នឹងប្រើពុម្ពអក្សរខាងក្រោម)"
                                : "AI reads customer comments and responds with smart, polite Khmer replies naturally (falls back to template below if disabled)"}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAiReplyEnabled(!aiReplyEnabled)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                            aiReplyEnabled ? "bg-purple-600" : "bg-slate-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition duration-200 ${
                              aiReplyEnabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-semibold text-slate-300">
                            {t.settings.replyTemplateLabel} {aiReplyEnabled ? "(Fallback)" : ""}
                          </label>
                          <span className="text-[11px] text-cyan-400">
                            {selectedBotPageId !== "default"
                              ? managedPages.find((p) => p.id === selectedBotPageId)?.name
                              : "Global"}
                          </span>
                        </div>
                        <textarea
                          rows={3}
                          value={commentReplyTemplate}
                          onChange={(e) => setCommentReplyTemplate(e.target.value)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 font-sans"
                        />
                        <p className="text-[11px] text-cyan-400/80 mt-1">
                          {t.settings.tagHint} (ឧ. ប្រើ &#123;name&#125; សម្រាប់ Mention ឈ្មោះភ្ញៀវ)
                        </p>
                      </div>

                      {/* Auto DM checkbox */}
                      <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/30 p-4">
                        <div>
                          <div className="text-sm font-semibold text-white">
                            {t.settings.autoDmTitle}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {t.settings.autoDmDesc}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAutoSendDm(!autoSendDm)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                            autoSendDm ? "bg-cyan-500" : "bg-slate-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                              autoSendDm ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {autoSendDm && (
                        <div className="pl-4 border-l-2 border-cyan-500/40">
                          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            {t.settings.dmTemplateLabel}
                          </label>
                          <textarea
                            rows={3}
                            value={dmWelcomeText}
                            onChange={(e) => setDmWelcomeText(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 font-sans"
                          />
                        </div>
                      )}

                      <div className="pt-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={handleSaveBotSettings}
                          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-blue-500 hover:to-cyan-500 transition"
                        >
                          <span>💾</span>
                          <span>
                            {lang === "km"
                              ? `រក្សាទុកការកំណត់សម្រាប់ ${
                                  selectedBotPageId === "default"
                                    ? "ទូទៅ (Global)"
                                    : managedPages.find((p) => p.id === selectedBotPageId)?.name || "Page"
                                }`
                              : t.settings.saveBtn}
                          </span>
                        </button>

                        {savedSuccess && (
                          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{t.savedSuccess}</span>
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* SUPER ADMIN AI TRAINING & KNOWLEDGE HUB */}
              {isAdmin && (
                <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/20 via-slate-900/40 to-slate-900/60 p-6 shadow-xl backdrop-blur-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-purple-500/20">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white">
                            🧠 មជ្ឈមណ្ឌលបង្រៀន AI & ឃ្លាំងចំណេះដឹង (AI Training Hub)
                          </h3>
                          <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-extrabold text-purple-300 border border-purple-500/30">
                            Super Admin Only
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          បង្រៀនចរិតលក្ខណៈ ព័ត៌មានផលិតផល និងបម្រាមដល់ AI។ ទិន្នន័យនេះត្រូវបានចងចាំក្នុង Supabase Database ជារៀងរហូត។
                        </p>
                      </div>
                    </div>

                    {/* Master Switch on big card */}
                    <div className="flex items-center gap-3 bg-slate-950/60 p-2.5 rounded-xl border border-purple-500/20">
                      <div>
                        <div className="text-xs font-bold text-white">
                          Master Bot Switch
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {masterBotEnabled ? "🟢 កំពុងដំណើរការ" : "🔴 ផ្អាកបណ្ដោះអាសន្ន (Learning)"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMasterBotEnabled(!masterBotEnabled)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                          masterBotEnabled ? "bg-emerald-500" : "bg-slate-700"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ${
                            masterBotEnabled ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {/* Persona & Tone */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-purple-200">
                          🎭 ១. ចរិតលក្ខណៈ & របៀបនិយាយ (Persona & Tone of Voice)
                        </label>
                        <span className="text-[11px] text-slate-400">ដូចមនុស្សពិត ផ្អែមល្ហែម ខ្លីខ្លឹម</span>
                      </div>
                      <textarea
                        rows={3}
                        value={aiPersona}
                        onChange={(e) => setAiPersona(e.target.value)}
                        placeholder="ឧ. ដើរតួជាអ្នកលក់ស្រីវ័យក្មេង សម្តីផ្អែមល្ហែម រួសរាយ រាក់ទាក់ ប្រើពាក្យ 'ចាសបង', 'អូន', 'បងសម្លាញ់' ជានិច្ច។ ហាមឆ្លើយវែងអន្លាយ ឆ្លើយខ្លីៗ (១ ទៅ ២ ឃ្លា) ចំសំណួរ..."
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-400 font-sans"
                      />
                    </div>

                    {/* Knowledge Base */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-purple-200">
                          📚 ២. ឃ្លាំងចំណេះដឹង & ផលិតផល (Knowledge Base & Memory)
                        </label>
                        <span className="text-[11px] text-purple-400 font-medium">ចងចាំរាប់ពាន់ពាក្យ</span>
                      </div>
                      <textarea
                        rows={7}
                        value={aiKnowledgeBase}
                        onChange={(e) => setAiKnowledgeBase(e.target.value)}
                        placeholder="ឧ. ព័ត៌មានលម្អិតផលិតផល ឃីដនីប្រូ, អេមមី, តម្លៃ, គុណប្រយោជន៍, របៀបប្រើប្រាស់, ប្រូម៉ូសិន..."
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-400 font-sans leading-relaxed"
                      />
                    </div>

                    {/* Strict Rules */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-purple-200">
                          ⛔ ៣. ច្បាប់ & បម្រាមពិសេស (Strict Rules & FAQs)
                        </label>
                        <span className="text-[11px] text-slate-400">ការពារការឆ្លើយខុសគោលការណ៍</span>
                      </div>
                      <textarea
                        rows={3}
                        value={aiRules}
                        onChange={(e) => setAiRules(e.target.value)}
                        placeholder="ឧ. ហាមប្រាប់តម្លៃផលិតផលនៅលើ Comment ហាមដាច់ខាត! ត្រូវឆ្លើយតបបែបផ្អែមល្ហែម និងទាក់ទាញ ហើយប្រាប់ឱ្យភ្ញៀវឆែកមើលប្រអប់សារ Inbox..."
                        className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-400 font-sans"
                      />
                    </div>

                    {/* Save Button */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleSaveAiKnowledge}
                        disabled={isSavingKnowledge}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition disabled:opacity-50"
                      >
                        <span>💾</span>
                        <span>{isSavingKnowledge ? "កំពុងរក្សាទុក..." : "រក្សាទុកចំណេះដឹង AI (Save Knowledge)"}</span>
                      </button>

                      {knowledgeSavedSuccess && (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>ចំណេះដឹងត្រូវបានចងចាំក្នុង Supabase Database រួចរាល់!</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAGES */}
          {activeTab === "pages" && (
            <div className="max-w-5xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#223047] bg-[#111827] p-5 shadow-xs">
                <div>
                  <h3 className="text-base font-bold text-[#F8FAFC]">
                    {t.pagesTab.title}
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {t.pagesTab.subtitle}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => setIsConnectFbModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-[#38BDF8] hover:bg-[#0EA5E9] px-4 py-2.5 text-xs font-semibold text-[#080D17] shadow-xs transition"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{lang === "km" ? "🔗 ភ្ជាប់ Facebook Admin Page" : "🔗 Connect FB Admin Page"}</span>
                  </button>
                  <button
                    onClick={handleFacebookLogin}
                    disabled={isFbConnecting}
                    className="flex items-center gap-2 rounded-xl bg-[#162033] border border-[#223047] px-4 py-2.5 text-xs font-semibold text-[#F8FAFC] hover:border-[#38BDF8] hover:text-[#38BDF8] shadow-xs transition disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isFbConnecting ? "animate-spin text-[#38BDF8]" : ""}`} />
                    <span>
                      {isFbConnecting
                        ? lang === "km"
                          ? "កំពុង Sync..."
                          : "Syncing..."
                        : lang === "km"
                        ? "Sync តាម FB Login"
                        : "Sync via FB Login"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Super Admin Owner Filter */}
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#223047] bg-[#111827] p-3 shadow-xs">
                  <span className="text-xs text-[#94A3B8] font-medium pl-1">
                    {lang === "km" ? "តម្រៀបតាមម្ចាស់៖" : "Filter by Owner:"}
                  </span>
                  <button
                    onClick={() => setPageOwnerFilter("all")}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      pageOwnerFilter === "all"
                        ? "bg-[#38BDF8] text-[#080D17] shadow-xs"
                        : "bg-[#162033] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#223047]"
                    }`}
                  >
                    {lang === "km" ? "ទាំងអស់" : "All"} ({managedPages.length})
                  </button>
                  <button
                    onClick={() => setPageOwnerFilter("admin")}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      pageOwnerFilter === "admin"
                        ? "bg-[#38BDF8] text-[#080D17] shadow-xs"
                        : "bg-[#162033] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#223047]"
                    }`}
                  >
                    👑 Super Admin
                  </button>
                  {Array.from(
                    new Set(
                      managedPages
                        .map((p) => p.ownerName)
                        .filter(
                          (name) => name && !name.toLowerCase().includes("admin")
                        )
                    )
                  ).map((ownerName) => (
                    <button
                      key={ownerName}
                      onClick={() => setPageOwnerFilter(ownerName!)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        pageOwnerFilter === ownerName
                          ? "bg-[#38BDF8] text-[#080D17] shadow-xs"
                          : "bg-[#162033] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#223047]"
                      }`}
                    >
                      👤 {ownerName}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayedPages.length === 0 ? (
                  <div className="col-span-full py-16 text-center rounded-2xl border border-dashed border-[#223047] bg-[#111827]/60 p-8">
                    <FileText className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-[#F8FAFC]">
                      {lang === "km" ? "មិនទាន់មាន Facebook Page នៅឡើយទេ" : "No Facebook Pages Connected"}
                    </h4>
                    <p className="text-xs text-[#94A3B8] mt-1.5 max-w-md mx-auto leading-relaxed">
                      {isAdmin
                        ? lang === "km"
                          ? "មិនមាន Page ណាមួយត្រូវនឹងការស្វែងរកនេះទេ។"
                          : "No pages match the selected filter."
                        : lang === "km"
                        ? "គណនីរបស់អ្នកមិនទាន់មាន Facebook Page ទេ។ សូមចុចប៊ូតុងខាងលើ «🔗 ភ្ជាប់ Facebook Admin Page» ដើម្បីភ្ជាប់ Page របស់អ្នក និងចាប់ផ្តើមប្រើ Bot!"
                        : "You haven't connected any Facebook Pages yet. Click 'Connect Facebook Admin Page' above to link your page!"}
                    </p>
                    {!isAdmin && (
                      <div className="mt-4 flex items-center justify-center gap-3">
                        <button
                          onClick={() => setIsConnectFbModalOpen(true)}
                          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:from-cyan-400 hover:to-blue-500 transition"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{lang === "km" ? "🔗 ភ្ជាប់ Facebook Page ឥឡូវនេះ" : "Connect Facebook Page"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  displayedPages.map((page, i) => (
                  <div
                    key={page.id || i}
                    className="rounded-2xl border border-[#223047] bg-[#111827] p-5 flex flex-col justify-between transition hover:border-[#334155] hover:bg-[#162033] shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold border flex items-center gap-1 ${
                            page.disabledByAdmin && !isAdmin
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : page.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-slate-700/30 text-slate-400 border-slate-700/40"
                          }`}
                        >
                          {page.disabledByAdmin && !isAdmin
                            ? lang === "km"
                              ? "🔒 ផ្អាកដោយ Admin"
                              : "🔒 Locked by Admin"
                            : page.isActive
                            ? lang === "km"
                              ? "● ដំណើរការ"
                              : "● Active"
                            : lang === "km"
                              ? "○ បានផ្អាក"
                              : "○ Paused"}
                        </span>
                        <span className="text-[11px] text-[#94A3B8] font-mono">
                          ID: {page.id}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        {page.picture ? (
                          <img
                            src={page.picture}
                            alt={page.name}
                            className="h-10 w-10 rounded-xl object-cover border border-[#223047]"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#38BDF8] to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                            {page.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-[#F8FAFC] text-sm">
                            {page.name}
                          </h4>
                          <p className="text-[11px] text-[#94A3B8] mt-0.5">
                            {page.category || "Facebook Page"}
                          </p>
                          {isAdmin && page.ownerName && (
                            <span className="inline-flex items-center gap-1 rounded bg-[#080D17] px-2 py-0.5 text-[10px] text-[#38BDF8] border border-[#223047] mt-1.5 font-medium">
                              <span>{page.ownerName.toLowerCase().includes("admin") ? "👑" : "👤"}</span>
                              <span>{page.ownerName}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-[#223047] flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#94A3B8]">Bot:</span>
                        <button
                          type="button"
                          disabled={!isAdmin && page.disabledByAdmin}
                          onClick={() => handleTogglePage(page.id, page.isActive, page.disabledByAdmin)}
                          className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                            !isAdmin && page.disabledByAdmin
                              ? "opacity-50 cursor-not-allowed bg-slate-800"
                              : "cursor-pointer " + (page.isActive ? "bg-[#38BDF8]" : "bg-slate-700")
                          }`}
                          title={
                            !isAdmin && page.disabledByAdmin
                              ? lang === "km"
                                ? "ផ្អាកដោយ Super Admin"
                                : "Disabled by Admin"
                              : ""
                          }
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                              page.isActive && (!page.disabledByAdmin || isAdmin)
                                ? "translate-x-4"
                                : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span
                          className={`text-xs font-bold ${
                            !isAdmin && page.disabledByAdmin
                              ? "text-rose-400"
                              : page.isActive
                              ? "text-[#38BDF8]"
                              : "text-slate-500"
                          }`}
                        >
                          {!isAdmin && page.disabledByAdmin
                            ? "LOCKED"
                            : page.isActive
                            ? "ON"
                            : "OFF"}
                        </span>
                      </div>

                      {/* 4. Per-Page AI Bot Button (AI Bot vs Template) */}
                      <button
                        type="button"
                        onClick={() => handleTogglePageAi(page.id, !!page.aiReplyEnabled)}
                        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold border transition ${
                          page.aiReplyEnabled
                            ? "bg-gradient-to-r from-purple-600/30 to-indigo-600/30 text-purple-300 border-purple-500/40 shadow-sm"
                            : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
                        }`}
                        title={page.aiReplyEnabled ? "ឆ្លើយដោយ AI Gemini ឆ្លាតវៃ" : "ឆ្លើយតាម Template ស្រាប់"}
                      >
                        <span>{page.aiReplyEnabled ? "🤖 AI Bot (ឆ្លាតវៃ)" : "📝 Template ស្រាប់"}</span>
                      </button>

                      <a
                        href={`https://facebook.com/${page.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        <span>{lang === "km" ? "មើលលើ Facebook" : "View Facebook"}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))
              )}
              </div>

              {/* 5. Connect Facebook Admin Page Modal */}
              {isConnectFbModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
                  <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-[#091322] p-6 shadow-2xl space-y-5">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md">
                          <Plus className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{lang === "km" ? "🔗 ភ្ជាប់ Facebook Page" : "Connect Facebook Page"}</span>
                            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-500/30">
                              1-Click Instant
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {lang === "km"
                              ? "ចុចភ្ជាប់ Page របស់ក្រុមហ៊ុនភ្លាមៗ មិនបាច់ត្រូវការ Facebook Login ឬ Add Tester ឡើយ!"
                              : "Pick a company page to connect in 1 click without needing Facebook OAuth!"}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsConnectFbModalOpen(false)}
                        className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Method 1: One-Click Company Page Picker (ADMIN ONLY) */}
                    {isAdmin && (
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                            <span>⚡</span>
                            <span>{lang === "km" ? "ជម្រើសទី ១ (Admin) ៖ ចុចភ្ជាប់ Page របស់ក្រុមហ៊ុន" : "Method 1 (Admin): One-Click Company Page Picker"}</span>
                          </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {COMPANY_PAGES.length} {lang === "km" ? "ផេកផ្លូវការ" : "Official Pages"}
                        </span>
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {COMPANY_PAGES.map((cp) => {
                          const isAlreadyConnected = managedPages.some((mp) => mp.id === cp.id);
                          const isConnectingThis = isConnectingOneClick === cp.id;

                          return (
                            <div
                              key={cp.id}
                              className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                                isAlreadyConnected
                                  ? "border-emerald-500/30 bg-emerald-950/20"
                                  : "border-slate-800/80 bg-slate-900/60 hover:border-cyan-500/40 hover:bg-slate-850"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0">
                                  {cp.name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-semibold text-xs text-white flex items-center gap-2">
                                    <span>{cp.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-400">
                                      {cp.category}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      ID: {cp.id}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                {isAlreadyConnected ? (
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                                      <span>✓</span>
                                      <span>{lang === "km" ? "ភ្ជាប់រួចហើយ" : "Connected"}</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleDisconnectPage(cp.id, cp.name)}
                                      className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline px-1 py-1"
                                      title="ផ្ដាច់ចេញពីគណនីនេះ"
                                    >
                                      {lang === "km" ? "ផ្ដាច់" : "Unlink"}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={Boolean(isConnectingOneClick)}
                                    onClick={() => handleOneClickConnectPage(cp)}
                                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50 active:scale-95"
                                  >
                                    {isConnectingThis ? (
                                      <>
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                        <span>{lang === "km" ? "កំពុងភ្ជាប់..." : "Connecting..."}</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>⚡</span>
                                        <span>{lang === "km" ? "ចុចភ្ជាប់" : "Connect"}</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    )}

                    {isAdmin && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-800" />
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                          {lang === "km" ? "ឬ ភ្ជាប់ Page ថ្មីផ្សេងទៀត (Manual)" : "OR ADD CUSTOM PAGE"}
                        </span>
                        <div className="flex-1 h-px bg-slate-800" />
                      </div>
                    )}

                    {/* Method 2: Manual Page Input */}
                    <div>
                      {!isAdmin && (
                        <div className="mb-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/30 p-3.5 text-xs text-cyan-200">
                          <p className="font-bold flex items-center gap-1.5 text-white mb-1">
                            <span>📄</span>
                            <span>{lang === "km" ? "ភ្ជាប់ Page ផ្ទាល់ខ្លួនរបស់អ្នក" : "Connect Your Own Page"}</span>
                          </p>
                          <p className="text-[11px] text-slate-300 leading-relaxed">
                            {lang === "km"
                              ? "សូមបំពេញឈ្មោះ Page និងលេខសម្គាល់ Page ID ឬ Link ផេករបស់អ្នកខាងក្រោម រួចចុច 'រក្សាទុក Page' ដើម្បីយកមកប្រើប្រាស់លើផ្ទាំង Dashboard និងការផុសវីដេអូ/Story។"
                              : "Enter your page name and page ID/link below to connect it directly to your tester account."}
                          </p>
                        </div>
                      )}
                      <form onSubmit={handleSaveManualPage} className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {lang === "km" ? "ឈ្មោះផេក (Page Name) *" : "Page Name *"}
                        </label>
                        <input
                          type="text"
                          required
                          value={manualFbPageName}
                          onChange={(e) => setManualFbPageName(e.target.value)}
                          placeholder="ឧ. VST Official Store"
                          className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          {lang === "km" ? "Facebook Page ID ឬ Link ផេក *" : "Facebook Page ID or Page Link *"}
                        </label>
                        <input
                          type="text"
                          required
                          value={manualFbPageId}
                          onChange={(e) => setManualFbPageId(e.target.value)}
                          placeholder="ឧ. 109283746501928 ឬ https://facebook.com/myPage"
                          className="w-full rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setIsConnectFbModalOpen(false)}
                          className="rounded-xl px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 transition"
                        >
                          {lang === "km" ? "បោះបង់" : "Cancel"}
                        </button>
                        <button
                          type="submit"
                          disabled={isConnectingManualPage}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-cyan-500 hover:to-blue-500 transition disabled:opacity-50"
                        >
                          {isConnectingManualPage ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              <span>{lang === "km" ? "កំពុងភ្ជាប់..." : "Connecting..."}</span>
                            </>
                          ) : (
                            <span>{lang === "km" ? "រក្សាទុក Page" : "Save Page"}</span>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ADMIN MANAGEMENT (LIVE MEMBERS & FB USERS) */}
          {activeTab === "admin" && (
            <div className="space-y-6 max-w-6xl">
              {/* Header Banner */}
              <div className="rounded-2xl border border-[#223047] bg-[#111827] p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#223047]">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-amber-400/10 border border-amber-400/20 p-2.5 text-amber-400">
                        <Shield className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-[#F8FAFC] tracking-tight">
                          {t.adminTab.title}
                        </h3>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                          {t.adminTab.subtitle}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={fetchMembers}
                      disabled={isLoadingMembers}
                      className="flex items-center gap-2 rounded-xl border border-[#223047] bg-[#162033] px-4 py-2.5 text-xs font-medium text-[#F8FAFC] hover:border-[#38BDF8] hover:text-[#38BDF8] transition"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoadingMembers ? "animate-spin text-[#38BDF8]" : ""}`} />
                      <span>{isLoadingMembers ? t.saving : t.adminTab.refreshBtn}</span>
                    </button>
                  </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5">
                  <div className="rounded-xl border border-[#223047] bg-[#0B1220] p-4">
                    <span className="text-[11px] font-medium text-[#94A3B8]">
                      {t.adminTab.totalMembers}
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#F8FAFC]">
                        {membersList.length}
                      </span>
                      <span className="text-[10px] text-emerald-400">Accounts</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#223047] bg-[#0B1220] p-4">
                    <span className="text-[11px] font-medium text-[#94A3B8]">
                      {t.adminTab.totalPages}
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-[#38BDF8]">
                        {managedPages.length}
                      </span>
                      <span className="text-[10px] text-[#38BDF8]">Pages Live</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#223047] bg-[#0B1220] p-4">
                    <span className="text-[11px] font-medium text-[#94A3B8]">
                      {lang === "km" ? "គណនីកំពុងដំណើរការ" : "Active Sessions"}
                    </span>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-emerald-400">
                        {membersList.filter((m) => m.status === "Active").length || 1}
                      </span>
                      <span className="text-[10px] text-emerald-300">Online</span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#223047] bg-[#0B1220] p-4">
                    <span className="text-[11px] font-medium text-[#94A3B8]">
                      {t.adminTab.systemHealth}
                    </span>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      <span className="text-xs font-bold text-emerald-400">100% Operational</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* GLOBAL MEMBERS BOT ACCESS SWITCH (TRAINING & LEARNING PHASE) */}
              <div className="rounded-2xl border border-amber-500/30 bg-[#111827] p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 font-bold">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-[#F8FAFC]">
                          🔒 សិទ្ធិប្រើប្រាស់ Bot របស់ Member ទាំងអស់ (All Members Bot Access)
                        </h4>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            membersGlobalEnabled
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {membersGlobalEnabled
                            ? "🟢 បើកឱ្យ Member ប្រើ"
                            : "🔴 បិទមិនឱ្យ Member ប្រើ (Learning Mode)"}
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-1 max-w-2xl leading-relaxed">
                        {membersGlobalEnabled
                          ? "សមាជិក (Members) ទាំងអស់អាចបើក Bot លើ Page របស់ពួកគាត់ និងប្រើ Bot Support បានធម្មតា។"
                          : "សមាជិកទាំងអស់ (Members) ត្រូវបានចាក់សោ មិនអាចប្រើ Bot បានឡើយ (ទាំងលើ Page និង Support Bot)។ ប៉ុន្តែ Super Admin នៅតែអាចប្រើ និងបង្រៀន Bot បានធម្មតា!"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleToggleMembersGlobalBot}
                      disabled={isTogglingGlobalMemberBot}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-xs ${
                        membersGlobalEnabled
                          ? "bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40"
                          : "bg-[#22C55E] hover:bg-emerald-600 text-[#080D17]"
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>
                        {isTogglingGlobalMemberBot
                          ? "កំពុងកំណត់..."
                          : membersGlobalEnabled
                          ? "ចុចដើម្បី បិទមិនឱ្យ Member ប្រើ"
                          : "ចុចដើម្បី បើកឱ្យ Member ប្រើ"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Members Table Card */}
              <div className="rounded-2xl border border-[#223047] bg-[#111827] p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#223047] gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
                    <input
                      type="text"
                      value={membersSearchQuery}
                      onChange={(e) => setMembersSearchQuery(e.target.value)}
                      placeholder={t.adminTab.searchPlaceholder}
                      className="w-full rounded-xl border border-[#223047] bg-[#080D17] pl-10 pr-4 py-2 text-xs text-[#F8FAFC] placeholder-slate-500 outline-none focus:border-[#38BDF8] transition"
                    />
                  </div>

                  <span className="text-xs text-[#94A3B8]">
                    {lang === "km" ? "បង្ហាញទិន្នន័យជាក់ស្តែងពី Supabase" : "Live data synced from Supabase"}
                  </span>
                </div>

                {isLoadingMembers ? (
                  <div className="py-16 text-center text-[#94A3B8] text-xs">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#38BDF8]" />
                    <span>{t.saving}</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-2">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#0B1220] text-[#94A3B8] uppercase text-[10px]">
                        <tr>
                          <th className="p-3.5">{t.adminTab.colMember}</th>
                          <th className="p-3.5">{t.adminTab.colRole}</th>
                          <th className="p-3.5">{t.adminTab.colPages}</th>
                          <th className="p-3.5">{t.adminTab.colLastLogin}</th>
                          <th className="p-3.5">{t.adminTab.colStatus}</th>
                          <th className="p-3.5">{t.adminTab.colBotControl}</th>
                          <th className="p-3.5 text-right">{t.adminTab.colActions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {membersList
                          .filter((m) => {
                            if (!membersSearchQuery.trim()) return true;
                            const query = membersSearchQuery.toLowerCase();
                            return (
                              m.name?.toLowerCase().includes(query) ||
                              m.email?.toLowerCase().includes(query) ||
                              m.loginType?.toLowerCase().includes(query)
                            );
                          })
                          .map((m, idx) => (
                            <tr key={m.id || idx} className="hover:bg-slate-800/40 transition">
                              <td className="p-3.5">
                                <div className="flex items-center gap-3">
                                  {m.picture ? (
                                    <div className="relative h-9 w-9 overflow-hidden rounded-full border border-cyan-500/30">
                                      <Image
                                        src={m.picture}
                                        alt={m.name || "Member"}
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                                      {m.name ? m.name.charAt(0).toUpperCase() : "M"}
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-semibold text-white flex items-center gap-2">
                                      <span>{m.name}</span>
                                      {m.role?.includes("Owner") && (
                                        <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20">
                                          OWNER
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-slate-400 font-mono">
                                      {m.email || (m.id ? `ID: ${m.id}` : "Connected User")}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3.5">
                                <span
                                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border ${
                                    m.loginType?.includes("Facebook")
                                      ? "bg-blue-500/10 text-blue-300 border-blue-500/20"
                                      : "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                                  }`}
                                >
                                  {m.loginType || "Facebook OAuth"}
                                </span>
                              </td>

                              <td className="p-3.5">
                                <div className="flex flex-col gap-1">
                                  <span className="font-semibold text-cyan-400">
                                    {typeof m.pagesCount === "number" ? m.pagesCount : (m.pages ? m.pages.length : 0)}{" "}
                                    {lang === "km" ? "ផេក" : "Pages"}
                                  </span>
                                  {m.pages && Array.isArray(m.pages) && (
                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                      {m.pages.slice(0, 3).map((p: any, pIdx: number) => (
                                        <span
                                          key={pIdx}
                                          className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300"
                                        >
                                          {typeof p === "string" ? p : p.name}
                                        </span>
                                      ))}
                                      {m.pages.length > 3 && (
                                        <span className="text-[10px] text-slate-500">
                                          +{m.pages.length - 3} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td className="p-3.5 text-slate-400 text-[11px]">
                                {m.lastLogin
                                  ? new Date(m.lastLogin).toLocaleDateString(
                                      lang === "km" ? "km-KH" : "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      }
                                    )
                                  : "Recently"}
                              </td>

                              <td className="p-3.5">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border ${
                                    m.botEnabled !== false && m.status !== "Disabled"
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      m.botEnabled !== false && m.status !== "Disabled"
                                        ? "bg-emerald-400 animate-pulse"
                                        : "bg-rose-400"
                                    }`}
                                  />
                                  <span>{m.status || "Active"}</span>
                                </span>
                              </td>

                              <td className="p-3.5">
                                {m.role?.includes("Owner") ? (
                                  <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                                    <Shield className="h-3.5 w-3.5" />
                                    <span>Master Control</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2.5">
                                    <button
                                      type="button"
                                      disabled={!isAdmin || togglingMemberId === (m.id || m.name)}
                                      onClick={() => handleToggleMemberBot(m)}
                                      className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                        m.botEnabled !== false && m.status !== "Disabled"
                                          ? "bg-emerald-500 shadow-md shadow-emerald-500/20"
                                          : "bg-slate-700"
                                      } ${
                                        !isAdmin || togglingMemberId === (m.id || m.name)
                                          ? "opacity-50 cursor-not-allowed"
                                          : ""
                                      }`}
                                      title={
                                        isAdmin
                                          ? m.botEnabled !== false && m.status !== "Disabled"
                                            ? "ចុចដើម្បីបិទ Bot របស់ Member នេះ"
                                            : "ចុចដើម្បីបើក Bot របស់ Member នេះ"
                                          : "មានតែ Super Admin ទើបអាចបិទបើកបាន"
                                      }
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                          m.botEnabled !== false && m.status !== "Disabled"
                                            ? "translate-x-5"
                                            : "translate-x-0"
                                        }`}
                                      />
                                    </button>
                                    <span
                                      className={`text-xs font-bold ${
                                        m.botEnabled !== false && m.status !== "Disabled"
                                          ? "text-emerald-400"
                                          : "text-rose-400"
                                      }`}
                                    >
                                      {m.botEnabled !== false && m.status !== "Disabled"
                                        ? "Bot ON"
                                        : "Bot OFF 🔒"}
                                    </span>
                                  </div>
                                )}
                              </td>

                              <td className="p-3.5 text-right">
                                <button
                                  onClick={() => {
                                    setPageOwnerFilter(m.name || "all");
                                    setActiveTab("pages");
                                  }}
                                  className="text-xs font-medium text-cyan-400 hover:text-cyan-300 hover:underline"
                                >
                                  {lang === "km" ? "មើល Pages" : "View Pages"} →
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: VST SUPPORT CHAT (FULL WIDTH) */}
          {activeTab === "ai_console" && (
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* Header Banner */}
              <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-[#071328] to-[#030915] p-6 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-cyan-500/20">
                      <Bot className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-lg font-bold text-white tracking-tight">
                          💬 {lang === "km" ? "ជំនួយការ VST Support Chat" : "VST Support Chat Assistant"}
                        </h3>
                        <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400 border border-cyan-500/30">
                          {isAdmin ? "Super Admin Full Access" : "Support Assistant"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {lang === "km"
                          ? "ផ្ទាំងជំនួយការ AI ពេញលេញ — សួរបញ្ជា Bot រក្សាប្រវត្តិសន្ទនា (Chat Sessions) និង Upload ឯកសារក្នុងឆាតភ្លាមៗ"
                          : "Full AI Support Chat — Ask questions, manage chat sessions, and upload reference documents directly in chat"}
                      </p>
                    </div>
                  </div>

                  {/* Header Actions */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* New Chat Button */}
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-cyan-500/20 hover:from-blue-500 hover:to-cyan-400 transition"
                      title="ចាប់ផ្តើមការសន្ទនាថ្មី (New Chat)"
                    >
                      <PlusCircle className="h-4 w-4" />
                      <span>{lang === "km" ? "➕ New Chat" : "➕ New Chat"}</span>
                    </button>

                    {/* Sessions History Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSessionsOpen(!isSessionsOpen);
                        if (isDocsOpen) setIsDocsOpen(false);
                      }}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                        isSessionsOpen
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                          : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700"
                      }`}
                      title="មើលប្រវត្តិសន្ទនាពីមុន"
                    >
                      <History className="h-4 w-4 text-cyan-400" />
                      <span>{lang === "km" ? `ប្រវត្តិ (${chatSessions.length})` : `History (${chatSessions.length})`}</span>
                    </button>

                    {/* Attached Knowledge Documents Toggle */}
                    {aiDocuments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsDocsOpen(!isDocsOpen);
                          if (isSessionsOpen) setIsSessionsOpen(false);
                        }}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                          isDocsOpen
                            ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                            : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700"
                        }`}
                        title="មើលឯកសារដែល Bot បានចងចាំ"
                      >
                        <Paperclip className="h-4 w-4 text-purple-400" />
                        <span>{lang === "km" ? `ឯកសារ (${aiDocuments.length})` : `Docs (${aiDocuments.length})`}</span>
                      </button>
                    )}

                    {/* Master Bot Status */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
                      <span className={`h-2.5 w-2.5 rounded-full ${masterBotEnabled ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                      <span className="text-slate-300 font-medium">
                        {masterBotEnabled ? "Bot Online" : "Bot Paused"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Chat Box (Full Width) */}
                <div className="pt-5">
                  <div className="flex flex-col h-[620px] rounded-2xl border border-slate-800/80 bg-slate-950/70 overflow-hidden relative">
                    
                    {/* Collapsible Chat Sessions Drawer */}
                    {isSessionsOpen && (
                      <div className="absolute inset-y-0 left-0 z-20 w-80 bg-slate-900/95 border-r border-slate-800 p-4 flex flex-col shadow-2xl backdrop-blur-md">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2 text-xs font-bold text-white">
                            <History className="h-4 w-4 text-cyan-400" />
                            <span>{lang === "km" ? "ប្រវត្តិសន្ទនា (Chat Sessions)" : "Chat Sessions"}</span>
                          </div>
                          <button
                            onClick={() => setIsSessionsOpen(false)}
                            className="text-slate-400 hover:text-white text-xs"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto py-2 space-y-1.5">
                          {chatSessions.map((session) => (
                            <div
                              key={session.id}
                              onClick={() => handleSelectSession(session.id)}
                              className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-xs cursor-pointer transition ${
                                session.id === currentSessionId
                                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                  : "text-slate-300 hover:bg-slate-800/60"
                              }`}
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="font-medium truncate">{session.title}</div>
                                <div className="text-[10px] text-slate-500">{session.createdAt} • {session.messages?.length || 0} សារ</div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSession(session.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition"
                                title="លុបការសន្ទនានេះ"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="pt-3 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={handleNewChat}
                            className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 py-2 text-xs font-bold text-white shadow-md transition"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            <span>{lang === "km" ? "បង្កើត Chat ថ្មី" : "New Chat"}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Collapsible Documents Knowledge Drawer */}
                    {isDocsOpen && (
                      <div className="absolute inset-y-0 right-0 z-20 w-80 bg-slate-900/95 border-l border-slate-800 p-4 flex flex-col shadow-2xl backdrop-blur-md">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2 text-xs font-bold text-white">
                            <Paperclip className="h-4 w-4 text-purple-400" />
                            <span>{lang === "km" ? "ឯកសារដែល Bot បានចងចាំ" : "Bot Knowledge Docs"}</span>
                          </div>
                          <button
                            onClick={() => setIsDocsOpen(false)}
                            className="text-slate-400 hover:text-white text-xs"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto py-2 space-y-2">
                          {aiDocuments.length === 0 ? (
                            <div className="py-8 text-center text-xs text-slate-500">
                              មិនទាន់មានឯកសារនៅឡើយ
                            </div>
                          ) : (
                            aiDocuments.map((doc) => (
                              <div
                                key={doc.id}
                                className="flex items-center justify-between rounded-xl bg-slate-800/80 p-2.5 text-xs border border-slate-700/60"
                              >
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="font-semibold text-white truncate flex items-center gap-1.5">
                                    <span>📄</span>
                                    <span className="truncate">{doc.name}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {Math.round(doc.size / 1024)} KB • {doc.uploadedAt}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDoc(doc.id)}
                                  className="text-slate-500 hover:text-rose-400 p-1"
                                  title="លុបឯកសារនេះ"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {isAdmin && (
                          <div className="pt-3 border-t border-slate-800">
                            <label className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 py-2 text-xs font-bold text-white cursor-pointer shadow-md transition">
                              <Paperclip className="h-3.5 w-3.5" />
                              <span>{lang === "km" ? "Upload ឯកសារបន្ថែម" : "Upload More Docs"}</span>
                              <input
                                type="file"
                                accept=".txt,.csv,.json,.pdf,.doc,.docx"
                                onChange={handleFileUpload}
                                disabled={isUploadingDoc}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Chat Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                      {chatMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-3 ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {msg.from === "bot" && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-sm text-white shadow-md shadow-cyan-500/20 mt-0.5">
                              🤖
                            </div>
                          )}

                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-line text-xs shadow-sm ${
                              msg.from === "user"
                                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-none shadow-blue-500/20"
                                : "bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-none"
                            }`}
                          >
                            <div className="text-[10px] font-bold opacity-60 mb-1">
                              {msg.from === "user" ? (currentUser.name || "Super Admin") : "VST Support AI"}
                            </div>
                            {msg.text}
                          </div>

                          {msg.from === "user" && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20 mt-0.5">
                              👑
                            </div>
                          )}
                        </div>
                      ))}

                      {isChatLoading && (
                        <div className="flex items-start gap-3 justify-start">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-sm text-white shadow-md animate-pulse">
                            🤖
                          </div>
                          <div className="rounded-2xl rounded-tl-none bg-slate-800/90 border border-slate-700/80 px-4 py-3 text-xs text-cyan-300 flex items-center gap-2">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                            <span>VST Bot កំពុងគិត និងស្វែងរកចម្លើយជូនបង...</span>
                          </div>
                        </div>
                      )}
                      <div ref={adminChatBottomRef} />
                    </div>

                    {/* Uploading Status Banner */}
                    {isUploadingDoc && (
                      <div className="px-4 py-2 bg-cyan-950/60 border-t border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-2 animate-pulse">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                        <span>{lang === "km" ? "កំពុងអាន និងចងចាំឯកសារចូលទៅក្នុង Bot..." : "Reading and learning document into Bot..."}</span>
                      </div>
                    )}

                    {/* Chat Input Bar with Direct File Upload */}
                    <div className="border-t border-slate-800 p-3 bg-slate-900/90 flex items-center gap-2">
                      {/* Direct Upload button in Chat */}
                      {isAdmin && (
                        <label
                          className="cursor-pointer p-2.5 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition flex items-center justify-center shrink-0 shadow-sm"
                          title="Upload ឯកសារចំណេះដឹង (PDF, DOCX, TXT, CSV) ឱ្យ Bot ចងចាំ"
                        >
                          <Paperclip className="h-4 w-4" />
                          <input
                            type="file"
                            accept=".txt,.csv,.json,.pdf,.doc,.docx"
                            onChange={handleFileUpload}
                            disabled={isUploadingDoc}
                            className="hidden"
                          />
                        </label>
                      )}

                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                        placeholder={
                          isAdmin
                            ? "សួរបញ្ជា Bot គ្រប់រឿងក្នុង Web App ឬចុច 📎 ខាងឆ្វេងដើម្បី Upload ឯកសារ..."
                            : "វាយសំណួររបស់អ្នកនៅទីនេះ..."
                        }
                        className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                      />

                      <button
                        type="button"
                        onClick={() => handleSendChat()}
                        disabled={isChatLoading || !chatInput.trim()}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/30 transition hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="h-4 w-4" />
                        <span className="hidden sm:inline">ផ្ញើ</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: AI TRAINING & MEMORY HUB (STANDALONE FULL PAGE FOR SUPER ADMIN) */}
          {activeTab === "ai_training" && (
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* Header Banner */}
              <div className="rounded-2xl border border-[#223047] bg-[#111827] p-6 shadow-xs">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#223047]">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-[#8B5CF6]">
                      <Brain className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-base font-bold text-[#F8FAFC] tracking-tight">
                          🧠 {lang === "km" ? "មជ្ឈមណ្ឌលបង្រៀន & កំណត់ចំណេះដឹង AI (Memory Hub)" : "AI Training & Knowledge Hub"}
                        </h3>
                        <span className="rounded-full bg-[#8B5CF6]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#8B5CF6] border border-[#8B5CF6]/20">
                          Supabase Synced
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8] mt-1">
                        {lang === "km"
                          ? "កំណត់អត្តចរិត AI (Persona), ឃ្លាំងចំណេះដឹងផលិតផល, ច្បាប់តឹងរ៉ឹង និងការបិទបើក Bot ទូទាំងប្រព័ន្ធ"
                          : "Configure AI persona, tone, product knowledge base, strict rules, and master bot toggle"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleSaveAiKnowledge}
                      disabled={isSavingKnowledge}
                      className="flex items-center gap-2 rounded-xl bg-[#8B5CF6] hover:bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>{isSavingKnowledge ? (lang === "km" ? "កំពុងរក្សាទុក..." : "Saving...") : (lang === "km" ? "រក្សាទុកចំណេះដឹង (Save)" : "Save Knowledge")}</span>
                    </button>
                  </div>
                </div>

                {/* Success Alert */}
                {knowledgeSavedSuccess && (
                  <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-center text-xs font-semibold text-emerald-400 flex items-center justify-center gap-2 animate-fade-in">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{lang === "km" ? "ចំណេះដឹង AI ត្រូវបានចងចាំក្នុង Supabase Database រួចរាល់!" : "AI knowledge saved to Supabase successfully!"}</span>
                  </div>
                )}

                {/* Training Settings Form Cards */}
                <div className="space-y-4 pt-5 text-xs">
                  {/* Master Bot Switch Card */}
                  <div className="rounded-xl border border-[#223047] bg-[#0B1220] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>⚡ ដំណើរការ Bot ទូទៅ (Master Bot Switch)</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {masterBotEnabled
                          ? "🟢 កំពុងដំណើរការធម្មតា — ឆ្លើយតប Comment & Support Chat តាម AI"
                          : "🔴 បានផ្អាកបណ្ដោះអាសន្ន — សម្រាប់ដំណាក់កាលរៀនសូត្រ (Bot នឹងមិនទាន់ឆ្លើយតបភ្ញៀវទេ)"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMasterBotEnabled(!masterBotEnabled)}
                      className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        masterBotEnabled ? "bg-emerald-500 shadow-md shadow-emerald-500/20" : "bg-slate-700"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          masterBotEnabled ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* 1. Persona Card */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                        <span>🎭 ១. តួនាទី & អត្តចរិត Bot (Persona & Tone)</span>
                      </label>
                      <span className="text-[10px] text-slate-400">កំណត់របៀបនិយាយ និងកម្រិតស្និទ្ធស្នាល</span>
                    </div>
                    <input
                      type="text"
                      value={aiPersona}
                      onChange={(e) => setAiPersona(e.target.value)}
                      placeholder="ឧ. ដើរតួជាអ្នកលក់ស្រីវ័យក្មេង សម្តីផ្អែមល្ហែម រួសរាយ ឆ្លាតវៃ ហាមឆ្លើយវែងៗ..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-400 transition"
                    />
                  </div>

                  {/* 2. Knowledge Base Card */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                        <span>📚 ២. ឃ្លាំងចំណេះដឹងផលិតផល (Knowledge Base & Memory)</span>
                      </label>
                      <span className="text-[10px] text-slate-400">ចងចាំក្នុង Bot គ្រប់ពេល</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      ព័ត៌មានលម្អិតផលិតផល គុណប្រយោជន៍ តម្លៃ និងប្រូម៉ូសិន ដែល AI នឹងយកទៅឆ្លើយតបភ្ញៀវ៖
                    </p>
                    <textarea
                      rows={6}
                      value={aiKnowledgeBase}
                      onChange={(e) => setAiKnowledgeBase(e.target.value)}
                      placeholder="ឧ. ផលិតផល A: តម្លៃ $25, គុណប្រយោជន៍ និងរបៀបប្រើប្រាស់...&#10;ផលិតផល B: តម្លៃ $18, គុណប្រយោជន៍ និងប្រូម៉ូសិនពិសេស..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-400 transition font-sans"
                    />
                  </div>

                  {/* 3. Strict Rules Card */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                        <span>⛔ ៣. ច្បាប់ & បម្រាមពិសេស (Strict Rules & FAQs)</span>
                      </label>
                      <span className="text-[10px] text-slate-400">ការពារការឆ្លើយខុស</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      បម្រាមដែល Bot ដាច់ខាតមិនត្រូវបំពាន (ឧ. ហាមប្រាប់តម្លៃលើ Comment ឱ្យទាញភ្ញៀវចូល Inbox)៖
                    </p>
                    <textarea
                      rows={4}
                      value={aiRules}
                      onChange={(e) => setAiRules(e.target.value)}
                      placeholder="ឧ. ហាមប្រាប់តម្លៃលើ Comment ជាដាច់ខាត! ត្រូវឆ្លើយតបបែបផ្អែមល្ហែម និងទាក់ទាញ ហើយប្រាប់ឱ្យភ្ញៀវឆែកមើល Inbox..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-400 transition font-sans"
                    />
                  </div>

                  {/* Action Save Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleSaveAiKnowledge}
                      disabled={isSavingKnowledge}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500 py-3 text-xs font-bold text-white shadow-xl shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>{isSavingKnowledge ? (lang === "km" ? "កំពុងរក្សាទុកក្នុង Supabase..." : "Saving...") : (lang === "km" ? "💾 រក្សាទុកចំណេះដឹង AI ទាំងអស់ (Save Memory)" : "💾 Save All AI Memory")}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CUSTOMERS CRM */}
          {activeTab === "customers" && (
            <div className="max-w-6xl space-y-6">
              <div className="rounded-2xl border border-[#223047] bg-[#111827] p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#223047] gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-[#F8FAFC]">
                        👥 {t.crm.title}
                      </h3>
                      <span className="rounded-full bg-[#38BDF8]/10 px-2.5 py-0.5 text-xs font-semibold text-[#38BDF8] border border-[#38BDF8]/20">
                        {customersList.length} {lang === "km" ? "នាក់" : "Leads"}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-1">
                      {t.crm.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={fetchCustomers}
                      disabled={isLoadingCustomers}
                      className="flex items-center gap-2 rounded-xl border border-[#223047] bg-[#162033] px-4 py-2 text-xs font-medium text-[#F8FAFC] hover:border-[#38BDF8] hover:text-[#38BDF8] transition"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoadingCustomers ? "animate-spin text-[#38BDF8]" : ""}`} />
                      <span>{isLoadingCustomers ? t.saving : t.crm.refreshBtn}</span>
                    </button>
                  </div>
                </div>

                {isLoadingCustomers ? (
                  <div className="py-12 text-center text-[#94A3B8] text-xs">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#38BDF8]" />
                    {t.crm.loading}
                  </div>
                ) : customersList.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-medium text-[#F8FAFC]">{t.crm.noData}</p>
                    <p className="text-xs text-[#94A3B8] mt-1 max-w-md mx-auto">
                      {lang === "km"
                        ? "នៅពេលមានអតិថិជន Comment លើ Page ប្រព័ន្ធ Bot នឹងកត់ត្រាឈ្មោះ និងព័ត៌មានរបស់ពួកគាត់ចូលក្នុងតារាងនេះដោយស្វ័យប្រវត្តិ!"
                        : "Whenever customers comment on your Facebook posts, the bot will automatically capture their profiles and display them here!"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-[#0B1220] text-[#94A3B8] uppercase text-[10px]">
                        <tr>
                          <th className="p-3.5">{t.crm.colName}</th>
                          <th className="p-3.5">{t.crm.colFbId}</th>
                          <th className="p-3.5">{t.crm.colComments}</th>
                          <th className="p-3.5">{t.crm.colStatus}</th>
                          <th className="p-3.5">{t.crm.colLastActivity}</th>
                          <th className="p-3.5 text-right">{t.crm.colActions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#223047]">
                        {customersList.map((c, i) => (
                          <tr key={c.id || i} className="hover:bg-[#162033] transition">
                            <td className="p-3.5 font-semibold text-[#F8FAFC] flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-[#38BDF8] to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                {c.name ? c.name.charAt(0).toUpperCase() : "U"}
                              </div>
                              <span>{c.name}</span>
                            </td>
                            <td className="p-3.5 font-mono text-[11px] text-[#94A3B8]">
                              {c.fb_user_id || "N/A"}
                            </td>
                            <td className="p-3.5">
                              <span className="rounded-md bg-[#162033] border border-[#223047] px-2 py-0.5 text-[#38BDF8] font-medium">
                                {c.total_comments || 1} {lang === "km" ? "ដង" : "times"}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                                {c.status === "new" ? t.crm.statusNew : c.status || "Lead"}
                              </span>
                            </td>
                            <td className="p-3.5 text-[#94A3B8] text-[11px]">
                              {c.last_activity_at
                                ? new Date(c.last_activity_at).toLocaleString(lang === "km" ? "km-KH" : "en-US")
                                : "Recent"}
                            </td>
                            <td className="p-3.5 text-right">
                              <a
                                href={c.source_page_id ? `https://m.me/${c.source_page_id}` : "https://m.me"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-xl bg-[#162033] hover:bg-[#223047] border border-[#223047] px-3 py-1.5 text-xs text-[#38BDF8] font-medium transition"
                              >
                                <MessageSquare className="h-3 w-3" />
                                <span>{t.crm.chatWithCustomer}</span>
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: INBOX */}
          {activeTab === "inbox" && (
            <div className="max-w-4xl space-y-6">
              <div className="rounded-2xl border border-[#223047] bg-[#111827] p-8 text-center shadow-xs">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#38BDF8]/10 border border-[#38BDF8]/20 text-[#38BDF8]">
                  <MessageSquare className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-[#F8FAFC]">ប្រអប់សារ Messenger (Inbox)</h3>
                <p className="text-xs text-[#94A3B8] mt-2 max-w-md mx-auto leading-relaxed">
                  អតិថិជនដែលចុច Link ពីការឆ្លើយតប Comment របស់ Bot នឹងចូលទៅកាន់ Messenger របស់ Page ដោយផ្ទាល់។ បងអាចគ្រប់គ្រង និងជជែកជាមួយភ្ញៀវតាមរយៈ Meta Business Suite ផ្លូវការ។
                </p>
                <div className="mt-6 flex justify-center gap-4">
                  <a
                    href="https://business.facebook.com/latest/inbox"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#38BDF8] hover:bg-[#0EA5E9] px-5 py-2.5 text-xs font-semibold text-[#080D17] shadow-xs transition"
                  >
                    <span>បើកប្រអប់សារ Meta Business Suite</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB: REPORTS */}
          {activeTab === "reports" && (
            <div className="max-w-6xl space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="rounded-2xl border border-[#223047] bg-[#111827] p-5 shadow-xs">
                  <div className="flex items-center justify-between text-[#94A3B8] text-xs font-medium">
                    <span>ចំនួនអតិថិជនសរុប (Leads)</span>
                    <Users className="h-4 w-4 text-[#38BDF8]" />
                  </div>
                  <div className="text-2xl font-bold text-[#F8FAFC] mt-2">{customersList.length} នាក់</div>
                  <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                    <TrendingUp className="h-3 w-3" />
                    <span>កត់ត្រាចូល Supabase Database</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#223047] bg-[#111827] p-5 shadow-xs">
                  <div className="flex items-center justify-between text-[#94A3B8] text-xs font-medium">
                    <span>ស្ថានភាព Bot</span>
                    <Bot className="h-4 w-4 text-[#38BDF8]" />
                  </div>
                  <div className="text-2xl font-bold text-[#F8FAFC] mt-2">
                    {botActive ? "ដំណើរការ (ON)" : "ផ្អាកបណ្ដោះអាសន្ន (OFF)"}
                  </div>
                  <div className="text-[11px] text-[#38BDF8] mt-1 font-medium">
                    គ្រប់គ្រងដោយ Master Kill Switch
                  </div>
                </div>

                <div className="rounded-2xl border border-[#223047] bg-[#111827] p-5 shadow-xs">
                  <div className="flex items-center justify-between text-[#94A3B8] text-xs font-medium">
                    <span>Page ដែលកំពុងភ្ជាប់</span>
                    <FileText className="h-4 w-4 text-[#38BDF8]" />
                  </div>
                  <div className="text-2xl font-bold text-[#F8FAFC] mt-2">
                    {managedPages[0]?.name || (lang === "km" ? "មិនទាន់មាន Page" : "No Page Connected")}
                  </div>
                  <div className="text-[11px] text-[#94A3B8] mt-1 font-mono">
                    {managedPages[0]?.id ? `Page ID: ${managedPages[0].id}` : (lang === "km" ? "សូមភ្ជាប់ Page របស់អ្នក" : "Connect your page")}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <h3 className="text-base font-bold text-white mb-2">📊 សង្ខេបដំណើរការលក់ (Conversion Funnel)</h3>
                <p className="text-xs text-slate-400 mb-6">
                  ស្ថិតិនៃការបម្លែងពីអ្នក Comment ទៅជាការចូលឆាត Messenger
                </p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>អតិថិជន Comment លើ Post</span>
                      <span className="font-semibold text-white">{customersList.length}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full w-full" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-300 mb-1">
                      <span>Bot ឆ្លើយតប និងបញ្ជូន Link Inbox</span>
                      <span className="font-semibold text-white">100%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full w-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ADS MANAGER */}
          {activeTab === "ads_manager" && (
            <AdsManagerTab lang={lang} isAdmin={isAdmin} />
          )}

          {/* TAB: VIDEO & REELS PUBLISHER */}
          {activeTab === "video_publisher" && (
            <VideoPublisherTab
              lang={lang}
              connectedPages={displayedPages}
              currentUser={currentUser}
              isAdmin={isAdmin}
            />
          )}

          {/* TAB: STORY & MULTI-POST PUBLISHER */}
          {activeTab === "story_publisher" && (
            <StoryBatchPublisherTab
              lang={lang}
              connectedPages={displayedPages}
              currentUser={currentUser}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </main>

      {/* FLOATING VST SUPPORT CHATBOT */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isChatOpen ? (
          <button
            onClick={() => setIsChatOpen(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 via-sky-500 to-cyan-400 text-white shadow-xl shadow-cyan-500/40 transition hover:scale-105 active:scale-95"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        ) : (
          <div className="flex h-[620px] w-[360px] sm:w-[480px] md:w-[520px] flex-col rounded-3xl border border-cyan-500/40 bg-[#0d1627] shadow-2xl shadow-cyan-950/90 overflow-hidden backdrop-blur-2xl">
            {/* Chat header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 p-4 text-white shadow-md">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg shadow-inner">
                  🤖
                </div>
                <div>
                  <div className="text-sm font-bold leading-tight flex items-center gap-1.5">
                    <span>VST Support Bot</span>
                    {isAdmin && (
                      <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[9px] font-black text-amber-300 border border-amber-400/30">
                        Admin Mode
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-cyan-100 flex items-center gap-1.5 mt-0.5">
                    <span className={`h-2 w-2 rounded-full ${masterBotEnabled ? "bg-emerald-400 animate-pulse" : "bg-rose-400"}`} />
                    <span>{masterBotEnabled ? "Online 24/7 — ជួយគ្រប់ចំណោទ" : "🔴 Bot ផ្អាកបណ្ដោះអាសន្ន (Learning)"}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {/* Clear history button */}
                <button
                  type="button"
                  onClick={handleClearChatHistory}
                  title="សម្អាតប្រវត្តិសន្ទនា (Clear History)"
                  className="rounded-xl p-1.5 bg-white/10 hover:bg-rose-500/80 text-white transition text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                {/* 1. New Chat button on floating widget */}
                <button
                  type="button"
                  onClick={handleNewChat}
                  title="ការសន្ទនាថ្មី (New Chat)"
                  className="rounded-xl px-2 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1"
                >
                  <PlusCircle className="h-3 w-3" />
                  <span className="hidden sm:inline">New</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => setIsTrainingOpen(!isTrainingOpen)}
                    title="បង្រៀន AI & ចំណេះដឹង"
                    className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1 border ${
                      isTrainingOpen
                        ? "bg-purple-600 text-white border-purple-300 shadow-md shadow-purple-900/40"
                        : "bg-white/20 hover:bg-white/30 text-white border-white/30"
                    }`}
                  >
                    <span>{isTrainingOpen ? "💬 Chat" : "🎓 បង្រៀន Bot"}</span>
                  </button>
                )}

                {/* Expand to AI Console Tab button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsChatOpen(false);
                    setActiveTab("ai_console");
                  }}
                  title="បើកលើមជ្ឈមណ្ឌល AI & Support (ពេញទំហំ)"
                  className="rounded-xl p-1.5 bg-white/10 hover:bg-white/20 text-white transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => setIsChatOpen(false)}
                  className="rounded-xl p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {isTrainingOpen && isAdmin ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-[#09111f] text-slate-200">
                {/* Header note */}
                <div className="rounded-xl border border-purple-500/30 bg-purple-950/30 p-3">
                  <div className="font-bold text-purple-300 flex items-center gap-1.5 text-xs">
                    <span>👑 មជ្ឈមណ្ឌលបង្រៀន AI (Super Admin Only)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    អ្វីដែលបងបង្រៀននៅទីនេះ នឹងត្រូវចងចាំក្នុង Supabase ជារៀងរហូត។ ទាំង VST Support Bot និងការតប Comment នឹងប្រើចំណេះដឹងនេះ។
                  </p>
                </div>

                {/* Master Switch */}
                <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-3">
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>⚡ ដំណើរការ Bot ទូទៅ (Master Switch)</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {masterBotEnabled ? "🟢 កំពុងដំណើរការធម្មតា" : "🔴 ផ្អាកបណ្ដោះអាសន្ន (ដំណាក់កាលរៀនសូត្រ)"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMasterBotEnabled(!masterBotEnabled)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      masterBotEnabled ? "bg-emerald-500" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                        masterBotEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Persona & Tone */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    🎭 ១. ចរិតលក្ខណៈ & របៀបនិយាយ (Persona & Tone)
                  </label>
                  <textarea
                    rows={3}
                    value={aiPersona}
                    onChange={(e) => setAiPersona(e.target.value)}
                    placeholder="ឧ. ដើរតួជាអ្នកលក់ស្រីវ័យក្មេង សម្តីផ្អែមល្ហែម ប្រើពាក្យ ចាសបង/អូន ហាមឆ្លើយវែង..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 font-sans"
                  />
                </div>

                {/* Knowledge Base */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    📚 ២. ឃ្លាំងចំណេះដឹង & ផលិតផល (Knowledge Base & Memory)
                  </label>
                  <textarea
                    rows={5}
                    value={aiKnowledgeBase}
                    onChange={(e) => setAiKnowledgeBase(e.target.value)}
                    placeholder="ឧ. ព័ត៌មានលម្អិតផលិតផល ឃីដនីប្រូ, អេមមី, តម្លៃ, គុណប្រយោជន៍, ប្រូម៉ូសិន..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 font-sans"
                  />
                </div>

                {/* Strict Rules */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    ⛔ ៣. ច្បាប់ & បម្រាមពិសេស (Rules & FAQs)
                  </label>
                  <textarea
                    rows={3}
                    value={aiRules}
                    onChange={(e) => setAiRules(e.target.value)}
                    placeholder="ឧ. ហាមប្រាប់តម្លៃលើ comment ឱ្យទាញចូល inbox, ហាមទម្លាយរឿងផ្ទាល់ខ្លួន..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/80 p-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 font-sans"
                  />
                </div>

                {/* Save button & Instant Test */}
                <div className="pt-1 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleSaveAiKnowledge}
                    disabled={isSavingKnowledge}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition disabled:opacity-50"
                  >
                    <span>💾</span>
                    <span>{isSavingKnowledge ? "កំពុងរក្សាទុក..." : "រក្សាទុកចំណេះដឹង"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsTrainingOpen(false)}
                    className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-slate-700 transition"
                  >
                    🧪 សាកល្បង Chat
                  </button>
                </div>

                {knowledgeSavedSuccess && (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2 text-center text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>ចំណេះដឹងត្រូវបានចងចាំក្នុងប្រព័ន្ធដោយជោគជ័យ!</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Chat messages list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-[#09111f]">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.from === "bot" && (
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 text-xs text-white shadow-sm mt-0.5">
                          🤖
                        </div>
                      )}

                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-3 leading-relaxed whitespace-pre-line text-xs shadow-sm ${
                          msg.from === "user"
                            ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-none shadow-blue-500/20"
                            : "bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-tl-none"
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex items-start gap-2.5 justify-start">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 text-xs text-white shadow-sm mt-0.5 animate-pulse">
                        🤖
                      </div>
                      <div className="rounded-2xl rounded-tl-none bg-slate-800/90 border border-slate-700/80 px-3.5 py-2.5 text-xs text-cyan-300 flex items-center gap-1.5">
                        <RefreshCw className="h-3 w-3 animate-spin text-cyan-400" />
                        <span>កំពុងគិត និងស្វែងរកចម្លើយ...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Chat input */}
                <div className="border-t border-slate-800 p-3 bg-slate-900/95 flex items-center gap-2">
                  {isAdmin && (
                    <label
                      className="cursor-pointer p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition shrink-0"
                      title="Upload ឯកសារចំណេះដឹងឱ្យ Bot"
                    >
                      <Paperclip className="h-4 w-4" />
                      <input
                        type="file"
                        accept=".txt,.csv,.json,.pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        disabled={isUploadingDoc}
                        className="hidden"
                      />
                    </label>
                  )}
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                    placeholder={isAdmin ? "សួរបញ្ជា Bot គ្រប់រឿង ឬចុច 📎 Upload..." : "វាយសំណួររបស់អ្នកនៅទីនេះ..."}
                    className="flex-1 rounded-full border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-xs text-white placeholder-slate-400 outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                  <button
                    onClick={() => handleSendChat()}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-cyan-500/30 transition hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
