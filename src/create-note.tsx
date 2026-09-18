import { LaunchProps } from "@vicinae/api";

import { createNote } from "./utils";

export default async function CreateNoteCommand(props: LaunchProps<{ arguments: Arguments.CreateNote }>) {
  await createNote(props.arguments.title!);
}
