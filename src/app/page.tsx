
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { categorizeBrainDump } from '@/ai/flows/categorize-brain-dump';
import type { GroupThoughtsIntoCategoriesOutput } from '@/ai/flows/group-thoughts-into-categories';
import { groupThoughtsIntoCategories } from '@/ai/flows/group-thoughts-into-categories';
import { transformToChatGPTprompt } from '@/ai/flows/transform-to-chatgpt-prompt';
import { LoaderCircle, Send, Trash2, BrainCircuit, Edit, Check } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';


type CategorizedThoughts = GroupThoughtsIntoCategoriesOutput;

export default function Home() {
  const [currentBrainDump, setCurrentBrainDump] = useState('');
  const [fullBrainDump, setFullBrainDump] = useState('');
  const [categorizedThoughts, setCategorizedThoughts] = useState<CategorizedThoughts['groupedThoughts'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatGPTLoading, setIsChatGPTLoading] = useState(false);
  const [editingThought, setEditingThought] = useState<{categoryIndex: number, thoughtIndex: number, text: string} | null>(null);
  const [editingCategory, setEditingCategory] = useState<{categoryIndex: number, text: string} | null>(null);

  const { toast } = useToast();

  const handleAnalyze = async () => {
    if (!currentBrainDump.trim()) {
        toast({
            title: "Input is empty",
            description: "Please enter some thoughts to analyze.",
            variant: "destructive",
        })
        return;
    }

    setIsLoading(true);
    
    const newFullBrainDump = fullBrainDump ? `${fullBrainDump}\n${currentBrainDump}` : currentBrainDump;

    try {
      const { categories } = await categorizeBrainDump({ brainDump: newFullBrainDump });
      if (categories && categories.length > 0) {
        const { groupedThoughts } = await groupThoughtsIntoCategories({ brainDump: newFullBrainDump, categories });
        setCategorizedThoughts(groupedThoughts);
        setFullBrainDump(newFullBrainDump);
        setCurrentBrainDump(''); // Clear the input textarea
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

  const reGenerateBrainDump = (thoughts: CategorizedThoughts['groupedThoughts']) => {
    return thoughts.map(group => group.thoughts.join('\n')).join('\n');
  }

  const handleDeleteThought = (categoryIndex: number, thoughtIndex: number) => {
    if (!categorizedThoughts) return;
  
    const newCategorizedThoughts = JSON.parse(JSON.stringify(categorizedThoughts));
    
    newCategorizedThoughts[categoryIndex].thoughts.splice(thoughtIndex, 1);
  
    if (newCategorizedThoughts[categoryIndex].thoughts.length === 0) {
      newCategorizedThoughts.splice(categoryIndex, 1);
    }
    
    setFullBrainDump(reGenerateBrainDump(newCategorizedThoughts));

    if (newCategorizedThoughts.length === 0) {
      setCategorizedThoughts(null);
    } else {
      setCategorizedThoughts(newCategorizedThoughts);
    }
  };

  const handleEditThought = (categoryIndex: number, thoughtIndex: number) => {
    if (!categorizedThoughts) return;
    const thoughtToEdit = categorizedThoughts[categoryIndex].thoughts[thoughtIndex];
    setEditingThought({ categoryIndex, thoughtIndex, text: thoughtToEdit });
  };

  const handleSaveThought = () => {
    if (!editingThought || !categorizedThoughts) return;
  
    const { categoryIndex, thoughtIndex, text } = editingThought;
      
    const newCategorizedThoughts = JSON.parse(JSON.stringify(categorizedThoughts));
    
    newCategorizedThoughts[categoryIndex].thoughts[thoughtIndex] = text;
  
    setCategorizedThoughts(newCategorizedThoughts);
    setFullBrainDump(reGenerateBrainDump(newCategorizedThoughts));
    setEditingThought(null);
  };

  const handleDeleteCategory = (categoryIndex: number) => {
    if (!categorizedThoughts) return;

    const newCategorizedThoughts = JSON.parse(JSON.stringify(categorizedThoughts));
    newCategorizedThoughts.splice(categoryIndex, 1);

    if (newCategorizedThoughts.length === 0) {
        setCategorizedThoughts(null);
        setFullBrainDump('');
    } else {
        setCategorizedThoughts(newCategorizedThoughts);
        setFullBrainDump(reGenerateBrainDump(newCategorizedThoughts));
    }
  };

  const handleEditCategory = (categoryIndex: number) => {
    if (!categorizedThoughts) return;
    const categoryToEdit = categorizedThoughts[categoryIndex].category;
    setEditingCategory({ categoryIndex, text: categoryToEdit });
  }

  const handleSaveCategory = () => {
    if (!editingCategory || !categorizedThoughts) return;

    const { categoryIndex, text } = editingCategory;
    
    const newCategorizedThoughts = JSON.parse(JSON.stringify(categorizedThoughts));
    newCategorizedThoughts[categoryIndex].category = text;

    setCategorizedThoughts(newCategorizedThoughts);
    setEditingCategory(null);
    // No need to update fullBrainDump here as category names are not part of it.
  }

  const handleSendToChatGPT = async () => {
    if (!fullBrainDump.trim()) return;
    setIsChatGPTLoading(true);
    try {
        const { chatGPTprompt } = await transformToChatGPTprompt({ brainDump: fullBrainDump });
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
              value={currentBrainDump}
              onChange={(e) => {
                setCurrentBrainDump(e.target.value);
              }}
              placeholder="Dump all your thoughts, ideas, and tasks here. Let your mind flow freely..."
              className="min-h-[200px] text-base p-4 rounded-lg shadow-sm"
              rows={10}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleAnalyze} disabled={isLoading || !currentBrainDump.trim()} className="flex-1 text-lg py-6">
                {isLoading ? (
                  <LoaderCircle className="animate-spin mr-2" />
                ) : null}
                {isLoading ? 'Analyzing...' : 'Analyze Thoughts'}
              </Button>
              <Button onClick={handleSendToChatGPT} variant="outline" disabled={isChatGPTLoading || !categorizedThoughts || categorizedThoughts.length === 0} className="flex-1 text-lg py-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categorizedThoughts.map(({ category, thoughts }, categoryIndex) => (
                <div key={category + categoryIndex} className="animate-in fade-in-0 zoom-in-95 duration-500">
                    <Card className="h-full shadow-lg hover:shadow-xl transition-shadow flex flex-col">
                      <CardHeader className="flex-row items-center gap-2">
                          {editingCategory?.categoryIndex === categoryIndex ? (
                            <div className="flex-grow flex items-center gap-2">
                              <Input 
                                value={editingCategory.text}
                                onChange={(e) => setEditingCategory({...editingCategory, text: e.target.value})}
                                className="flex-grow"
                              />
                               <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleSaveCategory}>
                                  <Check className="h-4 w-4 text-green-600" />
                                  <span className="sr-only">Save category</span>
                              </Button>
                            </div>
                          ) : (
                            <>
                              <CardTitle className="capitalize font-headline flex-grow">{category}</CardTitle>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleEditCategory(categoryIndex)}>
                                  <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                  <span className="sr-only">Edit category</span>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleDeleteCategory(categoryIndex)}>
                                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                  <span className="sr-only">Delete category</span>
                              </Button>
                            </>
                          )}
                      </CardHeader>
                      <CardContent className="flex-grow">
                          <ul className="space-y-3">
                          {thoughts.map((thought, thoughtIndex) => (
                              <li key={thought + thoughtIndex} className="flex items-start justify-between gap-2 p-3 rounded-md bg-secondary/50">
                              {editingThought?.categoryIndex === categoryIndex && editingThought?.thoughtIndex === thoughtIndex ? (
                                  <div className="flex-grow flex items-center gap-2">
                                    <Textarea
                                        value={editingThought.text}
                                        onChange={(e) => setEditingThought({ ...editingThought, text: e.target.value })}
                                        className="flex-grow"
                                        rows={2}
                                    />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleSaveThought}>
                                        <Check className="h-4 w-4 text-green-600" />
                                        <span className="sr-only">Save thought</span>
                                    </Button>
                                  </div>
                              ) : (
                                  <>
                                      <span className="flex-grow">{thought}</span>
                                      <div className="flex items-center">
                                          <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 shrink-0"
                                              onClick={() => handleEditThought(categoryIndex, thoughtIndex)}
                                          >
                                              <Edit className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                              <span className="sr-only">Edit thought</span>
                                          </Button>
                                          <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 shrink-0"
                                              onClick={() => handleDeleteThought(categoryIndex, thoughtIndex)}
                                          >
                                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                              <span className="sr-only">Delete thought</span>
                                          </Button>
                                      </div>
                                  </>
                              )}
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
