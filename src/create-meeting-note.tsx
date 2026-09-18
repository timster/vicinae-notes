import { LaunchProps } from "@vicinae/api";

import { createMeetingNote } from "./utils";

export default async function CreateMeetingNoteCommand(props: LaunchProps<{ arguments: Arguments.CreateMeetingNote }>) {
  await createMeetingNote(props.arguments.title!);
}
