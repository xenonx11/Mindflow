
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { categorizeBrainDump } from '@/ai/flows/categorize-brain-dump';
import type { GroupThoughtsIntoCategoriesOutput } from '@/ai/flows/group-thoughts-into-categories';
import { groupThoughtsIntoCategories } from '@/ai/flows/group-thoughts-into-categories';
import { transformToChatGPTprompt } from '@/ai/flows/transform-to-chatgpt-prompt';
import { LoaderCircle, Send, Trash2, BrainCircuit, Edit, Check, RefreshCcw, PlusSquare, Trash, Plus } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { DndContext, useDraggable, useDroppable, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';

import { auth, db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';


type CategorizedThoughts = GroupThoughtsIntoCategoriesOutput['groupedThoughts'];

function DraggableThought({ thought, categoryIndex, thoughtIndex }: { thought: string; categoryIndex: number; thoughtIndex: number; }) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `draggable-${categoryIndex}-${thoughtIndex}`,
        data: { thought, fromCategoryIndex: categoryIndex, fromThoughtIndex: thoughtIndex },
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 100,
        cursor: 'grabbing',
    } : undefined;


    return (
        <div ref={setNodeRef} style={style} className="flex items-center w-full">
            <button {...listeners} {...attributes} className="cursor-grab p-1">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5 text-muted-foreground"
                >
                    <circle cx="9" cy="9" r="1" />
                    <circle cx="9" cy="15" r="1" />
                    <circle cx="15" cy="9" r="1" />
                    <circle cx="15" cy="15" r="1" />
                </svg>
            </button>
            <div className="flex-grow">{thought}</div>
        </div>
    );
}


