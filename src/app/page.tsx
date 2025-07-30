
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { categorizeBrainDump } from '@/ai/flows/categorize-brain-dump';
import type { GroupThoughtsIntoCategoriesOutput } from '@/ai/flows/group-thoughts-into-categories';
import { groupThoughtsIntoCategories } from '@/ai/flows/group-thoughts-into-categories';
import { transformToChatGPTprompt } from '@/ai/flows/transform-to-chatgpt-prompt';
import { categorizeAudioNote } from '@/ai/flows/categorize-audio-note';
import { LoaderCircle, Send, Trash2, BrainCircuit, Edit, Check, RefreshCcw, PlusSquare, Trash, Plus, Mic, Square, Play, Pause } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Input } from '@/components/ui/input';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { DndContext, useDraggable, useDroppable, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';

type Thought = {
    id: string;
    type: 'text' | 'audio';
    content: string; // text content or audio data URI
    title?: string; // for audio
    transcription?: string; // for audio
};

type CategorizedThoughtGroup = {
    category: string;
    thoughts: Thought[];
};

type CategorizedThoughts = CategorizedThoughtGroup[];

const DraggableThought = React.memo(({ thought, onTogglePlayPause, playingAudioId }: { thought: Thought; onTogglePlayPause: (thought: Thought) => void; playingAudioId: string | null; }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: `draggable-${thought.id}`,
        data: { thought },
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
                    viewBox="0 0 24"
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
            <div className="flex-grow">
                {thought.type === 'text' ? (
                    <div>{thought.content}</div>
                ) : (
                    <div className="flex items-center gap-2">
                         <Button variant="ghost" size="icon" onClick={() => onTogglePlayPause(thought)}>
                            {playingAudioId === thought.id ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                        </Button>
                        <div className="flex-grow text-sm italic">{thought.title || 'Audio Note'}</div>
                    </div>
                )}
            </div>
        </div>
    );
});
DraggableThought.displayName = 'DraggableThought';


const ThoughtCategoryCard = React.memo(({
    card,
    categoryIndex,
    editingCategory,
    editingThought,
    playingAudioId,
    chatGPTLoadingThought,
    handleSaveCategory,
    setEditingCategory,
    handleAddThought,
    handleEditCategory,
    handleDeleteCategory,
    handleSaveThought,
    setEditingThought,
    togglePlayPause,
    handleSendThoughtToChatGPT,
    handleEditThought,
    handleDeleteThought,
}: {
    card: CategorizedThoughtGroup;
    categoryIndex: number;
    editingCategory: number | null;
    editingThought: { categoryIndex: number, thoughtIndex: number } | null;
    playingAudioId: string | null;
    chatGPTLoadingThought: string | null;
    handleSaveCategory: (categoryIndex: number, newText: string) => void;
    setEditingCategory: (index: number | null) => void;
    handleAddThought: (categoryIndex: number) => void;
    handleEditCategory: (categoryIndex: number) => void;
    handleDeleteCategory: (categoryIndex: number) => void;
    handleSaveThought: (categoryIndex: number, thoughtIndex: number, newText: string) => void;
    setEditingThought: (details: { categoryIndex: number, thoughtIndex: number } | null) => void;
    togglePlayPause: (thought: Thought) => void;
    handleSendThoughtToChatGPT: (thought: Thought) => void;
    handleEditThought: (categoryIndex: number, thoughtIndex: number) => void;
    handleDeleteThought: (categoryIndex: number, thoughtIndex: number) => void;
}) => {
    return (
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
                            <li key={thought.id} className="flex items-start justify-between gap-2 p-3 rounded-md bg-secondary/50">
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
                                            <DraggableThought
                                                thought={thought}
                                                onTogglePlayPause={togglePlayPause}
                                                playingAudioId={playingAudioId}
                                            />
                                        </div>

                                        <div className="flex items-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 shrink-0"
                                                onClick={() => handleSendThoughtToChatGPT(thought)}
                                                disabled={chatGPTLoadingThought !== null}
                                            >
                                                {chatGPTLoadingThought === thought.id ? (
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
    );
});
ThoughtCategoryCard.displayName = "ThoughtCategoryCard";


export default function Home() {
  const [currentBrainDump, setCurrentBrainDump] = useState('');
  const [categorizedThoughts, setCategorizedThoughts] = useState<CategorizedThoughts | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Analyzing...');
  const [chatGPTLoadingThought, setChatGPTLoadingThought] = useState<string | null>(null);
  const [editingThought, setEditingThought] = useState<{categoryIndex: number, thoughtIndex: number} | null>(null);
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);


  const { toast } = useToast();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    );

    useEffect(() => {
        const savedThoughts = localStorage.getItem('categorizedThoughts');
        if (savedThoughts) {
            setCategorizedThoughts(JSON.parse(savedThoughts));
        }
    }, []);

    const updateLocalStorage = (newThoughts: CategorizedThoughts | null) => {
        if (newThoughts) {
            localStorage.setItem('categorizedThoughts', JSON.stringify(newThoughts));
        } else {
            localStorage.removeItem('categorizedThoughts');
        }
        setCategorizedThoughts(newThoughts);
    };

    const reGenerateBrainDumpFromThoughts = (thoughts: CategorizedThoughts | null) => {
        if (!thoughts) return '';
        return thoughts
            .flatMap(group => 
                group.thoughts.map(t => t.type === 'text' ? t.content : t.transcription)
            )
            .filter(Boolean)
            .join('\n');
    }

    const getAllThoughts = (thoughts: CategorizedThoughts | null): Thought[] => {
        if (!thoughts) return [];
        return thoughts.flatMap(group => group.thoughts);
    }

    const loadingMessages = [
        "Reading thoughts...",
        "Untangling each thread...",
        "Creating perfect categories...",
        "Almost there...",
    ];
    
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isLoading) {
            let i = 0;
            setLoadingText(loadingMessages[i]);
            interval = setInterval(() => {
                i = (i + 1) % loadingMessages.length;
                setLoadingText(loadingMessages[i]);
            }, 2000);
        }
        return () => {
            if (interval) {
                clearInterval(interval)
            }
        };
    }, [isLoading]);

    const processAndSetThoughts = (rawGroupedThoughts: GroupThoughtsIntoCategoriesOutput['groupedThoughts'], existingThoughts: Thought[]) => {
        const existingThoughtsMap = new Map(existingThoughts.map(t => [(t.type === 'text' ? t.content : t.transcription || ''), t]));
        
        const groupedThoughts: CategorizedThoughts = rawGroupedThoughts.map(group => ({
            category: group.category,
            thoughts: group.thoughts.map(thoughtText => {
                const existingThought = existingThoughtsMap.get(thoughtText);
                if (existingThought) {
                    // It's a re-categorized existing thought (could be text or audio)
                    return existingThought;
                }
                // It's a new text thought from the brain dump
                return {
                    id: crypto.randomUUID(),
                    type: 'text',
                    content: thoughtText,
                };
            })
        }));

        updateLocalStorage(groupedThoughts);
    };

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
        const allExistingThoughts = getAllThoughts(categorizedThoughts);

        try {
          const { categories } = await categorizeBrainDump({ brainDump: newFullBrainDump });
          if (categories && categories.length > 0) {
            const { groupedThoughts: rawGroupedThoughts } = await groupThoughtsIntoCategories({ brainDump: newFullBrainDump, categories });
            processAndSetThoughts(rawGroupedThoughts, allExistingThoughts);
            setCurrentBrainDump('');
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
    const allExistingThoughts = getAllThoughts(categorizedThoughts);
  
    try {
      const { categories } = await categorizeBrainDump({ brainDump: fullBrainDump });
      if (categories && categories.length > 0) {
        const { groupedThoughts: rawGroupedThoughts } = await groupThoughtsIntoCategories({ brainDump: fullBrainDump, categories });
        processAndSetThoughts(rawGroupedThoughts, allExistingThoughts);
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

  const handleClearAll = () => {
    updateLocalStorage(null);
    setCurrentBrainDump('');
  };

  const handleCreateCard = () => {
    const newCard = { category: 'New Category', thoughts: [] };
    const newCategorizedThoughts = categorizedThoughts ? [...categorizedThoughts, newCard] : [newCard];
    updateLocalStorage(newCategorizedThoughts);
    setEditingCategory(newCategorizedThoughts.length - 1);
  };

  const handleAddThought = (categoryIndex: number) => {
    if (!categorizedThoughts) return;

    const newCategorizedThoughts = categorizedThoughts.map((category, cIndex) => {
      if (cIndex === categoryIndex) {
        const newThought: Thought = { id: crypto.randomUUID(), type: 'text', content: ''};
        const newThoughts = [...category.thoughts, newThought];
        return { ...category, thoughts: newThoughts };
      }
      return category;
    });

    updateLocalStorage(newCategorizedThoughts);
    setEditingThought({
      categoryIndex,
      thoughtIndex: newCategorizedThoughts[categoryIndex].thoughts.length - 1
    });
  };

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
        
        if (newCategorizedThoughts.length === 0) {
            updateLocalStorage(null);
        } else {
            updateLocalStorage(newCategorizedThoughts);
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
            const thoughtToUpdate = { ...newThoughts[thoughtIndex]};
            if (thoughtToUpdate.type === 'text') {
                thoughtToUpdate.content = newText;
            } else {
                thoughtToUpdate.title = newText;
            }

            newThoughts[thoughtIndex] = thoughtToUpdate;
            return { ...category, thoughts: newThoughts };
        }
        return category;
    });
  
    updateLocalStorage(newCategorizedThoughts);
    setEditingThought(null);
  };

  const handleDeleteCategory = (categoryIndex: number) => {
    if (!categorizedThoughts) return;

    const newCategorizedThoughts = categorizedThoughts.filter((_, cIndex) => cIndex !== categoryIndex);

    if (newCategorizedThoughts.length === 0) {
        updateLocalStorage(null);
    } else {
        updateLocalStorage(newCategorizedThoughts);
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

    updateLocalStorage(newCategorizedThoughts);
    setEditingCategory(null);
  }

  const handleSendThoughtToChatGPT = async (thought: Thought) => {
    const textToSend = thought.type === 'text' ? thought.content : (thought.transcription || '');
    if (!textToSend) return;
    setChatGPTLoadingThought(thought.id);

    try {
      const { chatGPTprompt } = await transformToChatGPTprompt({ brainDump: textToSend });
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
    
        if (!over || !active.data.current) {
            return;
        }

        const thought = active.data.current.thought as Thought;
        const fromCategoryIndex = categorizedThoughts?.findIndex(c => c.thoughts.some(t => t.id === thought.id));
        const toCategoryIndex = over.data.current?.categoryIndex;

        if (fromCategoryIndex === undefined || fromCategoryIndex === -1 || toCategoryIndex === undefined || fromCategoryIndex === toCategoryIndex) {
            return;
        }

        if (!categorizedThoughts) return;
        
        const newCategorizedThoughts = [...categorizedThoughts];
    
        const sourceCategory = {...newCategorizedThoughts[fromCategoryIndex]};
        const thoughtIndex = sourceCategory.thoughts.findIndex(t => t.id === thought.id);
        sourceCategory.thoughts = [...sourceCategory.thoughts];
        sourceCategory.thoughts.splice(thoughtIndex, 1);
        newCategorizedThoughts[fromCategoryIndex] = sourceCategory;
    
        const destinationCategory = {...newCategorizedThoughts[toCategoryIndex]};
        destinationCategory.thoughts = [...destinationCategory.thoughts, thought];
        newCategorizedThoughts[toCategoryIndex] = destinationCategory;
    
        const finalThoughts = newCategorizedThoughts.filter(c => c.thoughts.length > 0);
    
        updateLocalStorage(finalThoughts);
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            const audioChunks: Blob[] = [];
    
            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
    
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result as string;
                    handleAudioCategorization(base64Audio);
                };
            };
    
            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            toast({
                title: "Microphone Access Denied",
                description: "Please enable microphone permissions in your browser settings.",
                variant: "destructive",
            });
        }
    };
    
    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };
    
    const handleAudioCategorization = async (audioDataUri: string) => {
        setIsLoading(true);
        setLoadingText("Analyzing audio...");
        try {
            const existingCategories = categorizedThoughts?.map(c => c.category) || [];
            const { category, title, transcription } = await categorizeAudioNote({
                audio: audioDataUri,
                existingCategories,
            });
    
            const newThought: Thought = {
                id: crypto.randomUUID(),
                type: 'audio',
                content: audioDataUri,
                title: title,
                transcription: transcription,
            };
    
            let newCategorizedThoughts = [...(categorizedThoughts || [])];
            let categoryIndex = newCategorizedThoughts.findIndex(g => g.category.toLowerCase() === category.toLowerCase());
    
            if (categoryIndex === -1) {
                newCategorizedThoughts.push({ category: category, thoughts: [newThought] });
            } else {
                newCategorizedThoughts[categoryIndex].thoughts.push(newThought);
            }
    
            updateLocalStorage(newCategorizedThoughts);
        } catch (error) {
            console.error(error);
            toast({
                title: "Audio Analysis Error",
                description: "Failed to categorize the audio note. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const togglePlayPause = (thought: Thought) => {
        if (playingAudioId === thought.id && audioRef.current) {
            audioRef.current.pause();
            setPlayingAudioId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const newAudio = new Audio(thought.content);
            audioRef.current = newAudio;
            newAudio.play();
            setPlayingAudioId(thought.id);
            newAudio.onended = () => {
                setPlayingAudioId(null);
            };
        }
    };
  

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
                onFocus={e => e.target.select()}
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
    const isAudio = thought.type === 'audio';
    const [text, setText] = useState(isAudio ? thought.title || '' : thought.content);
    
    const handleSave = () => {
        if (text.trim()) {
            onSave(categoryIndex, thoughtIndex, text);
        }
    };
    
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(text.length, text.length);
        }
    }, []);

    const Component = isAudio ? Input : Textarea;
    const props = isAudio ? { ref: inputRef as React.Ref<HTMLInputElement> } : { ref: inputRef as React.Ref<HTMLTextAreaElement>, rows: 2 };

    return (
        <div className="flex-grow flex items-center gap-2">
            <Component
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-grow"
                onBlur={handleSave}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && (isAudio || e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSave();
                    }
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        onCancel();
                    }
                }}
                {...props}
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
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
          </div>
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
              <Button onClick={handleAnalyze} disabled={isLoading || isRecording} className="flex-1 text-lg py-6">
                {isLoading ? (
                  <>
                    <LoaderCircle className="animate-spin mr-2" />
                    {loadingText}
                  </>
                ) : 'Untangle Thoughts'}
              </Button>
              <Button onClick={isRecording ? stopRecording : startRecording} disabled={isLoading} className="text-lg py-6" variant={isRecording ? 'destructive' : 'outline'}>
                {isRecording ? (
                    <>
                        <Square className="mr-2" /> Stop
                    </>
                ) : (
                    <>
                        <Mic className="mr-2" /> Record
                    </>
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {isLoading && !categorizedThoughts && (
            <div className="flex flex-col justify-center items-center py-20">
                <LoaderCircle className="w-16 h-16 animate-spin text-primary" />
                <p className="mt-4 text-lg text-muted-foreground">{loadingText}</p>
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
                {categorizedThoughts && categorizedThoughts.length > 0 && (
                    <div className="[column-count:1] md:[column-count:2] lg:[column-count:3] gap-6 space-y-6">
                    {categorizedThoughts.map((card, categoryIndex) => (
                        <CategoryDropZone key={`${card.category}-${categoryIndex}`} categoryIndex={categoryIndex}>
                            <ThoughtCategoryCard
                                card={card}
                                categoryIndex={categoryIndex}
                                editingCategory={editingCategory}
                                editingThought={editingThought}
                                playingAudioId={playingAudioId}
                                chatGPTLoadingThought={chatGPTLoadingThought}
                                handleSaveCategory={handleSaveCategory}
                                setEditingCategory={setEditingCategory}
                                handleAddThought={handleAddThought}
                                handleEditCategory={handleEditCategory}
                                handleDeleteCategory={handleDeleteCategory}
                                handleSaveThought={handleSaveThought}
                                setEditingThought={setEditingThought}
                                togglePlayPause={togglePlayPause}
                                handleSendThoughtToChatGPT={handleSendThoughtToChatGPT}
                                handleEditThought={handleEditThought}
                                handleDeleteThought={handleDeleteThought}
                            />
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
