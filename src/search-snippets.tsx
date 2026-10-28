import { useMemo, useState } from "react";
import { ActionPanel, List, Action, Icon, getPreferenceValues } from "@vicinae/api";

import { searchSnippets, useSnippets, openNote } from "./utils";

export default function SearchSnippetsCommand() {
  const { querySearchUrl, splunkSearchUrl, chronosphereUrl } = getPreferenceValues<ExtensionPreferences>();

  const { data: snippets, isLoading } = useSnippets();

  const [searchText, setSearchText] = useState<string>("");

  const searchResults = useMemo(() => searchSnippets(snippets ?? [], searchText), [snippets, searchText]);

  function getSplunkUrl(query: string) {
    return `${splunkSearchUrl}${query}`;
  }

  function getQueryUrl(query: string) {
    return `${querySearchUrl}${encodeURIComponent(query)}`;
  }

  function getChronosphereUrl(query: string) {
    const queries = [
      {
        kind: "DataQuery",
        spec: { plugin: { kind: "PrometheusTimeSeriesQuery", spec: { query } }, id: "0" },
      },
    ];
    const params = [
      "start=now-1h",
      "end=now",
      `formulas=${encodeURIComponent("[]")}`,
      `queries=${encodeURIComponent(JSON.stringify(queries))}`,
    ];
    return `${chronosphereUrl}/metrics/explorer-v2?${params.join("&")}`;
  }

  return (
    <List
      filtering={false}
      isShowingDetail={true}
      searchBarPlaceholder="Search for snippets..."
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
    >
      {searchResults.map((snippet) => (
        <List.Item
          key={snippet.key}
          title={snippet.title}
          accessories={[{ icon: Icon.Folder, tag: snippet.directory || "root" }]}
          detail={<List.Item.Detail markdown={snippet.markdown} />}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Snippet" content={snippet.content} />
              {snippet.language === "sql" && (
                <Action.OpenInBrowser title="Open in SQL Console" url={getQueryUrl(snippet.content)} />
              )}
              {snippet.language === "splunk" && (
                <Action.OpenInBrowser title="Open in Splunk" url={getSplunkUrl(snippet.content)} />
              )}
              {snippet.language === "promql" && (
                <Action.OpenInBrowser title="Open in Chronosphere" url={getChronosphereUrl(snippet.content)} />
              )}
              <Action title="Open Note" onAction={() => openNote(snippet.path)} icon={Icon.Code} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
