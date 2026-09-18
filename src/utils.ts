import { dirname, join, relative } from "path";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { execFile } from "child_process";
import { useEffect, useState } from "react";

import { closeMainWindow, getPreferenceValues, showToast, Toast } from "@vicinae/api";

const CODE_PATH = "/opt/homebrew/bin/code";

export function openNoteInVSCode(notePath: string): void {
  const { notesDirectory } = getPreferenceValues<Preferences>();
  const absolutePath = join(notesDirectory!, `${notePath}.md`);
  execFile(CODE_PATH, [notesDirectory!, "--goto", absolutePath]);
  closeMainWindow();
}

async function createNoteAtPath(notePath: string): Promise<void> {
  try {
    const { notesDirectory } = getPreferenceValues<Preferences>();
    const filePath = join(notesDirectory!, `${notePath}.md`);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, "", { flag: "a" });
    openNoteInVSCode(notePath);
  } catch (err: unknown) {
    await showToast({ style: Toast.Style.Failure, title: "Failed to create note", message: String(err) });
  }
}

export async function createNote(title: string): Promise<void> {
  await createNoteAtPath(makeSafeNoteName(title));
}

export async function createMeetingNote(title: string): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const safeName = makeSafeNoteName(title);
  await createNoteAtPath(`meetings/${date} - ${safeName}`);
}

export async function openDailyNote(): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const year = date.slice(0, 4);
  await createNoteAtPath(`daily/${year}/${date}`);
}

export type Note = {
  key: string;
  path: string;
  directory: string;
  content: string;
  title: string;
  markdown: string;
};

export type Snippet = Note & {
  language: string;
};

export function makeSafeNoteName(title: string): string {
  return title.trim().replace(/[\\/:*?"<>|]/g, "-");
}

export async function getAllNotes(rootPath: string = ""): Promise<Note[]> {
  const { notesDirectory } = getPreferenceValues<Preferences>();

  const result: Note[] = [];

  async function walk(currentPath: string) {
    const entries = await readdir(currentPath, { withFileTypes: true });

    await Promise.all(
      entries.map(async (entry) => {
        const entryPath = join(currentPath, entry.name);

        if (entry.isDirectory()) {
          if (!entry.name.startsWith(".")) await walk(entryPath);
        } else if (entry.name.endsWith(".md")) {
          try {
            const content = await readFile(entryPath, "utf-8");
            const title = entry.name.replace(/\.md$/, "").trim();
            const notePath = relative(notesDirectory!, entryPath).replace(/\.md$/, "");
            result.push({
              key: notePath,
              path: notePath,
              directory: dirname(entryPath) === notesDirectory ? "" : dirname(entryPath).split(/[\\/]/).pop() || "",
              title,
              content,
              markdown: `# ${title}\n\n${content}`,
            });
          } catch (err) {
            console.error(`Error reading ${entryPath}:`, err);
          }
        }
      }),
    );
  }

  await walk(join(notesDirectory!, rootPath));

  return result;
}

async function getSnippets(): Promise<Snippet[]> {
  const notes = await getAllNotes("snippets");
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;

  return notes
    .flatMap((note) =>
      [...note.content.matchAll(codeBlockRegex)].map((match) => {
        const language = match[1].trim() || "text";
        const content = match[2].trim();
        return { note, language, content };
      }),
    )
    .map(({ note, language, content }, i) => ({
      key: `${note.path}:${language}:${i}`,
      path: note.path,
      directory: note.directory,
      title: note.title,
      content,
      markdown: `# ${note.title}\n\n\`\`\`${language}\n${content}\n\`\`\``,
      language,
    }));
}

function searchItemsByTitleAndContent<T extends { title: string; content: string }>(items: T[], query: string): T[] {
  if (!query.trim()) return items;

  const lowerQuery = query.toLowerCase();
  const queryWords = lowerQuery.split(/\s+/).filter(Boolean);

  return items
    .map((item) => {
      const title = item.title.toLowerCase();
      const content = item.content.toLowerCase();

      let rank = 0;
      if (title === lowerQuery) rank = 10;
      else if (title.includes(lowerQuery)) rank = 9;
      else if (content.includes(lowerQuery)) rank = 8;
      else if (queryWords.every((w) => title.includes(w))) rank = 7;
      else if (queryWords.every((w) => content.includes(w))) rank = 6;

      return { item, rank };
    })
    .filter(({ rank }) => rank > 0)
    .sort((a, b) => b.rank - a.rank)
    .map(({ item }) => item);
}

type AsyncState<T> = { data: T | undefined; isLoading: boolean };

function useAsyncData<T>(fetcher: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, isLoading: true });

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, isLoading: false });
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setState({ data: undefined, isLoading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function useNotes() {
  return useAsyncData(getAllNotes);
}

export function useSnippets() {
  return useAsyncData(getSnippets);
}

export function searchNotes(notes: Note[], query: string): Note[] {
  return searchItemsByTitleAndContent(notes, query);
}

export function searchSnippets(snippets: Snippet[], query: string): Snippet[] {
  return searchItemsByTitleAndContent(snippets, query);
}
