
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { categorizeBrainDump } from '@/ai/flows/categorize-brain-dump';
import type { GroupThoughtsIntoCategoriesOutput } from '@/ai/flows/group-thoughts-into-categories';
import { groupThoughtsIntoCategories } from '@/ai/flows/group-thoughts-into-categories';
import { transformToChatGPTprompt } from '@/ai/flows/transform-to-chatgpt-prompt';
import { LoaderCircle, Send, Trash2, BrainCircuit, Edit, Check, GripVertical, RefreshCcw, PlusSquare, Trash } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { DndContext, useDraggable, useDroppable, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';


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
                <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="flex-grow">{thought}</div>
        </div>
    );
}


export default function Home() {
  const [currentBrainDump, setCurrentBrainDump] = useState('');
  const [fullBrainDump, setFullBrainDump] = useState('');
  const [categorizedThoughts, setCategorizedThoughts] = useState<CategorizedThoughts | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatGPTLoadingCard, setChatGPTLoadingCard] = useState<number | null>(null);
  const [chatGPTLoadingThought, setChatGPTLoadingThought] = useState<{categoryIndex: number, thoughtIndex: number} | null>(null);
  const [editingThought, setEditingThought] = useState<{categoryIndex: number, thoughtIndex: number} | null>(null);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);

  const { toast } = useToast();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    );

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

  const handleReorganize = async () => {
    if (!fullBrainDump) {
      toast({
        title: "No thoughts to reorganize",
        description: "Please analyze some thoughts first.",
        variant: "destructive",
      });
      return;
    }
  
    setIsLoading(true);
    setCategorizedThoughts(null);
  
    try {
      const { categories } = await categorizeBrainDump({ brainDump: fullBrainDump });
      if (categories && categories.length > 0) {
        const { groupedThoughts } = await groupThoughtsIntoCategories({ brainDump: fullBrainDump, categories });
        setCategorizedThoughts(groupedThoughts);
      } else {
        toast({
          title: "Reorganization Error",
          description: "Could not generate new categories from your thoughts. Please try again.",
          variant: "destructive",
        });
        // Restore previous state if reorganization fails to produce categories
        const { categories: oldCategories } = await categorizeBrainDump({ brainDump: fullBrainDump });
        if(oldCategories && oldCategories.length > 0) {
            const { groupedThoughts: oldGroupedThoughts } = await groupThoughtsIntoCategories({ brainDump: fullBrainDump, categories: oldCategories });
            setCategorizedThoughts(oldGroupedThoughts);
        }
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

  const handleClearAll = () => {
    setCategorizedThoughts(null);
    setFullBrainDump('');
    setCurrentBrainDump('');
  };

  const handleCreateCard = () => {
    const newCard = { category: 'New Category', thoughts: [] };
    const newCategorizedThoughts = categorizedThoughts ? [...categorizedThoughts, newCard] : [newCard];
    setCategorizedThoughts(newCategorizedThoughts);
    setEditingCategory(newCategorizedThoughts.length - 1);
  };


  const reGenerateBrainDump = (thoughts: CategorizedThoughts) => {
    return thoughts.map(group => group.thoughts.join('\n')).join('\n');
  }

  const handleDeleteThought = (categoryIndex: number, thoughtIndex: number) => {
    if (!categorizedThoughts) return;
  
    const newCategorizedThoughts = categorizedThoughts.map((category, cIndex) => {
        if (cIndex === categoryIndex) {
            const newThoughts = [...category.thoughts];
            newThoughts.splice(thoughtIndex, 1);
            return { ...category, thoughts: newThoughts };
        }
        return category;
    }).filter(category => category.thoughts.length > 0);
    
    setFullBrainDump(reGenerateBrainDump(newCategorizedThoughts));

    if (newCategorizedThoughts.length === 0) {
      setCategorizedThoughts(null);
    } else {
      setCategorizedThoughts(newCategorizedThoughts);
    }
  };

  const handleEditThought = (categoryIndex: number, thoughtIndex: number) => {
    setEditingThought({ categoryIndex, thoughtIndex });
  };

  const handleSaveThought = (categoryIndex: number, thoughtIndex: number, newText: string) => {
    if (!categorizedThoughts) return;
      
    const newCategorizedThoughts = categorizedThoughts.map((category, cIndex) => {
        if (cIndex === categoryIndex) {
            const newThoughts = [...category.thoughts];
            newThoughts[thoughtIndex] = newText;
            return { ...category, thoughts: newThoughts };
        }
        return category;
    });
  
    setCategorizedThoughts(newCategorizedThoughts);
    setFullBrainDump(reGenerateBrainDump(newCategorizedThoughts));
    setEditingThought(null);
  };

  const handleDeleteCategory = (categoryIndex: number) => {
    if (!categorizedThoughts) return;

    const newCategorizedThoughts = categorizedThoughts.filter((_, cIndex) => cIndex !== categoryIndex);

    if (newCategorizedThoughts.length === 0) {
        setCategorizedThoughts(null);
        setFullBrainDump('');
    } else {
        setCategorizedThoughts(newCategorizedThoughts);
        setFullBrainDump(reGenerateBrainDump(newCategorizedThoughts));
    }
  };

  const handleEditCategory = (categoryIndex: number) => {
    setEditingCategory(categoryIndex);
  }

  const handleSaveCategory = (categoryIndex: number, newText: string) => {
    if (!categorizedThoughts) return;

    const newCategorizedThoughts = categorizedThoughts.map((category, cIndex) => {
        if (cIndex === categoryIndex) {
            return { ...category, category: newText };
        }
        return category;
    });

    setCategorizedThoughts(newCategorizedThoughts);
    setEditingCategory(null);
  }

  const handleSendToChatGPT = async (categoryIndex: number) => {
    if (!categorizedThoughts) return;
    setChatGPTLoadingCard(categoryIndex);

    try {
        const category = categorizedThoughts[categoryIndex];
        const thoughtsText = category.thoughts.join('\n');
        if (!thoughtsText.trim()) return;

        const { chatGPTprompt } = await transformToChatGPTprompt({ brainDump: thoughtsText });
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
        setChatGPTLoadingCard(null);
    }
  };

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || !active.data.current || !categorizedThoughts) {
        return;
    }

    const { thought, fromCategoryIndex, fromThoughtIndex } = active.data.current;
    const toCategoryIndex = over.data.current?.categoryIndex;

    if (fromCategoryIndex === toCategoryIndex || toCategoryIndex === undefined) {
        return; // No change if dropped in the same category or outside a valid droppable
    }
    
    const newCategorizedThoughts = [...categorizedThoughts];

    // Remove from old category
    const sourceCategory = {...newCategorizedThoughts[fromCategoryIndex]};
    sourceCategory.thoughts = [...sourceCategory.thoughts];
    sourceCategory.thoughts.splice(fromThoughtIndex, 1);
    newCategorizedThoughts[fromCategoryIndex] = sourceCategory;

    // Add to new category
    const destinationCategory = {...newCategorizedThoughts[toCategoryIndex]};
    destinationCategory.thoughts = [...destinationCategory.thoughts, thought];
    newCategorizedThoughts[toCategoryIndex] = destinationCategory;

    // Clean up empty categories
    const finalThoughts = newCategorizedThoughts.filter(c => c.thoughts.length > 0);

    setCategorizedThoughts(finalThoughts);
    setFullBrainDump(reGenerateBrainDump(finalThoughts));
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

// Sub-component for editing a category title
function EditableCategoryTitle({ category, categoryIndex, onSave, onCancel, onSendToChatGPT, onDelete, onEdit, chatGPTLoadingCard }) {
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

// Sub-component for editing a single thought
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
          <ThemeSwitcher />
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
                    <Button variant="outline" size="sm" onClick={handleReorganize} disabled={isLoading}>
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Reorganize
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleClearAll} disabled={isLoading}>
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
                                        onSendToChatGPT={handleSendToChatGPT}
                                        onDelete={handleDeleteCategory}
                                        onEdit={handleEditCategory}
                                        chatGPTLoadingCard={chatGPTLoadingCard}
                                        />
                                    ) : (
                                        <>
                                        <CardTitle className="capitalize font-headline flex-grow">{card.category}</CardTitle>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleSendToChatGPT(categoryIndex)} disabled={chatGPTLoadingCard !== null}>
                                            {chatGPTLoadingCard === categoryIndex ? (
                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Send className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                            )}
                                            <span className="sr-only">Send to ChatGPT</span>
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
      </main>

      <footer className="py-4 text-center text-sm text-muted-foreground border-t bg-background">
        <p>Powered by AI. Built with Next.js and Genkit.</p>
      </footer>
    </div>
  );
}
