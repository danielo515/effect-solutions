"use client";

import { cn } from "@/lib/cn";

interface ContextEntry {
  key: string;
  service: string;
  description?: string;
}

interface ContextMapTableProps {
  entries: ContextEntry[];
  title?: string;
  className?: string;
}

export function ContextMapTable({
  entries,
  title = "Context",
  className,
}: ContextMapTableProps) {
  // Parse the title to add syntax highlighting to Context<...>
  const renderTitle = () => {
    const match = title.match(/^Context<(.+)>$/);
    if (match) {
      const types = match[1].split(" | ");
      return (
        <div className="text-sm font-medium font-mono">
          <span className="text-neutral-300">Context</span>
          <span className="text-neutral-500">&lt;</span>
          {types.map((type, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static array
            <span key={i}>
              <span className="text-blue-400">{type}</span>
              {i < types.length - 1 && (
                <span className="text-neutral-600"> | </span>
              )}
            </span>
          ))}
          <span className="text-neutral-500">&gt;</span>
        </div>
      );
    }
    return <div className="text-sm font-medium text-neutral-300">{title}</div>;
  };

  return (
    <div
      className={cn(
        "not-prose my-8 overflow-hidden border border-neutral-800 bg-neutral-950",
        className,
      )}
    >
      <div className="border-b border-neutral-800 bg-neutral-900 px-4 py-3">
        <div className="flex items-center justify-between">
          {renderTitle()}
          <div className="text-xs text-neutral-600 font-mono">
            {entries.length} {entries.length === 1 ? "service" : "services"}
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="p-8 text-center">
          <div className="text-sm text-neutral-600">Empty context</div>
          <div className="mt-1 text-xs text-neutral-700 font-mono">
            Context.empty()
          </div>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/50">
              <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Key
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                Service
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {entries.map((entry) => (
              <tr key={entry.key} className="hover:bg-neutral-900/50">
                <td className="px-4 py-3">
                  <div className="inline-flex items-center bg-blue-500/10 px-2 py-1 text-xs font-mono text-blue-400 rounded">
                    {entry.key}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs font-mono text-neutral-400">
                    "{entry.key}"
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="inline-flex items-center bg-green-500/10 px-2 py-1 text-xs font-mono text-green-400 rounded">
                    {entry.service}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