export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [currentBrainDump, setCurrentBrainDump] = useState('');
  const [categorizedThoughts, setCategorizedThoughts] = useState<CategorizedThoughts | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatGPTLoadingThought, setChatGPTLoadingThought] = useState<{categoryIndex: number, thoughtIndex: number} | null>(null);
  const [editingThought, setEditingThought] = useState<{categoryIndex: number, thoughtIndex: number} | null>(null);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);

  const { toast } = useToast();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    );

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user) {
            const docRef = doc(db, 'users', user.uid);
            const unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setCategorizedThoughts(data.thoughts || null);
                } else {
                    setCategorizedThoughts(null);
                }
            });
            return () => unsubscribe();
        }
    }, [user]);

    const updateFirestore = async (newThoughts: CategorizedThoughts | null) => {
        if (user) {
            try {
                const docRef = doc(db, 'users', user.uid);
                await setDoc(docRef, { thoughts: newThoughts }, { merge: true });
            } catch (error) {
                console.error("Error updating Firestore: ", error);
                toast({
                    title: "Sync Error",
                    description: "Could not save your thoughts to the cloud.",
                    variant: "destructive",
                });
            }
        }
    };

    const reGenerateBrainDumpFromThoughts = (thoughts: CategorizedThoughts | null) => {
        if (!thoughts) return '';
        return thoughts.map(group => group.thoughts.join('\n')).join('\n');
    }

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
    
    const existingBrainDump = reGenerateBrainDumpFromThoughts(categorizedThoughts);
    const newFullBrainDump = existingBrainDump ? `${existingBrainDump}\n${currentBrainDump}` : currentBrainDump;

    try {
      const { categories } = await categorizeBrainDump({ brainDump: newFullBrainDump });
      if (categories && categories.length > 0) {
        const { groupedThoughts } = await groupThoughtsIntoCategories({ brainDump: newFullBrainDump, categories });
        await updateFirestore(groupedThoughts);
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

  const handleReorganize = async () => {
    const fullBrainDump = reGenerateBrainDumpFromThoughts(categorizedThoughts);
    if (!fullBrainDump) {
      toast({
        title: "No thoughts to reorganize",
        description: "Please analyze some thoughts first.",
        variant: "destructive",
      });
      return;
    }
  
    setIsLoading(true);
  
    try {
      const { categories } = await categorizeBrainDump({ brainDump: fullBrainDump });
      if (categories && categories.length > 0) {
        const { groupedThoughts } = await groupThoughtsIntoCategories({ brainDump: fullBrainDump, categories });
        await updateFirestore(groupedThoughts);
      } else {
        toast({
          title: "Reorganization Error",
          description: "Could not generate new categories from your thoughts. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "An unexpected error occurred",
        description: "Failed to reorganize thoughts. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = async () => {
    await updateFirestore(null);
    setCurrentBrainDump('');
  };

  const handleCreateCard = async () => {
    const newCard = { category: 'New Category', thoughts: [] };
    const newCategorizedThoughts = categorizedThoughts ? [...categorizedThoughts, newCard] : [newCard];
    await updateFirestore(newCategorizedThoughts);
    setEditingCategory(newCategorizedThoughts.length - 1);
  };

  const handleAddThought = async (categoryIndex: number) => {
    if (!categorizedThoughts) return;

    const newCategorizedThoughts = categorizedThoughts.map((category, cIndex) => {
      if (cIndex === categoryIndex) {
        const newThoughts = [...category.thoughts, ''];
        return { ...category, thoughts: newThoughts };
      }
      return category;
    });

    await updateFirestore(newCategorizedThoughts);
    setEditingThought({
      categoryIndex,
      thoughtIndex: newCategorizedThoughts[categoryIndex].thoughts.length - 1
    });
  };

  const handleDeleteThought = async (categoryIndex: number, thoughtIndex: number) => {
    if (!categorizedThoughts) return;
  
    const newCategorizedThoughts = categorizedThoughts.map((category, cIndex) => {
        if (cIndex === categoryIndex) {
            const newThoughts = [...category.thoughts];
            newThoughts.splice(thoughtIndex, 1);
            return { ...category, thoughts: newThoughts };
        }
        return category;
    }).filter(category => category.thoughts.length > 0);
    
    if (newCategorizedThoughts.length === 0) {
      await updateFirestore(null);
    } else {
      await updateFirestore(newCategorizedThoughts);
    }
  };

  const handleEditThought = (categoryIndex: number, thoughtIndex: number) => {
    setEditingThought({ categoryIndex, thoughtIndex });
  };

  const handleSaveThought = async (categoryIndex: number, thoughtIndex: number, newText: string) => {
    if (!categorizedThoughts) return;
      
    const newCategorizedThoughts = categorizedThoughts.map((category, cIndex) => {
        if (cIndex === categoryIndex) {
            const newThoughts = [...category.thoughts];
            newThoughts[thoughtIndex] = newText;
            return { ...category, thoughts: newThoughts };
        }
        return category;
    });
  
    await updateFirestore(newCategorizedThoughts);
    setEditingThought(null);
  };

  const handleDeleteCategory = async (categoryIndex: number) => {
    if (!categorizedThoughts) return;

    const newCategorizedThoughts = categorizedThoughts.filter((_, cIndex) => cIndex !== categoryIndex);

    if (newCategorizedThoughts.length === 0) {
        await updateFirestore(null);
    } else {
        await updateFirestore(newCategorizedThoughts);
    }
  };

  const handleEditCategory = (categoryIndex: number) => {
    setEditingCategory(categoryIndex);
  }

  const handleSaveCategory = async (categoryIndex: number, newText: string) => {
    if (!categorizedThoughts) return;

    const newCategorizedThoughts = categorizedThoughts.map((category, cIndex) => {
        if (cIndex === categoryIndex) {
            return { ...category, category: newText };
        }
        return category;
    });

    await updateFirestore(newCategorizedThoughts);
    setEditingCategory(null);
  }

  const handleSendThoughtToChatGPT = async (categoryIndex: number, thoughtIndex: number) => {
    if (!categorizedThoughts) return;
    setChatGPTLoadingThought({ categoryIndex, thoughtIndex });

    try {
      const thoughtText = categorizedThoughts[categoryIndex].thoughts[thoughtIndex];
      if (!thoughtText.trim()) return;

      const { chatGPTprompt } = await transformToChatGPTprompt({ brainDump: thoughtText });
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
      setChatGPTLoadingThought(null);
    }
  };

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || !active.data.current || !categorizedThoughts) {
        return;
    }

    const { thought, fromCategoryIndex, fromThoughtIndex } = active.data.current;
    const toCategoryIndex = over.data.current?.categoryIndex;

    if (fromCategoryIndex === toCategoryIndex || toCategoryIndex === undefined) {
        return; 
    }
    
    const newCategorizedThoughts = [...categorizedThoughts];

    const sourceCategory = {...newCategorizedThoughts[fromCategoryIndex]};
    sourceCategory.thoughts = [...sourceCategory.thoughts];
    sourceCategory.thoughts.splice(fromThoughtIndex, 1);
    newCategorizedThoughts[fromCategoryIndex] = sourceCategory;

    const destinationCategory = {...newCategorizedThoughts[toCategoryIndex]};
    destinationCategory.thoughts = [...destinationCategory.thoughts, thought];
    newCategorizedThoughts[toCategoryIndex] = destinationCategory;

    const finalThoughts = newCategorizedThoughts.filter(c => c.thoughts.length > 0);

    await updateFirestore(finalThoughts);
  }


  function CategoryDropZone({ categoryIndex, children }: { categoryIndex: number; children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `droppable-category-${categoryIndex}`,
        data: { categoryIndex }
    });

    return (
        <div ref={setNodeRef} className={`rounded-lg ${isOver ? 'bg-accent/80' : ''}`}>
            {children}
        </div>
    );
}

function EditableCategoryTitle({ category, categoryIndex, onSave, onCancel }) {
    const [text, setText] = useState(category.category);

    const handleSave = () => {
        onSave(categoryIndex, text);
    };

    return (
        <div className="flex-grow flex items-center gap-2">
            <Input 
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-grow"
                autoFocus
                onBlur={handleSave}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') onCancel();
                }}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleSave}>
                <Check className="h-4 w-4 text-green-600" />
                <span className="sr-only">Save category</span>
            </Button>
        </div>
    );
}

