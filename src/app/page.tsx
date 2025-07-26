'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { categorizeBrainDump } from '@/ai/flows/categorize-brain-dump';
import type { GroupThoughtsIntoCategoriesOutput } from '@/ai/flows/group-thoughts-into-categories';
import { groupThoughtsIntoCategories } from '@/ai/flows/group-thoughts-into-categories';
import { transformToChatGPTprompt } from '@/ai/flows/transform-to-chatgpt-prompt';
import { LoaderCircle, Send, Trash2, BrainCircuit } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

type CategorizedThoughts = GroupThoughtsIntoCategoriesOutput;

export default function Home() {
  const [brainDump, setBrainDump] = useState('');
  const [categorizedThoughts, setCategorizedThoughts] = useState<CategorizedThoughts['groupedThoughts'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatGPTLoading, setIsChatGPTLoading] = useState(false);

  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!brainDump.trim()) {
        toast({
            title: "Input is empty",
            description: "Please enter some thoughts to analyze.",
            variant: "destructive",
        })
        return;
    }

    setIsLoading(true);
    setCategorizedThoughts(null);
    try {
      const { categories } = await categorizeBrainDump({ brainDump });
      if (categories && categories.length > 0) {
        const { groupedThoughts } = await groupThoughtsIntoCategories({ brainDump, categories });
        setCategorizedThoughts(groupedThoughts);
      } else {
        toast({
            title: "Analysis Error",
            description: "Could not generate categories from your input. Please try again with different text.",
            variant: "destructive",
        })
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "An unexpected error occurred",
        description: "Failed to analyze thoughts. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteThought = (categoryIndex: number, thoughtIndex: number) => {
    if (!categorizedThoughts) return;
  
    const newCategorizedThoughts = JSON.parse(JSON.stringify(categorizedThoughts));
    
    newCategorizedThoughts[categoryIndex].thoughts.splice(thoughtIndex, 1);
  
    if (newCategorizedThoughts[categoryIndex].thoughts.length === 0) {
      newCategorizedThoughts.splice(categoryIndex, 1);
    }
    
    if (newCategorizedThoughts.length === 0) {
      setCategorizedThoughts(null);
    } else {
      setCategorizedThoughts(newCategorizedThoughts);
    }
  };

  const handleSendToChatGPT = async () => {
    if (!brainDump.trim()) return;
    setIsChatGPTLoading(true);
    try {
        const { chatGPTprompt } = await transformToChatGPTprompt({ brainDump });
        const url = `https://chat.openai.com/?prompt=${encodeURIComponent(chatGPTprompt)}`;
        window.open(url, '_blank');
    } catch (error) {
        console.error(error);
        toast({
            title: "Error creating prompt",
            description: "Failed to generate a prompt for ChatGPT. Please try again.",
            variant: "destructive",
        });
    } finally {
        setIsChatGPTLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-8 bg-background border-b">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <div className="flex items-center justify-center gap-4 mb-2">
            <BrainCircuit className="w-12 h-12 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tighter">
              MindFlow
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Untangle your thoughts. Let AI find the patterns.
          </p>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            <Textarea
              value={brainDump}
              onChange={(e) => {
                setBrainDump(e.target.value);
              }}
              placeholder="Dump all your thoughts, ideas, and tasks here. Let your mind flow freely..."
              className="min-h-[200px] text-base p-4 rounded-lg shadow-sm"
              rows={10}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleAnalyze} disabled={isLoading || !brainDump.trim()} className="flex-1 text-lg py-6">
                {isLoading ? (
                  <LoaderCircle className="animate-spin mr-2" />
                ) : null}
                {isLoading ? 'Analyzing...' : 'Analyze Thoughts'}
              </Button>
              <Button onClick={handleSendToChatGPT} variant="accent" disabled={isChatGPTLoading || !brainDump.trim()} className="flex-1 text-lg py-6 bg-accent text-accent-foreground hover:bg-accent/90">
                 {isChatGPTLoading ? (
                  <LoaderCircle className="animate-spin mr-2" />
                ) : <Send className="mr-2" />}
                Send to ChatGPT
              </Button>
            </div>
          </div>
        </div>
        
        {isLoading && (
            <div className="flex justify-center items-center py-20">
                <LoaderCircle className="w-16 h-16 animate-spin text-primary" />
            </div>
        )}

        {categorizedThoughts && categorizedThoughts.length > 0 && !isLoading && (
          <div className="mt-12">
            <h2 className="text-3xl font-bold text-center mb-8 font-headline">Your Organized Thoughts</h2>
            <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4">
              {categorizedThoughts.map(({ category, thoughts }, categoryIndex) => (
                <div key={category} className="min-w-[320px] md:min-w-[380px] flex-shrink-0 animate-in fade-in-0 zoom-in-95 duration-500">
                    <Card className="h-full shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                        <CardTitle className="capitalize font-headline">{category}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-3">
                        {thoughts.map((thought, thoughtIndex) => (
                            <li key={thoughtIndex} className="flex items-start justify-between gap-2 p-3 rounded-md bg-secondary/50">
                            <span className="flex-grow">{thought}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                onClick={() => handleDeleteThought(categoryIndex, thoughtIndex)}
                            >
                                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                <span className="sr-only">Delete thought</span>
                            </Button>
                            </li>
                        ))}
                        </ul>
                    </CardContent>
                    </Card>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="py-4 text-center text-sm text-muted-foreground border-t bg-background">
        <p>Powered by AI. Built with Next.js and Genkit.</p>
      </footer>
    </div>
  );
}
