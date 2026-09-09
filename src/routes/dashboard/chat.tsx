import { createFileRoute } from "@tanstack/react-router";
import { privateRouteHead } from "@/lib/seo/privateRouteHead";
import { lazy as reactLazy } from "react";
import { importWithRetry } from "@/lib/lazyWithRetry";
import ProtectedRoute from "@/components/ProtectedRoute";

const DashboardChatPage = reactLazy(() => importWithRetry(() => import("@/pages/DashboardChatPage")));

export const Route = createFileRoute("/dashboard/chat")({
  head: () => privateRouteHead("Chat"),
  component: () => (<ProtectedRoute><DashboardChatPage /></ProtectedRoute>),
});
