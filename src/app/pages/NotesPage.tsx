import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ActionSuccessState, DataErrorState } from "../components/DataState";
import { EmptyState } from "../components/EmptyState";
import { GlassCard } from "../components/GlassCard";
import { useAsyncFormSubmission } from "../hooks/useAsyncFormSubmission";
import { useAsyncViewState } from "../hooks/useAsyncViewState";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { saveNoteForm, type NoteSubmissionResult } from "../services/form-flows.service";
import { getNotesLibrary } from "../services/notes.service";
import { Search, Plus, Star, Calendar } from "lucide-react";
import {
  normalizeRequiredTextInput,
  normalizeTagListInput,
  optionalTrimmedTextRules,
  trimmedTextRules,
} from "../utils/form-validation";

type NotesFilter = "all" | "starred" | "recent";

type NoteFormValues = {
  title: string;
  course: string;
  content: string;
  tags: string;
  starred: boolean;
};

export function NotesPage() {
  const [searchParams] = useSearchParams();
  const { errorMessage, isLoading, isError, run: runLoadNotes } = useAsyncViewState({
    defaultErrorMessage: "Your notes could not be loaded. Retry to restore your study library.",
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<NotesFilter>("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteSubmissionResult[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const { isSubmitting, submitError, submitSuccess, clearStatus, run } = useAsyncFormSubmission();
  const querySearch = searchParams.get("search") ?? "";
  const queryNoteIdRaw = searchParams.get("noteId");
  const queryNoteId = queryNoteIdRaw ? Number.parseInt(queryNoteIdRaw, 10) : null;
  const form = useForm<NoteFormValues>({
    defaultValues: {
      title: "",
      course: "",
      content: "",
      tags: "",
      starred: false,
    },
    mode: "onBlur",
  });

  const loadNotes = useCallback(() => {
    void runLoadNotes(async () => {
      const library = await getNotesLibrary({
        search: searchQuery.trim() || undefined,
        tag: activeTag ?? undefined,
        starred: activeFilter === "starred" ? true : undefined,
        page: 1,
        pageSize: 100,
      });
      setNotes(library);
      return library;
    });
  }, [activeFilter, activeTag, runLoadNotes, searchQuery]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (querySearch.trim().length === 0) {
      return;
    }

    setSearchQuery(querySearch);
  }, [querySearch]);

  const allTags = useMemo(() => {
    return Array.from(new Set(notes.flatMap((note) => note.tags))).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return notes.filter((note) => {
      const matchesQuery =
        query.length === 0 ||
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.course.toLowerCase().includes(query) ||
        note.tags.some((tag) => tag.toLowerCase().includes(query));

      const matchesFilter =
        activeFilter === "all" ||
        (activeFilter === "starred" && note.starred) ||
        (activeFilter === "recent" && [notes[0]?.id, notes[1]?.id].includes(note.id));

      const matchesTag = activeTag === null || note.tags.includes(activeTag);

      return matchesQuery && matchesFilter && matchesTag;
    });
  }, [activeFilter, activeTag, notes, searchQuery]);

  const openEditor = (note?: NoteSubmissionResult) => {
    clearStatus();
    setEditingNoteId(note?.id ?? null);
    form.reset({
      title: note?.title ?? "",
      course: note?.course ?? "",
      content: note?.content ?? "",
      tags: note?.tags.join(", ") ?? "",
      starred: note?.starred ?? false,
    });
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingNoteId(null);
    clearStatus();
    form.reset();
  };

  const handleSaveNote = form.handleSubmit(async (values) => {
    const noteTags = normalizeTagListInput(values.tags);

    const savedNote = await run(
      async () =>
        saveNoteForm(
          {
            title: normalizeRequiredTextInput(values.title),
            course: normalizeRequiredTextInput(values.course),
            content: normalizeRequiredTextInput(values.content),
            tags: noteTags,
            starred: values.starred,
          },
          editingNoteId ?? undefined,
        ),
      {
        successMessage: editingNoteId ? "Note updated successfully." : "Note saved successfully.",
        onSuccess: async (result) => {
          setNotes((previousNotes) => {
            const remainingNotes = previousNotes.filter((note) => note.id !== result.id);
            return [result, ...remainingNotes];
          });
          setSuccessMessage(editingNoteId ? `Updated ${result.title}.` : `Saved ${result.title}.`);
          window.setTimeout(() => {
            setSuccessMessage(null);
          }, 2200);
          closeEditor();
        },
      },
    );

    if (!savedNote) {
      form.setError("content", { message: "Review the note details and try again." });
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold mb-2 text-gray-900">My Notes</h1>
        <p className="text-lg text-gray-700">Organize and review your study notes</p>
      </div>

      {successMessage ? <ActionSuccessState message={successMessage} className="mb-6" /> : null}

      {isError ? (
        <div className="mb-8">
          <DataErrorState
            description={errorMessage ?? "Your notes could not be loaded. Retry to restore your study library."}
            onRetry={() => {
              loadNotes();
            }}
            retryLabel="Reload Notes"
          />
        </div>
      ) : null}

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingNoteId ? "Edit note" : "Create note"}</DialogTitle>
            <DialogDescription>
              Save structured notes with enough detail to be searchable and useful when you revisit them later.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form className="space-y-4" onSubmit={handleSaveNote} noValidate>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  rules={{
                    ...trimmedTextRules({
                      requiredMessage: "Add a note title.",
                      minLength: 4,
                      minLengthMessage: "Use a more descriptive title.",
                      maxLength: 120,
                      maxLengthMessage: "Keep title under 120 characters.",
                    }),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Example: Enzyme inhibition comparison"
                          disabled={isSubmitting}
                          {...field}
                          onChange={(event) => {
                            clearStatus();
                            field.onChange(event);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="course"
                  rules={{
                    ...trimmedTextRules({
                      requiredMessage: "Add the related course.",
                      minLength: 2,
                      minLengthMessage: "Add the related course.",
                      maxLength: 120,
                      maxLengthMessage: "Keep course under 120 characters.",
                    }),
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Course</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Advanced Biology"
                          disabled={isSubmitting}
                          {...field}
                          onChange={(event) => {
                            clearStatus();
                            field.onChange(event);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="content"
                rules={{
                  ...trimmedTextRules({
                    requiredMessage: "Add note content.",
                    minLength: 20,
                    minLengthMessage: "Add a bit more detail so this note is useful to revisit later.",
                    maxLength: 4000,
                    maxLengthMessage: "Keep note content under 4000 characters.",
                  }),
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write the key idea, examples, and the part you want to remember for revision."
                        className="min-h-36 bg-white"
                        disabled={isSubmitting}
                        {...field}
                        onChange={(event) => {
                          clearStatus();
                          field.onChange(event);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Biology, Midterm, DNA"
                          disabled={isSubmitting}
                          {...field}
                          onChange={(event) => {
                            clearStatus();
                            field.onChange(event);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                  rules={{
                    ...optionalTrimmedTextRules({
                      maxLength: 300,
                      maxLengthMessage: "Keep tags under 300 characters.",
                    }),
                  }}
                />

                <FormField
                  control={form.control}
                  name="starred"
                  render={({ field }) => (
                    <label className="flex items-center gap-3 rounded-lg border border-white/60 bg-white/[0.45] px-4 py-3 text-sm font-medium text-gray-700">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(event) => {
                          clearStatus();
                          field.onChange(event.target.checked);
                        }}
                        disabled={isSubmitting}
                      />
                      Star this note
                    </label>
                  )}
                />
              </div>

              {submitError ? <DataErrorState title="Could not save note" description={submitError} /> : null}
              {submitSuccess ? <ActionSuccessState message={submitSuccess} /> : null}

              <DialogFooter>
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={closeEditor}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingNoteId ? "Update Note" : "Save Note"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <GlassCard className="mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              placeholder="Search notes..."
              className="pl-10 bg-white/[0.45]"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
              }}
            />
          </div>
          <Button
            className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white"
            onClick={() => {
              openEditor();
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Note
          </Button>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-6">
          <GlassCard>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Quick Filters</h3>
            <div className="space-y-2">
              <button
                className={`w-full text-left px-3 py-2 rounded-lg ${activeFilter === "all" ? "bg-[#4a9ff5] text-white" : "hover:bg-white/[0.55] text-gray-700"}`}
                onClick={() => {
                  setActiveFilter("all");
                }}
              >
                All Notes
              </button>
              <button
                className={`w-full text-left px-3 py-2 rounded-lg ${activeFilter === "starred" ? "bg-[#4a9ff5] text-white" : "hover:bg-white/[0.55] text-gray-700"}`}
                onClick={() => {
                  setActiveFilter("starred");
                }}
              >
                <Star className="w-4 h-4 inline mr-2" />
                Starred
              </button>
              <button
                className={`w-full text-left px-3 py-2 rounded-lg ${activeFilter === "recent" ? "bg-[#4a9ff5] text-white" : "hover:bg-white/[0.55] text-gray-700"}`}
                onClick={() => {
                  setActiveFilter("recent");
                }}
              >
                <Calendar className="w-4 h-4 inline mr-2" />
                Recent
              </button>
            </div>
          </GlassCard>

          <GlassCard>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${activeTag === tag ? "bg-[#4a9ff5] text-white" : "bg-white/[0.45] text-gray-700 hover:bg-[#4a9ff5] hover:text-white"}`}
                  onClick={() => {
                    setActiveTag((currentTag) => (currentTag === tag ? null : tag));
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={`note-loading-${index}`} className="rounded-2xl border border-white/70 bg-white/[0.45] p-6">
                  <div className="mb-3 h-5 w-2/3 rounded bg-white/80" />
                  <div className="mb-2 h-4 w-full rounded bg-white/70" />
                  <div className="mb-4 h-4 w-4/5 rounded bg-white/70" />
                  <div className="h-3 w-1/2 rounded bg-white/60" />
                </div>
              ))}
            </div>
          ) : isError ? null : filteredNotes.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No notes match this view"
              description="Try a different filter or create a new note to build your study library."
              action={<Button className="bg-[#4a9ff5] hover:bg-[#2e8ef7] text-white" onClick={() => { openEditor(); }}>Create Note</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredNotes.map((note) => (
                <GlassCard
                  key={note.id}
                  hover
                  className={`cursor-pointer flex flex-col ${queryNoteId === note.id ? "ring-2 ring-[#4a9ff5]/45" : ""}`}
                >
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <button
                      type="button"
                      className="text-left"
                      onClick={() => {
                        openEditor(note);
                      }}
                    >
                      <h3 className="text-xl font-semibold text-gray-900">{note.title}</h3>
                    </button>
                    <button
                      type="button"
                      className={note.starred ? "text-yellow-500" : "text-gray-400"}
                      onClick={() => {
                        setNotes((previousNotes) => previousNotes.map((item) => (
                          item.id === note.id ? { ...item, starred: !item.starred } : item
                        )));
                        setSuccessMessage(note.starred ? `Removed ${note.title} from starred.` : `Starred ${note.title}.`);
                        window.setTimeout(() => {
                          setSuccessMessage(null);
                        }, 2000);
                      }}
                    >
                      <Star className={`w-5 h-5 ${note.starred ? "fill-yellow-500" : ""}`} />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="text-left flex-1"
                    onClick={() => {
                      openEditor(note);
                    }}
                  >
                    <p className="text-gray-700 mb-4 line-clamp-3">{note.content}</p>
                  </button>

                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {note.tags.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full bg-[#4a9ff5]/10 text-[#4a9ff5] text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{note.course}</span>
                      <span>{note.date}</span>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
