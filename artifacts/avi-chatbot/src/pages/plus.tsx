import { useEffect, useState } from "react";
import { useLocation, Link, Redirect } from "wouter";
import { Show, useClerk } from "@clerk/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, UserCircle, LogOut, ArrowLeft, Shield, Sparkles, MessageSquare, Award, GraduationCap, BookOpen, ClipboardList, Brain, Mic, Gamepad2, RotateCcw } from "lucide-react";

import {
  useGetAviAccount,
  useUpdateAviProfile,
  useUpdateAviSettings,
  getGetAviAccountQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  aviName: z.string().min(1, "Name is required").max(30),
  avatar: z.string().min(1, "Avatar is required").max(12),
  profileBio: z.string().max(160).optional(),
});

const settingsSchema = z.object({
  parentModeEnabled: z.boolean(),
  dailyLimit: z.number().min(20).max(500),
  parentPin: z.string().regex(/^\d{4}$/, "Enter a 4-digit PIN"),
});

type ArcadeCell = "X" | "O" | null;
const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function getGameResult(board: ArcadeCell[]): ArcadeCell | "draw" {
  for (const [a, b, c] of winningLines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every(Boolean) ? "draw" : null;
}

function ArcadeGame() {
  const [board, setBoard] = useState<ArcadeCell[]>(Array(9).fill(null));
  const [result, setResult] = useState<ArcadeCell | "draw">(null);

  const reset = () => {
    setBoard(Array(9).fill(null));
    setResult(null);
  };

  const play = (index: number) => {
    if (board[index] || result) return;
    const playerBoard = [...board];
    playerBoard[index] = "X";
    const playerResult = getGameResult(playerBoard);
    if (playerResult) {
      setBoard(playerBoard);
      setResult(playerResult);
      return;
    }

    const openCells = playerBoard
      .map((cell, cellIndex) => (cell ? -1 : cellIndex))
      .filter((cellIndex) => cellIndex >= 0);
    const computerIndex = openCells[Math.floor(Math.random() * openCells.length)];
    if (computerIndex !== undefined) playerBoard[computerIndex] = "O";
    setBoard(playerBoard);
    setResult(getGameResult(playerBoard));
  };

  return (
    <Card className="overflow-hidden border-purple-200 bg-gradient-to-br from-purple-50 via-white to-orange-50 shadow-sm">
      <CardHeader className="border-b border-purple-100">
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Gamepad2 className="h-5 w-5 text-purple-600" />
          AVI Arcade
        </CardTitle>
        <CardDescription>Play Tic-Tac-Toe against AVI</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 pt-6">
        <div className="grid grid-cols-3 gap-2" aria-label="Tic-Tac-Toe board">
          {board.map((cell, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Square ${index + 1}${cell ? `: ${cell}` : ""}`}
              onClick={() => play(index)}
              className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-purple-200 bg-white text-2xl font-black text-purple-700 shadow-sm transition hover:border-purple-400 hover:bg-purple-50 disabled:cursor-default"
              disabled={Boolean(cell) || Boolean(result)}
            >
              {cell}
            </button>
          ))}
        </div>
        <p className="text-sm font-medium text-gray-600">
          {result === "X" ? "You win!" : result === "O" ? "AVI wins!" : result === "draw" ? "It's a draw!" : "Your turn — you are X"}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={reset} className="gap-2 border-purple-200 text-purple-700">
          <RotateCcw className="h-4 w-4" />
          New Game
        </Button>
      </CardContent>
    </Card>
  );
}

function PlusDashboard() {
  const { data: account, isLoading, error } = useGetAviAccount();
  const updateProfile = useUpdateAviProfile();
  const updateSettings = useUpdateAviSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      aviName: "",
      avatar: "AVI",
      profileBio: "",
    },
  });

  const settingsForm = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      parentModeEnabled: false,
      dailyLimit: 100,
      parentPin: "",
    },
  });

  useEffect(() => {
    if (account) {
      profileForm.reset({
        aviName: account.aviName || "",
        avatar: account.avatar || "AVI",
        profileBio: account.profileBio || "",
      });
      settingsForm.reset({
        parentModeEnabled: !!account.parentModeEnabled,
        dailyLimit: account.dailyLimit || 100,
        parentPin: "",
      });
    }
  }, [account, profileForm, settingsForm]);

  const onProfileSubmit = (values: z.infer<typeof profileSchema>) => {
    updateProfile.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetAviAccountQueryKey(), data);
          toast({ title: "Profile updated successfully" });
        },
        onError: () => {
          toast({ title: "Failed to update profile", variant: "destructive" });
        },
      }
    );
  };

  const onSettingsSubmit = (values: z.infer<typeof settingsSchema>) => {
    updateSettings.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetAviAccountQueryKey(), data);
          toast({ title: "Settings updated successfully" });
        },
        onError: () => {
          toast({ title: "Failed to update settings", variant: "destructive" });
        },
      }
    );
  };

  const launchActivity = (prompt: string) => {
    sessionStorage.setItem("avi_plus_launch", prompt);
    setLocation("/");
  };

  const launchVoiceChat = () => {
    sessionStorage.setItem("avi_voice_mode", "true");
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-gray-50 p-4">
        <Card className="w-full max-w-md shadow-lg border-red-100">
          <CardHeader className="bg-red-50 text-center rounded-t-xl border-b border-red-100">
            <CardTitle className="text-red-700">Error Loading Account</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-gray-600 text-center mb-6">There was a problem loading your AVI Plus account.</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unlCount = account.achievementState?.unlockedIds?.length || 0;

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-gray-700 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-bold text-lg flex items-center gap-2">
              <span className="bg-gradient-to-r from-purple-600 via-red-500 to-orange-400 text-transparent bg-clip-text">
                AVI Plus
              </span>
              {account.isPlus && (
                <span className="bg-gradient-to-r from-purple-100 to-red-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full border border-purple-200">
                  ACTIVE
                </span>
              )}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => signOut({ redirectUrl: "/" })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-100 to-orange-100 flex items-center justify-center flex-shrink-0 border-4 border-white shadow-md">
            <span className="text-xl font-black text-purple-700">{account.avatar}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back, {account.aviName || "Explorer"}!
            </h2>
            <p className="text-gray-500 mt-1">
              Customize your learning companion and manage your progress.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm border-purple-100 bg-purple-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-800 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Total Chats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">{account.stats?.conversationCount || 0}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-orange-100 bg-orange-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Messages Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-900">{account.stats?.messageCount || 0}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-blue-100 bg-blue-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <Award className="h-4 w-4" /> Badges Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{unlCount}</div>
            </CardContent>
          </Card>
        </div>

        <ArcadeGame />

        <section aria-labelledby="plus-activities-heading">
          <Button
            variant="outline"
            className="mb-5 h-auto w-full justify-start gap-4 rounded-2xl border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 p-5 text-left hover:from-purple-100 hover:to-indigo-100"
            onClick={launchVoiceChat}
          >
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-sm">
              <Mic className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-lg font-bold text-gray-900">Talk To AVI</span>
              <span className="block text-sm font-normal text-gray-600">Speak naturally and hear AVI talk back</span>
            </span>
          </Button>
          <div className="mb-4">
            <h2 id="plus-activities-heading" className="text-xl font-bold text-gray-900">
              Plus-Only Learning Activities
            </h2>
            <p className="text-sm text-gray-500">
              Extra guided tools included with your free AVI Plus account.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto min-h-28 justify-start gap-3 p-4 border-purple-200 bg-purple-50/60 hover:bg-purple-100/70"
              onClick={() => launchActivity("AVI Plus Study Coach: Help me choose a subject, set a small goal, and learn it step by step without giving away answers too quickly.")}
            >
              <GraduationCap className="h-6 w-6 text-purple-700" />
              <span className="text-left">
                <span className="block font-bold text-gray-900">Study Coach</span>
                <span className="block text-xs font-normal text-gray-600">Learn with guided hints</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-28 justify-start gap-3 p-4 border-orange-200 bg-orange-50/60 hover:bg-orange-100/70"
              onClick={() => launchActivity("AVI Plus Story Studio: Help me create an original, age-appropriate story by asking me one creative question at a time.")}
            >
              <BookOpen className="h-6 w-6 text-orange-700" />
              <span className="text-left">
                <span className="block font-bold text-gray-900">Story Studio</span>
                <span className="block text-xs font-normal text-gray-600">Build a story together</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-28 justify-start gap-3 p-4 border-blue-200 bg-blue-50/60 hover:bg-blue-100/70"
              onClick={() => launchActivity("AVI Plus Personal Study Plan: Ask me what I want to learn, then create a short personalized study plan with small steps and encouraging check-ins.")}
            >
              <ClipboardList className="h-6 w-6 text-blue-700" />
              <span className="text-left">
                <span className="block font-bold text-gray-900">Personal Study Plan</span>
                <span className="block text-xs font-normal text-gray-600">Make a plan that fits you</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-28 justify-start gap-3 p-4 border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70"
              onClick={() => launchActivity("AVI Plus Quiz Builder: Ask me for a topic and age level, then build a fun quiz one question at a time with hints and a score at the end.")}
            >
              <Brain className="h-6 w-6 text-indigo-700" />
              <span className="text-left">
                <span className="block font-bold text-gray-900">Quiz Builder</span>
                <span className="block text-xs font-normal text-gray-600">Create a quiz just for you</span>
              </span>
            </Button>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Profile Customization */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50 rounded-t-xl">
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-purple-600" />
                Companion Profile
              </CardTitle>
              <CardDescription>How AVI knows you</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="aviName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Nickname</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. CodeMaster" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                     control={profileForm.control}
                     name="avatar"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Avatar Mark</FormLabel>
                         <FormControl>
                           <Input placeholder="AVI" maxLength={12} {...field} />
                         </FormControl>
                         <FormDescription>
                           Use short initials or a symbol that represents you.
                         </FormDescription>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                  <FormField
                    control={profileForm.control}
                    name="profileBio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>About You</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="I like spaceships and dinosaurs..." 
                            className="resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Help AVI understand what you are interested in.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={updateProfile.isPending}
                  >
                    {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Profile
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Parent Controls */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50 rounded-t-xl">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                Parent Controls
              </CardTitle>
              <CardDescription>Manage daily usage and access</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-6">
                  <FormField
                    control={settingsForm.control}
                    name="parentModeEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Parent Mode</FormLabel>
                          <FormDescription>
                            Enable stricter content filtering
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={settingsForm.control}
                    name="dailyLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily Message Limit</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-4">
                            <Input 
                              type="number" 
                              {...field} 
                               onChange={(event) =>
                                 field.onChange(
                                   event.target.value === ""
                                     ? settingsForm.getValues("dailyLimit")
                                     : Number(event.target.value),
                                 )
                               }
                              className="w-24"
                            />
                            <span className="text-sm text-gray-500">messages / day</span>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Currently used: {account.dailyMessageCount} today
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={settingsForm.control}
                    name="parentPin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{account.parentPinSet ? "Parent PIN" : "Create Parent PIN"}</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="4 digits"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Required to change Parent Mode or the daily limit.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={updateSettings.isPending}
                  >
                    {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Settings
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function PlusPage() {
  return (
    <>
      <Show when="signed-in">
        <PlusDashboard />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-up" />
      </Show>
    </>
  );
}
