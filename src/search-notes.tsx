import { useState, useMemo } from "react";
import { ActionPanel, List, Action, Icon } from "@vicinae/api";

import { useNotes, searchNotes, openNoteInVSCode } from "./utils";

export default function SearchNotesCommand() {
  const { data: notes, isLoading } = useNotes();

  const [searchText, setSearchText] = useState<string>("");

  const searchResults = useMemo(() => searchNotes(notes ?? [], searchText), [notes, searchText]);

  return (
    <List
      filtering={false}
      isShowingDetail={true}
      isLoading={isLoading}
      searchBarPlaceholder="Search for notes..."
      onSearchTextChange={setSearchText}
    >
      {searchResults.map((note) => (
        <List.Item
          key={note.key}
          title={note.title}
          accessories={[{ icon: Icon.Folder, tag: note.directory || "root" }]}
          detail={<List.Item.Detail markdown={note.markdown} />}
          actions={
            <ActionPanel>
              <Action title="Open Note" onAction={() => openNoteInVSCode(note.path)} icon={Icon.Code} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