function EditableThought({ thought, categoryIndex, thoughtIndex, onSave, onCancel }) {
    const [text, setText] = useState(thought);
    
    const handleSave = () => {
        onSave(categoryIndex, thoughtIndex, text);
    };

    return (
        <div className="flex-grow flex items-center gap-2">
            <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-grow"
                rows={2}
                autoFocus
                onBlur={handleSave}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') onCancel();
                }}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleSave}>
                <Check className="h-4 w-4 text-green-600" />
                <span className="sr-only">Save thought</span>
            </Button>
        </div>
    );
}

const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Error signing in with Google: ", error);
        toast({
            title: "Sign-in failed",
            description: "Could not sign you in with Google. Please try again.",
            variant: "destructive",
        });
    }
};

const handleSignOut = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out: ", error);
        toast({
            title: "Sign-out failed",
            description: "Could not sign you out. Please try again.",
            variant: "destructive",
        });
    }
};

  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-8 bg-background border-b">
        <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <BrainCircuit className="w-12 h-12 text-primary" />
            <div className="text-left">
              <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tighter">
                MindFlow
              </h1>
              <p className="text-lg text-muted-foreground">
                Untangle your thoughts. Let AI find the patterns.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            {user ? (
                <Button onClick={handleSignOut} variant="outline">Sign Out</Button>
            ) : (
                <Button onClick={signInWithGoogle}>Sign In with Google</Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-6">
        {!user ? (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold">Welcome to MindFlow</h2>
                <p className="text-muted-foreground mt-2">Please sign in to continue and sync your thoughts across devices.</p>
            </div>
        ) : (
            <>
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
                {isLoading && !categorizedThoughts ? (
                  <LoaderCircle className="animate-spin mr-2" />
                ) : null}
                {isLoading && !categorizedThoughts ? 'Analyzing...' : 'Untangle Thoughts'}
              </Button>
            </div>
          </div>
        </div>
        
        {isLoading && !categorizedThoughts && (
            <div className="flex justify-center items-center py-20">
                <LoaderCircle className="w-16 h-16 animate-spin text-primary" />
            </div>
        )}
        
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="mt-12">
                <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-center font-headline">Your Organized Thoughts</h2>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCreateCard} disabled={isLoading}>
                        <PlusSquare className="w-4 h-4 mr-2" />
                        Create
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleReorganize} disabled={isLoading || !categorizedThoughts}>
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Reorganize
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClearAll} disabled={isLoading || !categorizedThoughts}>
                        <Trash className="w-4 h-4 mr-2" />
                        All Clear
                    </Button>
                </div>
                </div>
                {categorizedThoughts && categorizedThoughts.length > 0 && !isLoading && (
                    <div className="[column-count:1] md:[column-count:2] lg:[column-count:3] gap-6 space-y-6">
                    {categorizedThoughts.map((card, categoryIndex) => (
                        <CategoryDropZone key={`${card.category}-${categoryIndex}`} categoryIndex={categoryIndex}>
                            <div className="animate-in fade-in-0 zoom-in-95 duration-500 inline-block w-full break-inside-avoid">
                                <Card className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
                                <CardHeader className="flex-row items-center gap-2">
                                    {editingCategory === categoryIndex ? (
                                        <EditableCategoryTitle 
                                        category={card}
                                        categoryIndex={categoryIndex}
                                        onSave={handleSaveCategory}
                                        onCancel={() => setEditingCategory(null)}
                                        />
                                    ) : (
                                        <>
                                        <CardTitle className="capitalize font-headline flex-grow">{card.category}</CardTitle>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleAddThought(categoryIndex)}>
                                            <Plus className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                            <span className="sr-only">Add thought</span>
                                        </Button>
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
                                    {card.thoughts.map((thought, thoughtIndex) => (
                                        <li key={`${categoryIndex}-${thoughtIndex}`} className="flex items-start justify-between gap-2 p-3 rounded-md bg-secondary/50">
                                        {editingThought?.categoryIndex === categoryIndex && editingThought?.thoughtIndex === thoughtIndex ? (
                                            <EditableThought
                                                thought={thought}
                                                categoryIndex={categoryIndex}
                                                thoughtIndex={thoughtIndex}
                                                onSave={handleSaveThought}
                                                onCancel={() => setEditingThought(null)}
                                            />
                                        ) : (
                                            <>
                                                <div className="flex-grow flex items-center">
                                                    <DraggableThought thought={thought} categoryIndex={categoryIndex} thoughtIndex={thoughtIndex} />
                                                </div>
                                                <div className="flex items-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 shrink-0"
                                                        onClick={() => handleSendThoughtToChatGPT(categoryIndex, thoughtIndex)}
                                                        disabled={chatGPTLoadingThought !== null}
                                                    >
                                                        {chatGPTLoadingThought?.categoryIndex === categoryIndex && chatGPTLoadingThought?.thoughtIndex === thoughtIndex ? (
                                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                        <Send className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                                        )}
                                                        <span className="sr-only">Send thought to ChatGPT</span>
                                                    </Button>
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
                        </CategoryDropZone>
                    ))}
                    </div>
                )}
            </div>
        </DndContext>
        </>
        )}
      </main>

      <footer className="py-4 text-center text-sm text-muted-foreground border-t bg-background">
        <p>Powered by AI. Built with Next.js and Genkit.</p>
      </footer>
    </div>
  );
}
